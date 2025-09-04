import json
import re
import argparse
from JapaneseTokenizer import MecabWrapper

# A simple class to handle cases where the tokenizer fails,
# ensuring the rest of the code doesn't break.
class SimpleToken:
    def __init__(self, surface, reading):
        self.surface = surface
        self.reading = reading if reading is not None else ""

# The title and artist information for the lyrics.
SONG_INFO = {
    "id": "ribbon-toku-remix",
    "title": "ribbon -toku (GARNiDELiA) Remix-",
    "artist": "彩音"
}

def has_kanji(text):
    """
    Checks if a string contains any Kanji characters.
    """
    return bool(re.search(r'[\u4e00-\u9faf]', text))

def tokenize_and_format_line(tokenizer, line):
    """
    Tokenizes a single line of lyrics and formats the output
    to match the desired JSON structure with kanji/furigana.
    """
    # The user's desired output format is very specific and does not always
    # match standard tokenizer behavior. This function tokenizes the input
    # and then manually processes the tokens to fit the required format.
    
    # Split the line by full-width spaces (　) to preserve them as separate tokens.
    parts = re.split(r'(　)', line)
    
    formatted_tokens = []
    
    # First, get a list of tokens, converting raw strings and handling tokenizer failures.
    all_tokens = []
    for part in parts:
        if not part:  # Skip empty strings that can result from re.split
            continue

        if part == '　':
            all_tokens.append(SimpleToken(surface='　', reading=''))
            continue
        
        # Try to tokenize and standardize the output.
        try:
            tokens_from_tokenizer = tokenizer.tokenize(part).convert_list_object()
            for t in tokens_from_tokenizer:
                # Check for token objects with a 'surface' attribute.
                if hasattr(t, 'surface'):
                    all_tokens.append(SimpleToken(surface=t.surface, reading=t.reading))
                else:
                    # Treat anything else as a simple string token.
                    all_tokens.append(SimpleToken(surface=str(t), reading=''))
        except Exception:
            # If any exception occurs, fall back to a simple token.
            all_tokens.append(SimpleToken(surface=part, reading=''))

    # Now, all_tokens is a standardized list of SimpleToken objects.
    formatted_tokens = []
    for i, token in enumerate(all_tokens):
        surface = token.surface
        reading = token.reading
        
        # The rest of the logic can now run safely.
        if has_kanji(surface):
            furigana = reading
            kanji_text = surface
            
            if i + 1 < len(all_tokens) and not has_kanji(all_tokens[i+1].surface) and all_tokens[i+1].reading:
                if reading and reading.endswith(all_tokens[i+1].reading):
                    furigana = reading[:-len(all_tokens[i+1].reading)]
            
            formatted_tokens.append({
                "link": surface,
                "ruby": [{"kanji": kanji_text, "furigana": furigana}]
            })
        else:
            formatted_tokens.append(surface)
            
    return formatted_tokens

def extract_vocabulary(tokenized_data):
    """
    Extracts all unique words with their readings from the tokenized data.
    """
    vocabulary_set = set()
    for line in tokenized_data:
        for item in line:
            if isinstance(item, dict):
                word = item["link"]
                # Concatenate all furigana parts for a full reading.
                reading = "".join(r["furigana"] for r in item.get("ruby", []))
                vocabulary_set.add((word, reading))
            elif isinstance(item, str) and item.strip():
                # Add non-kanji words.
                vocabulary_set.add((item, ""))
    
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
    
    args = parser.parse_args()
    
    # Initialize the tokenizer.
    tokenizer = MecabWrapper(dictType='unidic')
    
    # Read lyrics from the specified input file.
    with open(args.input, 'r', encoding='utf-8') as f:
        lyrics_text = f.read()

    # Split the lyrics into lines.
    lines = lyrics_text.strip().split('\n')
    
    # Process each line to create the tokenized lyrics structure.
    tokenized_lyrics = [tokenize_and_format_line(tokenizer, line) for line in lines]
    
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

    print(f"Successfully generated {args.output_vocab} and {args.output_lyrics} using JapaneseTokenizer.")
