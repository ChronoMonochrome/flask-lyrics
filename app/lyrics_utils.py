from typing import Any, List, Dict
import os
import json
from . import get_words_db
from fugashi import Tagger

def get_base_form(text: str) -> str:
    """
    Finds the base form of a Japanese verb or adjective using Fugashi.
    """
    tagger = Tagger()
    for word in tagger(text):
        # The 7th element (index 6) in the feature is the base form
        if '動詞' in word.feature or '形容詞' in word.feature:
            return word.feature[6]
    return None

def generate_html_from_tokens(tokens: List[Any], vocabulary_map: Dict[str, Dict[str, str]]) -> str:
    """
    Generates an HTML string from a list of lyric tokens with pre-rendered
    tooltip content based on a vocabulary map or a server-side database lookup.
    """
    html_parts = []
    words_db = get_words_db()

    # Create a base word version of the vocabulary map for base form lookups
    vocabulary_katakana_map = {get_base_form(k): v for k, v in vocabulary_map.items()}

    for token in tokens:
        if isinstance(token, str):
            # A simple text string or a raw HTML tag like <br>
            html_parts.append(token)
        elif isinstance(token, dict):
            # A structured token for a word
            text = token.get("text")
            ruby_data = token.get("ruby")
            link_data = token.get("link")
            extra_class = token.get("class", "")

            inner_html = ""
            lookup_word = ""

            # Determine inner HTML and lookup word based on token structure
            if ruby_data:
                # Case 1: Token has ruby characters
                inner_html += "<ruby>"
                for part in ruby_data:
                    inner_html += f'<rb class="kanji">{part["kanji"]}</rb><rt class="furigana">{part["furigana"]}</rt>'
                inner_html += "</ruby>"
                lookup_word = link_data or ""
            elif text:
                # Case 2: Token has text, no ruby
                inner_html += f'<span class="text">{text}</span>'
                lookup_word = link_data or text
            elif link_data:
                # Case 3: Token has a link but no ruby or text
                inner_html += f'<span class="text">{link_data}</span>'
                lookup_word = link_data
            else:
                # No relevant data, continue to next token
                continue

            tooltip_html = ""
            vocab_entry = None
            if lookup_word:
                # First, try to get the word from the provided vocabulary.json map
                vocab_entry = vocabulary_map.get(lookup_word)

                if vocab_entry:
                    translation = vocab_entry.get("translation", "")
                    word_text = vocab_entry.get("word", "")
                else:
                    # If not in the local vocabulary, try to find the base form
                    base_word = get_base_form(lookup_word)
                    if base_word:
                        vocab_entry = vocabulary_katakana_map.get(base_word)
                        if vocab_entry:
                            translation = vocab_entry.get("translation", "")
                            word_text = vocab_entry.get("word", "")
                        else:
                            # If the base form isn't in vocabulary.json, perform a server-side lookup
                            results = words_db.get_words(base_word)
                            if results:
                                entry = results[0]
                                word_text = entry.get('k', [''])[0] or entry.get('r', [''])[0]
                                translation = ""
                                senses = entry.get('s', [])
                                if senses and 'g' in senses[0]:
                                    translation = senses[0]['g'][0]
                    else:
                        # If a base form cannot be found, perform server-side lookup with original word
                        results = words_db.get_words(lookup_word)
                        if results:
                            entry = results[0]
                            word_text = entry.get('k', [''])[0] or entry.get('r', [''])[0]
                            translation = ""
                            senses = entry.get('s', [])
                            if senses and 'g' in senses[0]:
                                translation = senses[0]['g'][0]

            if vocab_entry or (lookup_word and results):
                tooltip_html = f"""
                <div class="tooltip">
                    <div class="tooltip-content">
                        <span class="tooltip-heading">Заметка
                            <button class="close-tooltip">&times;</button>
                        </span>
                        <div class="tooltip-note-body">
                            <span class="tooltip-expression">{word_text}</span>
                            <span class="tooltip-sense">{translation}</span>
                        </div>
                    </div>
                </div>
                """

            # Build the class string, including the extra class if it exists
            class_list = ["word-link"]
            if extra_class:
                class_list.append(extra_class)
            class_str = " ".join(class_list)

            word_html = f'<span class="{class_str}" data-word="{lookup_word}">{inner_html}{tooltip_html}</span>'
            html_parts.append(word_html)

    return "".join(html_parts)

def generate_lyrics_page_html(song_data: Dict[str, Any], vocabulary: Dict[str, Any]) -> str:
    """
    Generates the full HTML content for a song's lyrics page based on the new structured format.
    """
    title = song_data["title"]
    artist = song_data["artist"]
    lyrics_tokens = song_data["lyrics"]

    # Create a word-to-translation map for efficient lookup
    vocabulary_map = {item["word"]: item for item in vocabulary}

    lyrics_html_lines = []
    for line_tokens in lyrics_tokens:
        linked_line = generate_html_from_tokens(line_tokens, vocabulary_map)
        lyrics_html_lines.append(f'<div class="lyric-line">{linked_line}</div>')

    lyrics_content_html = "\n".join(lyrics_html_lines)

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title} - {artist}</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    </head>
    <body>
        <div class="container">
            <h1>{title}</h1>
            <h2>{artist}</h2>
            <div id="lyrics-container">
                {lyrics_content_html}
            </div>
        </div>
    </body>
    </html>
    """
