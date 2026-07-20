FROM python:3.13-slim

WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the files (including server.py, your model .pkl, and .csv files)
COPY . .

# Hugging Face Spaces routes traffic to port 7860
EXPOSE 7860

# Run the Flask app using Gunicorn (production server)
CMD ["gunicorn", "-b", "0.0.0.0:7860", "--timeout", "120", "server:app"]
