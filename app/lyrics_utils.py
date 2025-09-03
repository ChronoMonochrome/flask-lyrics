from typing import Any, List, Dict
import os
import json

def generate_html_from_tokens(tokens: List[Any], vocabulary: List[Dict[str, str]]) -> str:
    """
    Generates an HTML string from a list of lyric tokens with an on-hover tooltip.
    """
    html_parts = []

    # Create a word-to-translation map for efficient lookup
    vocab_map = {item["word"]: item for item in vocabulary}

    for token in tokens:
        if isinstance(token, str):
            # A simple text string or a raw HTML tag like <br>
            html_parts.append(token)
        elif isinstance(token, dict):
            # A structured token for a word with a link and/or furigana
            text = token.get("text")
            link = token.get("link")
            ruby_data = token.get("ruby")
            css_class = token.get("class")

            # Use the link as the key to find the vocabulary entry
            vocab_entry = vocab_map.get(link)

            inner_html = ""
            if ruby_data:
                # Build the <ruby> tag structure for words with furigana
                inner_html += "<ruby>"
                for part in ruby_data:
                    inner_html += f'<rb class="kanji">{part["kanji"]}</rb><rt class="furigana">{part["furigana"]}</rt>'
                inner_html += "</ruby>"
            elif text:
                # A word without kanji/furigana, just a span
                inner_html += f'<span class="{css_class}">{text}</span>'

            # Generate the tooltip HTML only if a vocabulary entry exists
            tooltip_html = ""
            if vocab_entry:
                translation = vocab_entry.get("translation", "")
                tooltip_html = f"""
                <div class="tooltip">
                    <div class="tooltip-content">
                        <span class="tooltip-reading">{vocab_entry.get("reading", "")}</span>
                        <div class="tooltip-translation">{translation}</div>
                    </div>
                </div>
                """

            # Wrap the word in a span with the `japanese-word` class
            word_html = f'<span class="japanese-word">{inner_html}{tooltip_html}</span>'
            html_parts.append(word_html)

    return "".join(html_parts)

def generate_lyrics_page_html(song_data: Dict[str, Any]) -> str:
    """
    Generates the full HTML content for a song's lyrics page based on the new structured format.
    """
    title = song_data["title"]
    artist = song_data["artist"]
    lyrics_tokens = song_data["lyrics"]
    vocabulary = song_data["vocabulary"]

    lyrics_html_lines = []
    for line_tokens in lyrics_tokens:
        linked_line = generate_html_from_tokens(line_tokens, vocabulary)
        lyrics_html_lines.append(f'<div class="lyric-line">{linked_line}</div>')

    lyrics_content_html = "\n".join(lyrics_html_lines)

    # The vocabulary section is now obsolete as it's handled by tooltips
    # vocabulary_html = generate_vocabulary_html(vocabulary)

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title} - {artist}</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="style.css">
    </head>
    <body>
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
