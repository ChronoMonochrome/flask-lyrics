import re
import os
import json

# This function links Japanese words to the lookup page.
# It identifies Japanese words (Kanji, Hiragana, Katakana) and wraps them in an anchor tag.
def link_japanese_words(text_html: str) -> str:
    # Regex to capture Kanji, Hiragana, or Katakana sequences
    # This also needs to be careful not to break existing ruby/rt/rb tags.
    # It will target individual Japanese words or groups of words that are not already links.
    # We explicitly look for Japanese characters that are not already part of an <a href> tag.

    # Pattern to find Japanese characters (Kanji, Hiragana, Katakana)
    # Excludes English words and numbers.
    japanese_word_pattern = re.compile(r'([\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF]+)')

    # Function to replace matched Japanese words with a link
    def replace_word(match):
        word = match.group(0)
        # Check if the word is already part of a ruby tag's rt (furigana) or rb (base text)
        # This is a heuristic and might need fine-tuning based on exact HTML structure.
        # For simplicity, we assume we want to link the primary kanji/kana, not furigana.
        # The frontend will be responsible for displaying this HTML.

        # We need to ensure we don't double-wrap or wrap furigana.
        # This function should ideally be called on the *text content* of the lyrics,
        # after parsing the ruby tags, or carefully designed to avoid internal ruby elements.

        # A simple approach is to link the entire matched Japanese word,
        # but in a more complex scenario, you might need an HTML parser.
        return f'<a href="/words/{word}" class="japanese-word-link">{word}</a>'

    # Split the HTML by existing ruby tags to avoid modifying their internal content
    # This regex is an oversimplification and a real HTML parser would be better.
    # For now, let's assume direct text is what we link.

    # Temporarily replace ruby tags to protect their content
    temp_placeholders = []
    def replace_ruby(m):
        temp_placeholders.append(m.group(0))
        return f"__RUBY_PLACEHOLDER_{len(temp_placeholders)-1}__"

    protected_html = re.sub(r'<ruby>.*?<\/ruby>', replace_ruby, text_html, flags=re.DOTALL)
    protected_html = re.sub(r'<span class="english">.*?<\/span>', replace_ruby, protected_html, flags=re.DOTALL)

    # Now, link Japanese words in the unprotected text
    linked_html = japanese_word_pattern.sub(replace_word, protected_html)

    # Restore ruby tags
    for i, ruby_tag in enumerate(temp_placeholders):
        linked_html = linked_html.replace(f"__RUBY_PLACEHOLDER_{i}__", ruby_tag)

    return linked_html


def generate_vocabulary_html(vocabulary_list: List[Dict[str, str]]) -> str:
    """Generates the HTML for the vocabulary section."""
    vocab_html = ""
    for item in vocabulary_list:
        # Link the vocabulary word itself
        linked_word = f'<a href="/words/{item["word"]}" class="japanese-word-link hover:underline text-blue-700">{item["word"]} ({item["reading"]})</a>'
        vocab_html += f"""
        <div class="bg-gray-50 p-4 rounded-md shadow-sm">
            <h4 class="text-xl font-semibold mb-2">{linked_word}</h4>
            <p class="text-gray-700">{item["translation"]}</p>
        </div>
        """
    return vocab_html

def generate_lyrics_page_html(song_data: Dict[str, Any]) -> str:
    """
    Generates the full HTML content for a song's lyrics page.
    This includes title, artist, lyrics with linked words, and vocabulary.
    """
    title = song_data["title"]
    artist = song_data["artist"]
    lyrics_content = song_data["lyrics"]
    vocabulary = song_data["vocabulary"]

    lyrics_html_lines = []
    for line in lyrics_content:
        # Link words within each lyric line
        linked_line = link_japanese_words(line)
        lyrics_html_lines.append(f'<div class="lyric-line">{linked_line}</div>')

    lyrics_content_html = "\n".join(lyrics_html_lines)
    vocabulary_html = generate_vocabulary_html(vocabulary)

    # Note: Tailwind CSS and Google Fonts are linked in the frontend's index.html
    # so we only return the internal HTML content here.
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
