import os
import re
import joblib
import pandas as pd
from urllib.parse import urlparse
from flask import Flask, request, jsonify

app = Flask(__name__)
@app.route('/', methods=['GET'])
def home():
    return "C-SEC Flask Server is LIVE and running!"

# 1. Load the trained Random Forest model globally
MODEL_PATH = 'csec_trained_model.pkl'

try:
    rf_model = joblib.load(MODEL_PATH)
    # Extract the exact 111 column names the model expects so the extraction function can use them
    expected_features = list(rf_model.feature_names_in_)
    print("AI Model loaded successfully. Ready to intercept.")
except Exception as e:
    print(f"Error loading model: {e}")
    rf_model = None
    expected_features = []


# 2. Feature Extraction Logic (Directly from your Jupyter Notebook)
def get_counts(text, is_missing=False):
    """If the URL part is missing, return -1 for all counts to match the CSV"""
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
    # Standardize URL
    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url
    
    parsed = urlparse(url)
    
    domain = parsed.netloc
    path = parsed.path
    params = parsed.query
    
    # Determine what is missing (to apply the -1 rule)
    has_directory = '/' in path and len(path) > 1
    has_file = '.' in os.path.basename(path)
    has_params = len(params) > 0
    
    directory = os.path.dirname(path) if has_directory else ""
    file = os.path.basename(path) if has_file else ""
    
    # Extract counts (Passing True if missing to get -1s)
    u_counts = get_counts(url)
    d_counts = get_counts(domain)
    dir_counts = get_counts(directory, not has_directory)
    f_counts = get_counts(file, not has_file)
    p_counts = get_counts(params, not has_params)
    
    features = {}
    
    # Map counts to column names
    for char in u_counts:
        features[f'qty_{char}_url'] = u_counts[char]
        features[f'qty_{char}_domain'] = d_counts[char]
        features[f'qty_{char}_directory'] = dir_counts[char]
        features[f'qty_{char}_file'] = f_counts[char]
        features[f'qty_{char}_params'] = p_counts[char]
        
    # Add Lengths (Use -1 if missing)
    features['length_url'] = len(url)
    features['domain_length'] = len(domain)
    features['directory_length'] = len(directory) if has_directory else -1
    features['file_length'] = len(file) if has_file else -1
    features['params_length'] = len(params) if has_params else -1
    features['qty_params'] = len(params.split('&')) if has_params else -1
    
    # Special Features
    features['email_in_url'] = 1 if re.search(r'[\w\.-]+@[\w\.-]+', url) else 0
    features['tls_ssl_certificate'] = 1 if url.startswith('https') else 0
    
    # Fill remaining required columns with -1 to be safe and match the exact model shape
    final_row = [features.get(col, -1) for col in expected_features]
    return pd.DataFrame([final_row], columns=expected_features)


# 3. The API Endpoint for the Mobile App
@app.route('/analyze-link', methods=['POST'])
def analyze_link():
    # Safety check if the model failed to load on startup
    if rf_model is None:
        return jsonify({"error": "AI Model is offline.", "status": "failed"}), 500

    try:
        # Catch the JSON sent by the React Native app
        data = request.get_json()
        target_url = data.get('url')

        if not target_url:
            return jsonify({"error": "No URL provided in the payload.", "status": "failed"}), 400

        # Run your exact notebook extraction script
        features_df = extract_111_features(target_url)
        
        # Run the AI prediction
        prediction = rf_model.predict(features_df)[0]
        
        # Get the confidence score (probability)
        probabilities = rf_model.predict_proba(features_df)[0]
        
        # Assuming 1 is Phishing and 0 is Safe
        is_phishing = bool(prediction == 1)
        confidence_score = probabilities[1] if is_phishing else probabilities[0]

        # Return the final result to the app
        return jsonify({
            "scanned_url": target_url,
            "is_phishing": is_phishing,
            "confidence": round(confidence_score * 100, 2),
            "status": "success"
        })

    except Exception as e:
        # Catch any errors during extraction or prediction
        return jsonify({"error": str(e), "status": "failed"}), 500

if __name__ == '__main__':
    # Running on 0.0.0.0 allows your phone to connect to the server 
    # as long as both are on the same Wi-Fi network.
    app.run(host='0.0.0.0', port=5000, debug=True)