import requests
import json
import os

# --- Configuration ---
# IMPORTANT: Adjust these based on your setup
FLASK_API_BASE_URL = 'https://japaneseriddle.ignorelist.com/api' # Your deployed API URL
ADMIN_USERNAME = 'admin' # Your admin username
ADMIN_PASSWORD = 'admin_password' # Your admin password
RIDDLES_JSON_FILE = 'riddles.json' # Name of your JSON file

# --- Script Logic ---

def get_admin_token(username, password):
    """Logs in as admin and retrieves the JWT token."""
    login_url = f"{FLASK_API_BASE_URL}/auth/login"
    try:
        response = requests.post(login_url, json={'username': username, 'password': password})
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        token = response.json().get('access_token')
        if not token:
            print(f"Error: No access_token found in login response. Response: {response.json()}")
            return None
        print(f"Successfully obtained admin token for {username}.")
        return token
    except requests.exceptions.HTTPError as e:
        print(f"HTTP error during admin login: {e.response.status_code} - {e.response.text}")
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error during admin login: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during admin login: {e}")
    return None

def insert_riddle(riddle_data, token):
    """Sends a POST request to insert a single riddle."""
    add_riddle_url = f"{FLASK_API_BASE_URL}/admin/add_riddle"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    try:
        response = requests.post(add_riddle_url, json=riddle_data, headers=headers)
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        print(f"Successfully added riddle: '{riddle_data['english_text'][:50]}...' (ID: {response.json()['riddle']['id']})")
        return True
    except requests.exceptions.HTTPError as e:
        print(f"Error adding riddle '{riddle_data['english_text'][:50]}...': {e.response.status_code} - {e.response.text}")
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error adding riddle '{riddle_data['english_text'][:50]}...': {e}")
    except Exception as e:
        print(f"An unexpected error occurred adding riddle '{riddle_data['english_text'][:50]}...': {e}")
    return False

def main():
    if not os.path.exists(RIDDLES_JSON_FILE):
        print(f"Error: '{RIDDLES_JSON_FILE}' not found in the current directory.")
        print("Please create the JSON file with riddles or specify the correct path.")
        return

    try:
        with open(RIDDLES_JSON_FILE, 'r', encoding='utf-8') as f:
            riddles = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from '{RIDDLES_JSON_FILE}': {e}")
        return
    except Exception as e:
        print(f"Error reading '{RIDDLES_JSON_FILE}': {e}")
        return

    if not isinstance(riddles, list):
        print(f"Error: The JSON file '{RIDDLES_JSON_FILE}' should contain a list of riddle objects.")
        return

    admin_token = get_admin_token(ADMIN_USERNAME, ADMIN_PASSWORD)
    if not admin_token:
        print("Failed to get admin token. Aborting riddle insertion.")
        return

    print(f"\nAttempting to insert {len(riddles)} riddles...")
    inserted_count = 0
    for i, riddle in enumerate(riddles):
        print(f"[{i+1}/{len(riddles)}] Inserting riddle: {riddle.get('english_text', 'N/A')[:50]}...")
        if insert_riddle(riddle, admin_token):
            inserted_count += 1
        else:
            print(f"Skipping riddle {i+1} due to previous error.")

    print(f"\nMass insertion complete. Successfully inserted {inserted_count} of {len(riddles)} riddles.")

if __name__ == "__main__":
    main()
