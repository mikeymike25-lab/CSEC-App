import os
import re
import joblib
import pandas as pd
from urllib.parse import urlparse
from flask import Flask, request, jsonify
from flask_cors import CORS # <-- NEW IMPORT
import Levenshtein # <-- NEW IMPORT
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
else:
    print("Warning: GEMINI_API_KEY is not set.")

app = Flask(__name__)
CORS(app) # <-- ENABLE CORS

@app.route('/', methods=['GET'])
def home():
    return "C-SEC Flask Server is LIVE and running!"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------
# 1. LOAD AI MODEL (GATE 3)
# ---------------------------------------------------------
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'csec_rf_model.pkl')

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
BLACKLIST_PATH = os.path.join(BASE_DIR, 'data', 'online-valid.csv')
WHITELIST_PATH = os.path.join(BASE_DIR, 'data', 'tranco_JLQJY.csv')

try:
    blacklist_df = pd.read_csv(BLACKLIST_PATH, header=None, names=['url'], low_memory=False)
    blacklist_urls = set(blacklist_df['url'].astype(str).str.lower())
    print(f"Gate 1 Active: Loaded {len(blacklist_urls)} Blacklisted URLs.")
except Exception:
    print("No blacklist.csv found. Gate 1 (Blacklist) is disabled.")
    blacklist_urls = set()

try:
    whitelist_df = pd.read_csv(WHITELIST_PATH, header=None, names=['domain'], low_memory=False)
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
# 3. AI EXPLANATION ENGINE & ASSISTANT API
# ---------------------------------------------------------
def generate_threat_explanation(url, verdict, protocol, confidence, technical_details):
    try:
        if not os.getenv("GEMINI_API_KEY"):
            return "AI Analysis is currently offline. Please configure the Sentinel Engine."

        if protocol == "Whitelist Protocol":
            return "This clean link appears to be a verified domain on our global safe-list. You may proceed."

        prompt = (f"You are 'The CSEC Sentinel', a highly advanced AI cybersecurity expert. "
                  f"I have scanned the URL '{url}'. Our static engine returned these results: "
                  f"Verdict: {verdict}. Protocol triggered: {protocol}. Phishing Confidence Level: {confidence}%. "
                  f"Technical Detail: {technical_details}. "
                  f"Provide a brief, human-readable paragraph (max 3 sentences) explaining to a non-technical user "
                  f"why this link is {verdict.lower()} and what they should dynamically look out for based on this data. "
                  f"Be professional but somewhat dramatic, like a security sentry. Do not say 'As an AI'.")

        model = genai.GenerativeModel("gemini-3.1-flash-lite")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API Error (Explain): {e}")
        return "The Sentinel encountered logic interference and could not formulate an analysis."

@app.route('/gemini-chat', methods=['POST'])
def gemini_chat():
    try:
        if not os.getenv("GEMINI_API_KEY"):
             return jsonify({"error": "Gemini API key is missing. Please configure Sentinel parameters.", "status": "failed"}), 500
             
        data = request.get_json()
        user_message = data.get('message', '')
        chat_history = data.get('history', []) # list of {role: 'user'|'model', parts: 'content'}

        if not user_message:
            return jsonify({"error": "No message provided.", "status": "failed"}), 400

        system_instruction = "You are 'The CSEC Sentinel', an advanced cybersecurity AI assistant. Your primary task is to prevent and educate the user about cyber threats, with a special focus on phishing attacks. Explain cybersecurity concepts simply and clearly to non-technical users. Avoid deep technical jargon, use simple analogies, and keep your answers brief, friendly, and easy to understand. Provide proactive tips on how to identify phishing emails, malicious links, and social engineering tactics. Do not provide information on how to launch attacks. IMPORTANT: You MUST use emojis frequently to make your responses more engaging. DO NOT output any asterisks (*) for formatting or bullet points."
        model = genai.GenerativeModel("gemini-3.1-flash-lite", system_instruction=system_instruction)
        
        # Start chat with history
        chat = model.start_chat(history=chat_history)
        response = chat.send_message(user_message)

        return jsonify({
            "response": response.text.strip(),
            "status": "success"
        })

    except Exception as e:
        print(f"Gemini API Error (Chat): {e}")
        return jsonify({"error": str(e), "status": "failed"}), 500

# ---------------------------------------------------------
# 4. API ENDPOINT
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
            verdict_str = "Phishing"
            proto_str = "Blacklist Protocol"
            conf_pct = 100.0
            tech_str = "Matched in Global Dynamic Blacklist."
            sentinel_analysis = generate_threat_explanation(target_url, verdict_str, proto_str, conf_pct, tech_str)
            return jsonify({
                "scanned_url": target_url,
                "is_phishing": True,
                "verdict": verdict_str,
                "protocol": proto_str,
                "confidence": conf_pct,
                "sentinel_analysis": sentinel_analysis,
                "status": "success"
            })

        # --- GATE 2: WHITELIST CHECK ---
        if domain in whitelist_domains:
            verdict_str = "Safe"
            proto_str = "Whitelist Protocol"
            conf_pct = 100.0
            tech_str = "Matched in Verified Platform Whitelist."
            sentinel_analysis = generate_threat_explanation(target_url, verdict_str, proto_str, conf_pct, tech_str)
            return jsonify({
                "scanned_url": target_url,
                "is_phishing": False,
                "verdict": verdict_str,
                "protocol": proto_str,
                "confidence": conf_pct,
                "sentinel_analysis": sentinel_analysis,
                "status": "success"
            })

        # --- GATE 2.5: LEVENSHTEIN TYPOSQUATTING CHECK ---
        # Only runs if it wasn't an EXACT match on the whitelist.
        is_spoof, targeted_domain = check_typosquatting(domain)
        if is_spoof:
            verdict_str = "Phishing"
            proto_str = "Levenshtein String Analysis"
            conf_pct = 98.5
            tech_str = f"Levenshtein distance <= 2 detected. Potential typosquatting for {targeted_domain}."
            sentinel_analysis = generate_threat_explanation(target_url, verdict_str, proto_str, conf_pct, tech_str)
            return jsonify({
                "scanned_url": target_url,
                "is_phishing": True,
                "verdict": verdict_str,
                "protocol": proto_str,
                "confidence": conf_pct, # Extremely high confidence of malicious intent
                "status": "success",
                "summary": f"Typosquatting detected. The URL is attempting to spoof '{targeted_domain}'.",
                "sentinel_analysis": sentinel_analysis
            })

        # --- GATE 3: AI MODEL (GREYLIST) ---
        if rf_model is None:
            return jsonify({"error": "AI Model offline and URL not on lists.", "status": "failed"}), 500

        features_df = extract_111_features(target_url)
        prediction = rf_model.predict(features_df)[0]
        probabilities = rf_model.predict_proba(features_df)[0]
        
        is_phishing = bool(prediction == 1)
        confidence_score = probabilities[1] if is_phishing else probabilities[0]
        
        verdict_str = "Phishing" if is_phishing else "Safe"
        proto_str = "AI RF Analysis (Greylist)"
        conf_pct = round(confidence_score * 100, 2)
        tech_str = "Static RF Model Analysis Completed."

        # --- GATE 4: GEMINI EXPLANATION ---
        # Generate the explanation from Gemini based on the result.
        sentinel_analysis = generate_threat_explanation(target_url, verdict_str, proto_str, conf_pct, tech_str)

        return jsonify({
            "scanned_url": target_url,
            "is_phishing": is_phishing,
            "verdict": verdict_str,
            "protocol": proto_str,
            "confidence": conf_pct,
            "sentinel_analysis": sentinel_analysis,
            "status": "success"
        })

    except Exception as e:
        return jsonify({"error": str(e), "status": "failed"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)