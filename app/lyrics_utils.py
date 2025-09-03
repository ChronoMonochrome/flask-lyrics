from typing import Any, List, Dict
import os
import json

def generate_html_from_tokens(tokens: List[Any], vocabulary: List[Dict[str, str]]) -> str:
    """
    Generates an HTML string from a list of lyric tokens.
    It now checks if a linked word exists in the vocabulary list before creating the link.
    """
    html_parts = []

    # Create a set of vocabulary words for efficient lookup
    vocab_words = {item["word"] for item in vocabulary}

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

            inner_html = ""
            if ruby_data:
                # Build the ruby tag structure
                inner_html += "<ruby>"
                for part in ruby_data:
                    inner_html += f'<rb class="kanji">{part["kanji"]}</rb><rt class="furigana">{part["furigana"]}</rt>'
                inner_html += "</ruby>"
            elif text:
                # A word without kanji/furigana
                inner_html += f'<span class="{css_class}">{text}</span>'
            else:
                # A regular string token with a class
                # This case is less common with the new format but good for robustness
                inner_html += f'<span>{token}</span>'

            # Only create a link if a 'link' property is present AND it exists in the vocabulary list
            if link and link in vocab_words:
                html_parts.append(f'<a href="/words/{link}" class="japanese-word-link">{inner_html}</a>')
            else:
                # If no link is needed or the word is not in the vocabulary, just render the inner HTML
                html_parts.append(inner_html)

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
    vocabulary_html = generate_vocabulary_html(vocabulary)

    return f"""
    <div class="container mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 class="text-4xl font-bold mb-2 text-center">{title}</h1>
        <h2 class="text-2xl text-gray-600 mb-8 text-center">{artist}</h2>

        <div id="lyrics-container" class="text-lg leading-relaxed">
            {lyrics_content_html}
        </div>

        <div class="mt-12 pt-8 border-t border-gray-300">
            <h3 class="text-2xl font-semibold mb-4">Vocabulary (N5-N4)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vocabulary_html}
            </div>
        </div>
    </div>
    """

def generate_vocabulary_html(vocabulary_list: List[Dict[str, str]]) -> str:
    """Generates the HTML for the vocabulary section."""
    vocab_html = ""
    for item in vocabulary_list:
        word = item.get("word", "")
        reading = item.get("reading", "")
        translation = item.get("translation", "")

        display_text = f'{word} ({reading})' if reading else word

        linked_word = f'<a href="/words/{word}" class="japanese-word-link hover:underline text-blue-700">{display_text}</a>'
        vocab_html += f"""
        <div class="bg-gray-50 p-4 rounded-md shadow-sm">
            <h4 class="text-xl font-semibold mb-2">{linked_word}</h4>
            <p class="text-gray-700">{translation}</p>
        </div>
        """
    return vocab_html
