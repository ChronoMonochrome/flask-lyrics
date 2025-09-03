import json
import os
import sys

def add_vocabulary(source_file: str, dest_file: str):
    """
    Reads vocabulary entries from a source JSON file and merges them into a
    destination JSON file, preventing duplicates.
    
    Args:
        source_file: The path to the source JSON file.
        dest_file: The path to the destination JSON file.
    """
    try:
        # Load the source vocabulary data
        with open(source_file, 'r', encoding='utf-8') as f:
            source_vocab = json.load(f)
    except FileNotFoundError:
        print(f"Error: Source file not found at '{source_file}'.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{source_file}'. Please check the file format.")
        return

    # Load the destination vocabulary data, or initialize an empty list
    if os.path.exists(dest_file):
        try:
            with open(dest_file, 'r', encoding='utf-8') as f:
                dest_vocab = json.load(f)
        except json.JSONDecodeError:
            print(f"Warning: Destination file '{dest_file}' is corrupted. Starting with an empty list.")
            dest_vocab = []
    else:
        print(f"Destination file '{dest_file}' not found. Creating a new one.")
        dest_vocab = []

    # Use a set for efficient lookup to avoid duplicates
    existing_words = {entry["word"] for entry in dest_vocab}
    new_entries_added = 0

    # Add new entries from the source to the destination
    for entry in source_vocab:
        word = entry.get("word")
        if word and word not in existing_words:
            dest_vocab.append(entry)
            existing_words.add(word)
            new_entries_added += 1

    # Write the updated vocabulary back to the destination file
    with open(dest_file, 'w', encoding='utf-8') as f:
        json.dump(dest_vocab, f, indent=4, ensure_ascii=False)

    print(f"Successfully added {new_entries_added} new vocabulary entries to '{dest_file}'.")
    print(f"Total entries in destination file: {len(dest_vocab)}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python add_vocabulary.py <source_file.json> <destination_file.json>")
        sys.exit(1)
    
    source = sys.argv[1]
    destination = sys.argv[2]
    add_vocabulary(source, destination)
