import os
import json
from . import initialize_word_database
from .lyrics_utils import generate_lyrics_page_html

# Assume the directory structure is app/generate_cache.py
# and the data directory is app/static/data
# The cache directory will be app/static/cache
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '../data')
CACHE_DIR = os.path.join(BASE_DIR, '../cache')

initialize_word_database()

# Ensure the cache directory exists
os.makedirs(CACHE_DIR, exist_ok=True)

# 1. Load the vocabulary data
VOCABULARY_DATA = {}
vocab_file_path = os.path.join(DATA_DIR, 'vocabulary.json')
try:
    with open(vocab_file_path, 'r', encoding='utf-8') as f:
        VOCABULARY_DATA = json.load(f)
    print(f"Loaded vocabulary data from {vocab_file_path}")
except FileNotFoundError:
    print(f"Error: Vocab file not found at {vocab_file_path}")
    exit(1)
except json.JSONDecodeError as e:
    print(f"Error decoding vocab JSON from {vocab_file_path}: {e}")
    exit(1)

# 2. Load all song lyrics data
LYRICS_DATA = {}
lyrics_dir_path = os.path.join(DATA_DIR, 'lyrics')
if os.path.exists(lyrics_dir_path):
    for root, dirs, files in os.walk(lyrics_dir_path):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        for song in data.get('songs', []):
                            LYRICS_DATA[song['id']] = song
                    print(f"Loaded songs from {file_path}")
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON from {file_path}: {e}")
                except Exception as e:
                    print(f"An unexpected error occurred loading data from {file_path}: {e}")
    print(f"Successfully loaded a total of {len(LYRICS_DATA)} songs.")
else:
    print(f"Error: Lyrics directory not found: {lyrics_dir_path}")
    exit(1)

# 3. Generate a simplified song list for the API
song_list_data = {}
for song_id, song in LYRICS_DATA.items():
    song_list_data[song_id] = {
        'title': song.get('title'),
        'artist': song.get('artist')
    }
song_list_file_path = os.path.join(DATA_DIR, 'song_list.json')
with open(song_list_file_path, 'w', encoding='utf-8') as f:
    json.dump(song_list_data, f, ensure_ascii=False, indent=2)
print(f"Generated song list file at {song_list_file_path}")


# 4. Generate HTML files for each song
for song_id, song_data in LYRICS_DATA.items():
    try:
        html_content = generate_lyrics_page_html(song_data, VOCABULARY_DATA)
        output_path = os.path.join(CACHE_DIR, f"{song_id}.html")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"Generated HTML for song ID: {song_id}")
    except Exception as e:
        print(f"Error generating HTML for song ID {song_id}: {e}")

print("HTML cache generation complete.")
