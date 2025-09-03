from typing import Any, List, Dict
import os
import json
from . import get_words_db  # Assuming api.py is in the same package

def generate_html_from_tokens(tokens: List[Any], vocabulary_map: Dict[str, Dict[str, str]]) -> str:
    """
    Generates an HTML string from a list of lyric tokens with pre-rendered
    tooltip content based on a vocabulary map or a server-side database lookup.
    """
    html_parts = []
    words_db = get_words_db()

    for token in tokens:
        if isinstance(token, str):
            # A simple text string or a raw HTML tag like <br>
            html_parts.append(token)
        elif isinstance(token, dict):
            # A structured token for a word
            text = token.get("text")
            ruby_data = token.get("ruby")
            link_data = token.get("link")

            inner_html = ""
            lookup_word = ""

            if ruby_data:
                inner_html += "<ruby>"
                for part in ruby_data:
                    inner_html += f'<rb class="kanji">{part["kanji"]}</rb><rt class="furigana">{part["furigana"]}</rt>'
                inner_html += "</ruby>"
                lookup_word = link_data or ""
            elif text:
                inner_html += f'<span class="text">{text}</span>'
                lookup_word = link_data or text

            tooltip_html = ""
            vocab_entry = None
            if lookup_word:
                # First, try to get the word from the provided vocabulary.json map
                vocab_entry = vocabulary_map.get(lookup_word)

                if vocab_entry:
                    translation = vocab_entry.get("translation", "")
                    word_text = vocab_entry.get("word", "")
                else:
                    # If not in the local vocabulary, perform a server-side lookup
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
                <div class="tooltip static">
                    <div class="tooltip-content">
                        <span class="tooltip-heading">Word Note</span>
                        <div class="tooltip-note-body">
                            <span class="tooltip-expression text-2xl font-bold">{word_text}</span>
                            <span class="tooltip-sense">{translation}</span>
                        </div>
                    </div>
                </div>
                """

            word_html = f'<span class="word-link" data-word="{lookup_word}">{inner_html}{tooltip_html}</span>'
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
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-700 min-h-screen">
        <div class="container mx-auto bg-white p-8 rounded-lg shadow-lg">
            <h1 class="text-4xl font-bold mb-2 text-center">{title}</h1>
            <h2 class="text-2xl text-gray-600 mb-8 text-center">{artist}</h2>

            <div id="lyrics-container" class="text-lg leading-relaxed">
                {lyrics_content_html}
            </div>
        </div>
    </body>
    </html>
    """
