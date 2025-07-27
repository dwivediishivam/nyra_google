
import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

THREADS_API_BASE = os.getenv('THREADS_API_BASE')
THREADS_ACCESS_TOKEN = os.getenv('THREADS_ACCESS_TOKEN')
MENTION_USER_ID = os.getenv('THREADS_USER_ID') # Corrected variable name

if not all([THREADS_API_BASE, THREADS_ACCESS_TOKEN, MENTION_USER_ID]):
    print("Please ensure THREADS_API_BASE, THREADS_ACCESS_TOKEN, and THREADS_USER_ID are set in your .env file.")
    exit()

url = f"{THREADS_API_BASE}/{MENTION_USER_ID}/mentions?access_token={THREADS_ACCESS_TOKEN}"
response = None # Initialize response to None

try:
    print(f"Checking API endpoint: {url.split('?')[0]}...")
    response = requests.get(url)
    response.raise_for_status()  # Raise an HTTPError for bad responses (4xx or 5xx)
    data = response.json()
    print("API Check Successful:")
    print(data)

except requests.exceptions.RequestException as e:
    print(f"API Check Failed: {e}")
    if response is not None:
        print(f"Response Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    else:
        print("No response received from server.")

