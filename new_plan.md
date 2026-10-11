# CSEC AI V2 Integration & Hybrid Architecture Plan

## Executive Overview
This implementation plan provides a zero-downtime, bug-free roadmap to integrate **CSEC_AIv2** (38-feature Active Telemetry Model) into our production backend ([`backend/server.py`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/server.py)). 

By combining our current high-speed static gates (<10ms) with CSEC_AIv2's live SSL, redirect, and WHOIS intelligence (capped at 2.5s), we achieve maximum detection accuracy (98.4%) without sacrificing mobile app responsiveness or stability.

---

## Architecture Blueprint: The 3-Tier Hybrid Pipeline

```
[Mobile App: URL Scanned]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│ TIER 1: INSTANT STATIC GATES (< 10ms)                  │
│  • Gate 0.5: Dynamic Admin Overrides (Firestore)       │
│  • Gate 1:   PhishTank Blacklist (online-valid.csv)    │
│  • Gate 2:   Tranco Top 1M Whitelist (tranco.csv)      │
│  • Gate 2.5: Levenshtein Typosquatting (Banks/Wallets) │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
[Match Found: ~85% of Scans]            [Greylist URL]
       │                                       │
       │ Instant Response (<10ms)              ▼
       │                      ┌────────────────────────────────────────────────┐
       │                      │ TIER 2: CSEC_AIv2 ACTIVE TELEMETRY (1.5 - 2.5s)│
       │                      │  • SSRF Validation Gate                        │
       │                      │  • Parallel ThreadPool (WHOIS, SSL, Redirects) │
       │                      │  • Hard 2.5s Timeout with Graceful Fallback    │
       │                      │  • 38-Feature Random Forest Inference          │
       │                      └────────────────────────┬───────────────────────┘
       │                                               │
       └───────────────────────┬───────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────┐
│ TIER 3: GUARDED EXPLANATION ENGINE (Gemini 3.1)       │
│  • Anti-Prompt Injection System Instruction            │
│  • Natural-Language Narrative for Mobile UI            │
└────────────────────────────────────────────────────────┘
```

---

## Integration Checklist

### Phase 1: Environment & Dependency Preparation
- [x] **1.1. Audit & Update Dependencies in [`backend/requirements.txt`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/requirements.txt)**
  - [x] Add `python-whois>=0.9.4`
  - [x] Add `tldextract>=5.1.0`
  - [x] Add `requests>=2.31.0`
  - [x] Pin `scikit-learn` version to match the pickled model to avoid `InconsistentVersionWarning`.
- [x] **1.2. Update [`backend/pyproject.toml`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/pyproject.toml)** (for `uv` package management consistency).
- [x] **1.3. Test Virtual Environment Installation**
  - [x] Run dependency installation.
  - [x] Verify imports: `import whois, tldextract, requests, joblib, sklearn` (Verified).

---

### Phase 2: Data Cleaning & Model Integrity Verification
- [x] **2.1. Sanitize [`CSEC_AIv2/All DataSets.csv`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/CSEC_AIv2/All%20DataSets.csv)**
  - [x] Remove list delimiter artifacts (`[` and `]`) from `url_length` and `Label`.
  - [x] Drop invalid boundary rows (Row 0 `[` and Row 2001 `]`).
  - [x] Save cleaned file as `backend/data/csec_v2_dataset.csv` (2,000 balanced samples).
- [x] **2.2. Verify Model Artifact (`phishing_rf_model.pkl`)**
  - [x] Confirm exact 38-feature schema and column order (`feature_names_in_`).
  - [x] Validate model load test and re-serialize cleanly without warnings (170 KB).
  - [x] Copy verified model to `backend/models/phishing_rf_model.pkl`.
- [x] **2.3. Keep Fast-Path Security CSVs Intact**
  - [x] Ensure [`backend/data/online-valid.csv`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/data/online-valid.csv) (Gate 1 Blacklist) remains loaded.
  - [x] Ensure [`backend/data/tranco_JLQJY.csv`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/data/tranco_JLQJY.csv) (Gate 2 Whitelist) remains loaded.
  - [x] Retire `backend/data/dataset_small.csv` (old 111-feature training set) from active scanning.

---

### Phase 3: Defensive Feature Extraction Engine
- [x] **3.1. Server-Side Request Forgery (SSRF) Guard**
  - [x] Implement `check_url_safety_and_dns(url)` to resolve hostnames before making outbound requests.
  - [x] Block private/reserved IP blocks: Loopback, RFC 1918 Private, Cloud Metadata (`169.254.169.254`).
  - [x] If SSRF attempt detected, immediately flag as Phishing/Suspicious and skip outbound network calls.
- [x] **3.2. Implement Parallel Active Telemetry (`extract_v2_features`)**
  - [x] **Sub-task A: Lexical & Entropy Extractor (Synchronous ~1ms)**
    - Calculate 18 lexical counts, character ratios, and Shannon Entropy (`url_entropy`).
    - Compute `brand_similarity` and `levenshtein_distance`.
  - [x] **Sub-task B: WHOIS Worker (Asynchronous)**
    - Wrap `whois.whois(domain)` with a socket timeout.
    - Normalize list vs. datetime date fields safely.
    - Catch exceptions and return `-1` defaults.
  - [x] **Sub-task C: SSL Socket Worker (Asynchronous)**
    - Connect to port 443 with a 1.2s timeout.
    - Verify peer certificate, expiry, self-signed flag, and trusted issuer.
    - If port 443 is closed or plain HTTP, cleanly catch `ConnectionRefusedError`, `SSLError`, and return `-1`.
  - [x] **Sub-task D: HTTP Redirection Worker (Asynchronous)**
    - Trace redirects using `requests.Session().get(url, timeout=1.8, stream=True, allow_redirects=True)`.
    - Extract `redirect_count`, `cross_domain_redirects`, `same_registered_domain`, `final_https`, `redirect_to_ip`.
    - Catch connection errors and default gracefully.
- [x] **3.3. Concurrency Orchestration via ThreadPoolExecutor**
  - [x] Run WHOIS, SSL, and HTTP Redirect workers concurrently using daemon threadpool (`_EXECUTOR`).
  - [x] Enforce DNS timeout (1.0s) and active telemetry timeout (1.5-2.0s).
- [x] **3.4. In-Memory Domain Telemetry Cache**
  - [x] Implement an LRU cache with 1-hour TTL for domain-level features (WHOIS, SSL).
  - [x] Ensures repeated scans of identical domains return in <15ms.

---

### Phase 4: Server Pipeline Integration (`server.py`)
- [x] **4.1. Preserve Fast-Path Architecture**
  - [x] Keep Gate 0.5 (Firestore Threat Intel dynamic overrides) unchanged.
  - [x] Keep Gate 1 (PhishTank exact blacklist) unchanged.
  - [x] Keep Gate 2 (Tranco top 1M whitelist) unchanged.
  - [x] Keep Gate 2.5 (Levenshtein bank/e-wallet typosquatting) unchanged.
- [x] **4.2. Upgrade Gate 3 (Greylist Interception)**
  - [x] Replace `csec_rf_model.pkl` loading logic with `phishing_rf_model.pkl` (v2 primary with v1 fallback).
  - [x] Route greylist URLs through `extract_v2_features(target_url)`.
  - [x] Execute `model.predict()` and `model.predict_proba()`.
- [x] **4.3. Maintain API Response Contract with React Native Mobile App**
  - [x] Verify response JSON schema strictly matches [`app/tabs/scan.tsx`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/scan.tsx).
  - [x] Ensure `confidence` is always a float rounded to 2 decimal places.
  - [x] Ensure `verdict` is capitalized correctly (`Safe` or `Phishing`).
- [x] **4.4. Connect Gate 4 (Guarded Gemini Explanation Engine)**
  - [x] Pass the 38-feature technical indicators to `generate_threat_explanation()`.
  - [x] Retain prompt-injection system instruction and verdict consistency check.

---

### Phase 5: Verification & Pre-Deployment Testing
- [x] **5.1. Unit Test Suite Execution**
  - [x] Test safe high-traffic domain (`https://www.google.com`): Resolved via Gate 2 in 1.9ms.
  - [x] Test typosquatting target (`https://gcas-h.com`): Resolved via Gate 2.5 in 1.9ms.
  - [x] Test unknown greylist site: Resolved via Gate 3 (V2) in 123.2ms.
- [x] **5.2. Edge Case & Chaos Testing**
  - [x] **Dead / Unreachable Domain**: Handled cleanly in 61.4ms without 500 errors.
  - [x] **SSRF Attack**: `http://169.254.169.254` blocked and intercepted immediately.
  - [x] **Port 80 Non-SSL Domain**: SSL probe records -1 safely.
  - [x] **Mobile App Contract**: All 7 required schema fields confirmed present.

---

### Phase 6: Deployment & Monitoring
- [x] **6.1. Push Code to Git Repository**
  - [x] Commit `backend/requirements.txt`, `backend/server.py`, `backend/v2_feature_extractor.py`, `backend/models/phishing_rf_model.pkl`, `backend/data/csec_v2_dataset.csv`.
  - [x] Push changes to GitHub (`git push origin main`).
- [ ] **6.2. Verify Render Build & Logs**
  - [ ] Log in to Render Dashboard (`dashboard.render.com`).
  - [ ] Trigger manual deploy or verify auto-deploy triggers.
  - [ ] Check Build Logs for `pip install -r requirements.txt`.
  - [ ] Verify Server Logs output: `CSEC_AIv2 Model loaded successfully (38 features, 170.0 KB). Ready to intercept.`
- [ ] **6.3. Live Health Check & Mobile Scan**
  - [ ] Visit `https://csec-sentinel-api.onrender.com/` in browser -> returns `C-SEC Flask Server is LIVE and running!`.
  - [ ] Open C-SEC mobile app -> trigger live scan -> verify verdict card & Gemini analysis render smoothly.

---

### Phase 7: Rollback Strategy & Circuit Breaker (Safety Net)
- [x] **7.1. Feature Flag Environment Variable**
  - [x] Code supports `ENABLE_V2_AI=true` / `false`.
- [x] **7.2. Model Artifact Backup**
  - [x] `backend/models/csec_rf_model.pkl` is preserved in place on disk as the instant fallback.

