import json
import re
import argparse
from fugashi import Tagger
import jaconv

def get_base_form(text: str) -> str:
    """
    Finds the base form of a Japanese verb or adjective using Fugashi.
    """
    tagger = Tagger()
    for word in tagger(text):
        # The 7th element (index 6) in the feature is the base form
        if hasattr(word.feature, 'lemma'):
            return word.feature.lemma
    return text

# A simple class to handle cases where the tokenizer fails,
# ensuring the rest of the code doesn't break.
class SimpleToken:
    def __init__(self, surface, reading):
        self.surface = surface
        self.reading = reading if reading is not None else ""

# The title and artist information for the lyrics.
SONG_INFO = {}

def has_kanji(text):
    """
    Checks if a string contains any Kanji characters.
    """
    return bool(re.search(r'[\u4e00-\u9faf]', text))

def katakana_to_hiragana(text):
    """
    Converts katakana characters to hiragana.
    """
    return jaconv.kata2hira(text)

def tokenize_and_format_line(tagger, line):
    """
    Tokenizes a single line of lyrics using fugashi and formats the output
    to match the desired JSON structure with kanji and furigana.
    """
    formatted_tokens = []
    
    # Process the line with fugashi.
    for word in tagger(line):
        surface = word.surface
        reading = word.feature.kana if word.feature else None
        
        # Check if the token is a single hiragana character and is an auxiliary verb, particle, etc.
        # These are generally not meant to be separate dictionary objects.
        if (len(surface) == 1 and
            any(p in word.feature for p in ['助詞', '助動詞', '接尾詞'])):
            formatted_tokens.append(surface)
            continue
        
        if has_kanji(surface):
            kanji_part = surface
            furigana_part = ""
            okurigana_part = ""
            
            if reading:
                # Convert the full reading to hiragana.
                hiragana_reading = katakana_to_hiragana(reading)
                
                # Find the longest matching suffix between the hiragana reading and the surface form.
                # This handles Okurigana (trailing hiragana).
                okurigana_chars = ""
                for i in range(1, min(len(hiragana_reading), len(surface)) + 1):
                    # Compare trailing characters.
                    if surface[-i] == hiragana_reading[-i]:
                        okurigana_chars = surface[-i] + okurigana_chars
                    else:
                        break
                okurigana_part = okurigana_chars
                
                # The furigana for the kanji is the full hiragana reading minus the okurigana's reading.
                furigana_part = hiragana_reading[:-len(okurigana_part)] if okurigana_part else hiragana_reading
                
                # The kanji part of the surface is the surface without the okurigana.
                kanji_part = surface[:-len(okurigana_part)] if okurigana_part else surface
            
            # If there's an okurigana part, split the token into two elements.
            if okurigana_part:
                formatted_tokens.append({
                    "link": get_base_form(kanji_part + okurigana_part),
                    "ruby": [{"kanji": kanji_part, "furigana": furigana_part}]
                })
                formatted_tokens.append(okurigana_part)
            else:
                # If no okurigana, treat it as a single token.
                formatted_tokens.append({
                    "link": get_base_form(surface),
                    "ruby": [{"kanji": kanji_part, "furigana": furigana_part}]
                })
        else:
            # For non-kanji words (including English words and full-width spaces),
            # just store the surface.
            formatted_tokens.append({"link": surface})

    return formatted_tokens

def extract_vocabulary(tokenized_data):
    """
    Extracts all unique words with their readings from the tokenized data.
    """
    vocabulary_set = set()
    for line in tokenized_data:
        for item in line:
            try:
                if isinstance(item, dict) and item.get("link", "").strip():
                    word = item["link"]
                    reading = "".join(r["furigana"] for r in item.get("ruby", []))
                    vocabulary_set.add((word, reading))
                elif isinstance(item, str) and len(item) != 1:
                    vocabulary_set.add((item, ""))
            except AttributeError:
                pass
    # Sort the list of dictionaries alphabetically by the 'word' key.
    vocabulary_list = sorted(
        [{"word": w, "reading": r, "translation": ""} for w, r in vocabulary_set],
        key=lambda x: x["word"]
    )
    return vocabulary_list

# Main script execution
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Tokenize Japanese lyrics from a text file.')
    parser.add_argument('-i', '--input', required=True, help='Path to the input text file containing lyrics.')
    parser.add_argument('-ov', '--output-vocab', default='vocabulary.json', help='Path to the output vocabulary JSON file.')
    parser.add_argument('-ol', '--output-lyrics', default='lyrics.json', help='Path to the output lyrics JSON file.')
    parser.add_argument('--song-id', required=True, help='The ID of the song.')
    parser.add_argument('--song-title', required=True, help='The title of the song.')
    parser.add_argument('--song-artist', required=True, help='The artist of the song.')
    
    args = parser.parse_args()
    
    # Update SONG_INFO with command-line arguments.
    SONG_INFO.update({
        "id": args.song_id,
        "title": args.song_title,
        "artist": args.song_artist
    })
    
    # Initialize the fugashi tagger.
    tagger = Tagger()
    
    # Read lyrics from the specified input file.
    with open(args.input, 'r', encoding='utf-8') as f:
        lyrics_text = f.read()

    # Split the lyrics into lines.
    lines = lyrics_text.strip().split('\n')
    
    # Process each line to create the tokenized lyrics structure.
    tokenized_lyrics = [tokenize_and_format_line(tagger, line) for line in lines]
    
    # Create the full lyrics data structure.
    lyrics_data = SONG_INFO.copy()
    lyrics_data["lyrics"] = tokenized_lyrics
    
    # Extract the unique vocabulary from the processed data.
    vocabulary_list = extract_vocabulary(tokenized_lyrics)

    # Prepare the final JSON objects for writing.
    final_lyrics_json = {"songs": [lyrics_data]}
    final_vocabulary_json = vocabulary_list

    # Write the vocabulary JSON file.
    with open(args.output_vocab, "w", encoding="utf-8") as f:
        json.dump(final_vocabulary_json, f, ensure_ascii=False, indent=4)

    # Write the lyrics JSON file.
    with open(args.output_lyrics, "w", encoding="utf-8") as f:
        json.dump(final_lyrics_json, f, ensure_ascii=False, indent=4)

    print(f"Successfully generated {args.output_vocab} and {args.output_lyrics} using fugashi.")
