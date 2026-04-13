import os
import re
import joblib
import pandas as pd
from urllib.parse import urlparse
from flask import Flask, request, jsonify
import Levenshtein # <-- NEW IMPORT

app = Flask(__name__)

@app.route('/', methods=['GET'])
def home():
    return "C-SEC Flask Server is LIVE and running!"

# ---------------------------------------------------------
# 1. LOAD AI MODEL (GATE 3)
# ---------------------------------------------------------
MODEL_PATH = 'csec_rf_model.pkl'

try:
    rf_model = joblib.load(MODEL_PATH)
    expected_features = list(rf_model.feature_names_in_)
    print("AI Model loaded successfully. Ready to intercept.")
except Exception as e:
    print(f"Error loading model: {e}")
    rf_model = None
    expected_features = []

# ---------------------------------------------------------
# 1.5 LOAD SECURITY LISTS (GATES 1 & 2)
# ---------------------------------------------------------
try:
    blacklist_df = pd.read_csv('online-valid.csv', header=None, names=['url'], low_memory=False)
    blacklist_urls = set(blacklist_df['url'].astype(str).str.lower())
    print(f"Gate 1 Active: Loaded {len(blacklist_urls)} Blacklisted URLs.")
except Exception:
    print("No blacklist.csv found. Gate 1 (Blacklist) is disabled.")
    blacklist_urls = set()

try:
    whitelist_df = pd.read_csv('tranco_JLQJY.csv', header=None, names=['domain'], low_memory=False)
    whitelist_domains = set(whitelist_df['domain'].astype(str).str.lower())
    print(f"Gate 2 Active: Loaded {len(whitelist_domains)} Whitelisted Domains.")
except Exception:
    print("No whitelist.csv found. Gate 2 (Whitelist) is disabled.")
    whitelist_domains = set()


# ---------------------------------------------------------
# 2. FEATURE EXTRACTION (For the AI)
# ---------------------------------------------------------
def get_counts(text, is_missing=False):
    if is_missing:
        return {char: -1 for char in ['dot', 'hyphen', 'underline', 'slash', 'questionmark', 'equal', 'at', 'and', 'exclamation', 'space', 'tilde', 'comma', 'plus', 'asterisk', 'hashtag', 'dollar', 'percent']}
    
    return {
        'dot': text.count('.'), 'hyphen': text.count('-'), 'underline': text.count('_'),
        'slash': text.count('/'), 'questionmark': text.count('?'), 'equal': text.count('='),
        'at': text.count('@'), 'and': text.count('&'), 'exclamation': text.count('!'),
        'space': text.count(' '), 'tilde': text.count('~'), 'comma': text.count(','),
        'plus': text.count('+'), 'asterisk': text.count('*'), 'hashtag': text.count('#'),
        'dollar': text.count('$'), 'percent': text.count('%')
    }

def extract_111_features(url):
    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url
    
    parsed = urlparse(url)
    domain = parsed.netloc
    path = parsed.path
    params = parsed.query
    
    has_directory = '/' in path and len(path) > 1
    has_file = '.' in os.path.basename(path)
    has_params = len(params) > 0
    
    directory = os.path.dirname(path) if has_directory else ""
    file = os.path.basename(path) if has_file else ""
    
    u_counts = get_counts(url)
    d_counts = get_counts(domain)
    dir_counts = get_counts(directory, not has_directory)
    f_counts = get_counts(file, not has_file)
    p_counts = get_counts(params, not has_params)
    
    features = {}
    
    for char in u_counts:
        features[f'qty_{char}_url'] = u_counts[char]
        features[f'qty_{char}_domain'] = d_counts[char]
        features[f'qty_{char}_directory'] = dir_counts[char]
        features[f'qty_{char}_file'] = f_counts[char]
        features[f'qty_{char}_params'] = p_counts[char]
        
    features['length_url'] = len(url)
    features['domain_length'] = len(domain)
    features['directory_length'] = len(directory) if has_directory else -1
    features['file_length'] = len(file) if has_file else -1
    features['params_length'] = len(params) if has_params else -1
    features['qty_params'] = len(params.split('&')) if has_params else -1
    
    features['email_in_url'] = 1 if re.search(r'[\w\.-]+@[\w\.-]+', url) else 0
    features['tls_ssl_certificate'] = 1 if url.startswith('https') else 0
    
    final_row = [features.get(col, -1) for col in expected_features]
    return pd.DataFrame([final_row], columns=expected_features)


# --- TARGETS TO PROTECT FROM TYPOSQUATTING ---
PROTECTED_DOMAINS = [
    # Global Tech & Social
    "paypal.com", "facebook.com", "google.com", "apple.com", "microsoft.com", 
    "netflix.com", "amazon.com", "yahoo.com", "instagram.com", "twitter.com",
    
    # Philippine Banks
    "bdo.com.ph", "bpi.com.ph", "landbank.com", "unionbankph.com",
    
    # Philippine E-Wallets & Digital Banks
    "gcash.com", "maya.ph", "coins.ph", "shopee.ph", 
    "grab.com", "gotyme.com.ph", "seabank.ph"
]

def check_typosquatting(scanned_domain):
    """
    Checks if a domain is trying to visually spoof a popular domain.
    Running Levenshtein against 1 million domains is too slow, so we check
    against a high-priority list of targets.
    """
    for safe_domain in PROTECTED_DOMAINS:
        distance = Levenshtein.distance(scanned_domain, safe_domain)
        # If it's 1 or 2 characters off from a major bank/site, it's highly suspicious!
        if 0 < distance <= 2:
            return True, safe_domain
    return False, None


# ---------------------------------------------------------
# 3. API ENDPOINT
# ---------------------------------------------------------
@app.route('/analyze-link', methods=['POST'])
def analyze_link():
    try:
        data = request.get_json()
        target_url = data.get('url', '').strip().lower()

        if not target_url:
            return jsonify({"error": "No URL provided.", "status": "failed"}), 400

        # Parse domain for list checking
        parsed = urlparse(target_url if target_url.startswith(('http://', 'https://')) else 'http://' + target_url)
        domain = parsed.netloc.replace('www.', '')

        # --- GATE 1: BLACKLIST CHECK ---
        if target_url in blacklist_urls or domain in blacklist_urls:
            return jsonify({
                "scanned_url": target_url,
                "is_phishing": True,
                "verdict": "Phishing",
                "protocol": "Blacklist Protocol",
                "confidence": 100.0,
                "status": "success"
            })

        # --- GATE 2: WHITELIST CHECK ---
        if domain in whitelist_domains:
            return jsonify({
                "scanned_url": target_url,
                "is_phishing": False,
                "verdict": "Safe",
                "protocol": "Whitelist Protocol",
                "confidence": 100.0,
                "status": "success"
            })

        # --- GATE 2.5: LEVENSHTEIN TYPOSQUATTING CHECK ---
        # Only runs if it wasn't an EXACT match on the whitelist.
        is_spoof, targeted_domain = check_typosquatting(domain)
        if is_spoof:
            return jsonify({
                "scanned_url": target_url,
                "is_phishing": True,
                "verdict": "Phishing",
                "protocol": "Levenshtein String Analysis",
                "confidence": 98.5, # Extremely high confidence of malicious intent
                "status": "success",
                "summary": f"Typosquatting detected. The URL is attempting to spoof '{targeted_domain}'."
            })

        # --- GATE 3: AI MODEL (GREYLIST) ---
        if rf_model is None:
            return jsonify({"error": "AI Model offline and URL not on lists.", "status": "failed"}), 500

        features_df = extract_111_features(target_url)
        prediction = rf_model.predict(features_df)[0]
        probabilities = rf_model.predict_proba(features_df)[0]
        
        is_phishing = bool(prediction == 1)
        confidence_score = probabilities[1] if is_phishing else probabilities[0]

        return jsonify({
            "scanned_url": target_url,
            "is_phishing": is_phishing,
            "verdict": "Phishing" if is_phishing else "Safe",
            "protocol": "AI RF Analysis (Greylist)",
            "confidence": round(confidence_score * 100, 2),
            "status": "success"
        })

    except Exception as e:
        return jsonify({"error": str(e), "status": "failed"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)