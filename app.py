from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)

# Load the Random Forest model
model = joblib.load('csec_rf_model.pkl')

def extract_features(url):
    # IMPORTANT: Update these keys to match EXACTLY what is in your teammate's notebook!
    features = {
        'dot_count': url.count('.'),
        'slash_count': url.count('/'),
        'semicolon_count': url.count(';')
        # Add any other features your notebook uses here
    }
    return pd.DataFrame([features])

@app.route('/scan', methods=['POST'])
def scan():
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'No URL provided'}), 400

        # Turn the URL into numbers
        input_data = extract_features(url)
        
        # Ask the AI
        prediction = model.predict(input_data)[0]
        
        # 1 = Phishing, 0 = Safe (Double-check this in the notebook too!)
        verdict = "Phishing" if prediction == 1 else "Safe"
        
        return jsonify({
            'url': url,
            'verdict': verdict
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)