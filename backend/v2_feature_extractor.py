"""
CSEC Sentinel - Defensive Feature Extractor Module (v2)
Integrates multi-modal telemetry: Lexical, Entropy, Brand Similarity,
WHOIS Intelligence, SSL/TLS Handshake Inspection, and HTTP Redirection Tracing.

Protected by:
  - SSRF Validation (Private IP / Metadata endpoint filtering)
  - Concurrent ThreadPool execution (hard timeout <= 2.5s)
  - In-memory 1-hour TTL Domain Telemetry Cache
  - Graceful fail-safe fallback to -1 for offline/unreachable hosts
"""

import os
import re
import ssl
import time
import math
import socket
import ipaddress
from datetime import datetime, timezone
from urllib.parse import urlparse
from difflib import SequenceMatcher
import concurrent.futures

import pandas as pd
import requests
import whois
import tldextract

# Global high-performance TLD extractor instance with snapshot fallback (no web blocking)
_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.tld_cache')
os.makedirs(_CACHE_DIR, exist_ok=True)
_TLD_EXTRACTOR = tldextract.TLDExtract(cache_dir=_CACHE_DIR, fallback_to_snapshot=True)

# -------------------------------------------------------------
# 1. CONSTANTS & DICTIONARIES
# -------------------------------------------------------------
POPULAR_BRANDS = [
    'google', 'microsoft', 'apple', 'amazon', 'paypal', 
    'facebook', 'netflix', 'instagram', 'whatsapp', 'yahoo', 
    'chase', 'wellsfargo', 'bankofamerica', 'gcash', 'maya',
    'bdo', 'bpi', 'landbank', 'unionbank'
]

SUSPICIOUS_TLDS = {
    'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'xyz', 'work', 
    'buzz', 'icu', 'fit', 'club', 'surf', 'live', 'cam'
}

SUSPICIOUS_KEYWORDS = [
    'login', 'signin', 'verify', 'verification', 'update', 
    'secure', 'account', 'banking', 'confirm', 'password', 
    'wallet', 'authenticate', 'service', 'support', 'claim',
    'subsidy', 'bonus', 'payout'
]

TRUSTED_ISSUERS = [
    "DigiCert", "Let's Encrypt", "GlobalSign", "Sectigo", 
    "Google Trust Services", "Amazon", "GoDaddy", "Cloudflare",
    "Entrust", "IdenTrust", "Microsoft"
]

# In-memory Domain Telemetry Cache: {domain: (timestamp, whois_tuple, ssl_tuple)}
_DOMAIN_CACHE = {}
_CACHE_TTL_SECONDS = 3600  # 1 Hour

# Global persistent Daemon ThreadPool for concurrent active probes (reused across requests)
class DaemonThreadPoolExecutor(concurrent.futures.ThreadPoolExecutor):
    def _adjust_thread_count(self):
        super()._adjust_thread_count()
        for t in self._threads:
            t.daemon = True

_EXECUTOR = DaemonThreadPoolExecutor(max_workers=8)

# -------------------------------------------------------------
# 2. SSRF & DNS VALIDATION GUARD
# -------------------------------------------------------------
def check_url_safety_and_dns(url: str, timeout: float = 1.0) -> tuple[bool, bool, str]:
    """
    Validates that a URL does NOT target local, private, or cloud metadata endpoints.
    Resolves DNS with a strict 1.0-second timeout.
    Returns: (is_resolvable, is_safe_to_probe, message)
    """
    try:
        parsed = urlparse(url if url.startswith(('http://', 'https://')) else 'http://' + url)
        hostname = (parsed.netloc or "").split(':')[0].strip().lower()

        if not hostname:
            return False, False, "Empty or invalid hostname"

        # Block localhost / link-local keywords
        if hostname in ['localhost', 'loopback', 'metadata.google.internal']:
            return True, False, f"Prohibited hostname: {hostname}"

        # Resolve hostname with timeout in background daemon thread
        f = _EXECUTOR.submit(socket.getaddrinfo, hostname, None)
        try:
            addr_info = f.result(timeout=timeout)
        except Exception:
            return False, False, "Domain does not resolve in DNS or timed out"

        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)

            # Reject private, loopback, link-local, multicast, or reserved IPs
            if (ip.is_private or ip.is_loopback or ip.is_link_local 
                or ip.is_multicast or ip.is_reserved or ip_str.startswith('169.254.')):
                return True, False, f"Target resolves to non-public/private IP: {ip_str}"

        return True, True, "Safe"
    except Exception as e:
        return False, False, f"Validation failed: {e}"

def is_safe_target_url(url: str) -> tuple[bool, str]:
    is_res, is_safe, msg = check_url_safety_and_dns(url)
    return is_safe, msg


# -------------------------------------------------------------
# 3. LEXICAL, ENTROPY & BRAND SIMILARITY
# -------------------------------------------------------------
def calculate_shannon_entropy(text: str) -> float:
    if not text:
        return 0.0
    prob_dict = {c: text.count(c) / len(text) for c in set(text)}
    return -sum(p * math.log2(p) for p in prob_dict.values())

def get_levenshtein_and_similarity(domain_name: str) -> tuple[float, float]:
    clean_domain = domain_name.lower().split('.')[0]
    best_dist = 999.0
    best_ratio = 0.0
    for brand in POPULAR_BRANDS:
        ratio = SequenceMatcher(None, clean_domain, brand).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
        dist = abs(len(clean_domain) - len(brand)) + sum(1 for a, b in zip(clean_domain, brand) if a != b)
        if dist < best_dist:
            best_dist = float(dist)
    return best_dist, float(best_ratio)

# -------------------------------------------------------------
# 4. WHOIS DOMAIN TELEMETRY (CAPPED TIMEOUT)
# -------------------------------------------------------------
def extract_whois_features(domain: str, timeout: float = 1.5) -> tuple[float, float, float, float]:
    """Returns (domain_age_days, domain_expiry_days, whois_privacy, domain_registered_recently)"""
    orig_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(timeout)
        w = whois.whois(domain)
        creation = w.creation_date
        expiration = w.expiration_date

        if isinstance(creation, list):
            creation = creation[0]
        if isinstance(expiration, list):
            expiration = expiration[0]

        now = datetime.now()
        age_days = float((now - creation).days) if creation and isinstance(creation, datetime) else -1.0
        expiry_days = float((expiration - now).days) if expiration and isinstance(expiration, datetime) else -1.0

        raw_text = str(w).lower()
        whois_priv = 1.0 if any(k in raw_text for k in ['privacy', 'redact', 'whoisguard', 'proxy', 'withheld', 'contact privacy']) else 0.0
        reg_recently = 1.0 if (0.0 <= age_days < 90.0) else 0.0

        return age_days, expiry_days, whois_priv, reg_recently
    except Exception:
        return -1.0, -1.0, -1.0, -1.0
    finally:
        socket.setdefaulttimeout(orig_timeout)


# -------------------------------------------------------------
# 5. SSL / TLS CERTIFICATE AUDIT (SOCKET HANDSHAKE)
# -------------------------------------------------------------
def extract_ssl_features(hostname: str, timeout: float = 1.5) -> tuple[float, float, float, float, float]:
    """Returns (ssl_valid, ssl_expired, ssl_self_signed, certificate_age_days, certificate_issuer_trusted)"""
    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((hostname, 443), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()

                not_before = datetime.strptime(cert['notBefore'], '%b %d %H:%M:%S %Y %Z')
                not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                now = datetime.now(timezone.utc).replace(tzinfo=None)

                age_days = float((now - not_before).days)
                is_expired = 1.0 if now > not_after else 0.0

                issuer_str = str(cert.get('issuer', ''))
                issuer_trusted = 1.0 if any(t.lower() in issuer_str.lower() for t in TRUSTED_ISSUERS) else 0.0

                subject_str = str(cert.get('subject', ''))
                self_signed = 1.0 if issuer_str == subject_str else 0.0

                return 1.0, is_expired, self_signed, age_days, issuer_trusted
    except ssl.SSLCertVerificationError:
        # Invalid / self-signed certificate rejected by standard verification
        return 0.0, 0.0, 1.0, -1.0, 0.0
    except Exception:
        # Connection timeout, port 443 closed, or plain HTTP
        return -1.0, -1.0, -1.0, -1.0, -1.0

# -------------------------------------------------------------
# 6. HTTP REDIRECTION CHAIN TRACER
# -------------------------------------------------------------
def extract_network_redirect_features(url: str, timeout: float = 2.0) -> tuple[float, float, float, float, float, float]:
    """Returns (redirect_count, cross_domain_redirects, unique_domains_in_chain, same_registered_domain, final_https, redirect_to_ip)"""
    try:
        session = requests.Session()
        session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
        
        resp = session.get(url, timeout=timeout, allow_redirects=True, stream=True)
        history = resp.history
        redirect_count = float(len(history))

        domains_chain = [urlparse(h.url).netloc.split(':')[0] for h in history] + [urlparse(resp.url).netloc.split(':')[0]]
        unique_domains = float(len(set(domains_chain)))
        cross_domain = float(sum(1 for i in range(len(domains_chain) - 1) if domains_chain[i] != domains_chain[i+1]))

        final_host = urlparse(resp.url).netloc.split(':')[0]
        final_ext = _TLD_EXTRACTOR(resp.url)
        orig_ext = _TLD_EXTRACTOR(url)
        same_reg = 1.0 if final_ext.top_domain_under_public_suffix == orig_ext.top_domain_under_public_suffix else 0.0

        final_https = 1.0 if resp.url.lower().startswith('https://') else 0.0
        redirect_to_ip = 1.0 if re.match(r'^\d{1,3}(\.\d{1,3}){3}$', final_host) else 0.0
        resp.close()

        return redirect_count, cross_domain, unique_domains, same_reg, final_https, redirect_to_ip
    except Exception:
        # Network timeout, DNS failure, or connection dropped
        is_https_initial = 1.0 if url.lower().startswith('https://') else 0.0
        return 0.0, 0.0, 1.0, 1.0, is_https_initial, 0.0

# -------------------------------------------------------------
# 7. MASTER CONCURRENT FEATURE EXTRACTOR
# -------------------------------------------------------------
def extract_v2_features(raw_url: str, expected_features: list, tranco_domains: set = None) -> pd.DataFrame:
    """
    Extracts the full 38-feature vector for CSEC_AIv2.
    Executes WHOIS, SSL, and Redirection tracing concurrently via ThreadPoolExecutor
    with an overall ceiling timeout of 2.5 seconds.
    """
    url = raw_url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url

    parsed = urlparse(url)
    hostname = (parsed.netloc or "").split(':')[0].strip().lower()
    path = parsed.path
    query = parsed.query
    ext = _TLD_EXTRACTOR(url)
    reg_domain = ext.top_domain_under_public_suffix or hostname


    # 1. Lexical features (Synchronous, ~1ms)
    url_len = float(len(url))
    host_len = float(len(hostname))
    path_len = float(len(path))
    query_len = float(len(query))
    num_digits = float(sum(c.isdigit() for c in url))

    features = {
        'url_length': url_len,
        'hostname_length': host_len,
        'path_length': path_len,
        'query_length': query_len,
        'num_dots': float(url.count('.')),
        'num_hyphens': float(url.count('-')),
        'num_underscores': float(url.count('_')),
        'num_slashes': float(url.count('/')),
        'num_questionmarks': float(url.count('?')),
        'num_equals': float(url.count('=')),
        'num_at': float(url.count('@')),
        'num_digits': num_digits,
        'num_subdomains': float(len(ext.subdomain.split('.')) if ext.subdomain else 0),
        'digit_ratio': (num_digits / url_len) if url_len > 0 else 0.0,
        'special_char_ratio': (sum(not c.isalnum() for c in url) / url_len) if url_len > 0 else 0.0,
        'url_entropy': calculate_shannon_entropy(url),
        'has_ip_address': 1.0 if re.match(r'^\d{1,3}(\.\d{1,3}){3}$', hostname) else 0.0,
        'has_https': 1.0 if url.startswith('https://') else 0.0,
        'suspicious_keyword_count': float(sum(1 for kw in SUSPICIOUS_KEYWORDS if kw in url.lower())),
        'suspicious_tld': 1.0 if ext.suffix.lower() in SUSPICIOUS_TLDS else 0.0,
    }

    # 2. Similarity features (Synchronous, ~1ms)
    lev_dist, sim_score = get_levenshtein_and_similarity(ext.domain)
    features['levenshtein_distance'] = lev_dist
    features['brand_similarity'] = sim_score

    # Check DNS and SSRF safety before launching active network threads
    is_resolvable, safe_to_probe, ssrf_msg = check_url_safety_and_dns(url)
    if not is_resolvable or not safe_to_probe:
        # Host doesn't exist or is an internal SSRF target - default all external telemetry safely
        features.update({
            'domain_age_days': -1.0, 'domain_expiry_days': -1.0,
            'whois_privacy': 1.0 if not safe_to_probe else 0.0,
            'domain_registered_recently': 0.0,
            'ssl_valid': 0.0, 'ssl_expired': 0.0, 'ssl_self_signed': 0.0,
            'certificate_age_days': -1.0, 'certificate_issuer_trusted': 0.0,
            'redirect_count': 0.0, 'cross_domain_redirects': 0.0,
            'unique_domains_in_chain': 1.0, 'same_registered_domain': 1.0,
            'final_https': 0.0, 'redirect_to_ip': 1.0 if not safe_to_probe else 0.0,
            'tranco_rank': -1.0
        })
        row_values = [features.get(col, 0.0) for col in expected_features]
        return pd.DataFrame([row_values], columns=expected_features)

    # 3. Check in-memory telemetry cache for domain
    cached = _DOMAIN_CACHE.get(reg_domain)
    now_ts = time.time()
    whois_res = None
    ssl_res = None

    if cached and (now_ts - cached[0] < _CACHE_TTL_SECONDS):
        whois_res = cached[1]
        ssl_res = cached[2]

    # 4. Concurrently execute network telemetry via persistent ThreadPool (max 2.0s)
    f_whois = _EXECUTOR.submit(extract_whois_features, reg_domain, 1.5) if whois_res is None else None
    f_ssl = _EXECUTOR.submit(extract_ssl_features, hostname, 1.2) if ssl_res is None else None
    f_red = _EXECUTOR.submit(extract_network_redirect_features, url, 1.8)

    # Collect results with fallbacks
    try:
        if f_whois:
            whois_res = f_whois.result(timeout=1.8)
    except Exception:
        whois_res = (-1.0, -1.0, -1.0, -1.0)

    try:
        if f_ssl:
            ssl_res = f_ssl.result(timeout=1.5)
    except Exception:
        ssl_res = (-1.0, -1.0, -1.0, -1.0, -1.0)

    try:
        red_res = f_red.result(timeout=2.0)
    except Exception:
        red_res = (0.0, 0.0, 1.0, 1.0, (1.0 if url.startswith('https') else 0.0), 0.0)


    # Update cache
    _DOMAIN_CACHE[reg_domain] = (now_ts, whois_res, ssl_res)

    # 5. Populate features
    features['domain_age_days'] = whois_res[0]
    features['domain_expiry_days'] = whois_res[1]
    features['whois_privacy'] = whois_res[2]
    features['domain_registered_recently'] = whois_res[3]

    features['ssl_valid'] = ssl_res[0]
    features['ssl_expired'] = ssl_res[1]
    features['ssl_self_signed'] = ssl_res[2]
    features['certificate_age_days'] = ssl_res[3]
    features['certificate_issuer_trusted'] = ssl_res[4]

    features['redirect_count'] = red_res[0]
    features['cross_domain_redirects'] = red_res[1]
    features['unique_domains_in_chain'] = red_res[2]
    features['same_registered_domain'] = red_res[3]
    features['final_https'] = red_res[4]
    features['redirect_to_ip'] = red_res[5]

    # Tranco Rank (Top 1M lookup if provided, else -1)
    if tranco_domains and (hostname in tranco_domains or reg_domain in tranco_domains):
        features['tranco_rank'] = 1.0
    else:
        features['tranco_rank'] = -1.0

    # Ensure exact 38-feature ordering
    row_values = [features.get(col, 0.0) for col in expected_features]
    return pd.DataFrame([row_values], columns=expected_features)
