// src/components/FuriganaText.js
import React from 'react';
import { parseJapaneseText } from '../utils/japaneseParser'; // You'd write this utility

const FuriganaText = ({ kanjiText, hiraganaText }) => {
    // This is a simplified example. A real solution would involve:
    // 1. A library to parse Kanji and map to Hiragana (e.g., Kurosawa)
    // 2. Or, for simplicity, a more direct mapping if your riddle data is structured.
    // For this app, the backend gives both kanjiText and hiraganaText.
    // We'll assume a simple split for now, but a robust solution would
    // iterate through the kanjiText and apply hiragana based on position/length.

    // A very basic, illustrative approach.
    // In a real scenario, you'd want to tokenize and match.
    // For JLPT N5-N4, a direct match is often sufficient if the text isn't too complex.

    // Example:
    // kanjiText: "あたたかい日"
    // hiraganaText: "あたたかいひ"
    // Target: <ruby>日<rt>ひ</rt></ruby>

    // For simplicity with given N5 riddles, let's assume `kanjiText` contains
    // the kanji part and `hiraganaText` is its reading.
    // This component expects pairs of (kanji, hiragana_reading) or similar for complex cases.

    // Given the simple riddle structure, let's assume `text_kanji` is the full string
    // and `text_hiragana` is the full string, and we need to apply furigana to individual kanji.
    // This is the most complex part of the frontend logic.

    // Option 1: Simple regex to find kanji and apply hiragana for EACH kanji.
    // This is hard without a proper dictionary or detailed `text_hiragana` structure.
    // E.g., if kanjiText="天気" and hiraganaText="てんき", we need to know 天 -> てん, 気 -> き.
    // The backend providing `text_hiragana` as a *full reading* is helpful, but
    // applying it as furigana over *individual kanji* is complex without more data or a parser.

    // Let's go with a simpler model for now: If `text_kanji` contains kanji,
    // we'll highlight it and let the user see the `text_hiragana` for the full string.
    // Or, assume the backend provides specific furigana mappings.

    // For this challenge, let's just display the full kanji text and a toggle for hiragana.
    // Or, if your riddle `text_kanji` is designed such that single kanji are replaced
    // directly by their hiragana in `text_hiragana` (e.g., 日 vs ひ), it's easier.

    // **A robust solution for furigana:**
    // You'd typically use a library like `kuromoji.js` or `mecab` for client-side parsing
    // or a server-side pre-processor to get the word-by-word furigana.

    // Simplified approach for the demo: Display text_kanji, and let's add a button
    // to show/hide text_hiragana if the user wants. True furigana requires more.

    // For actual <ruby> tags, you need specific kanji-hiragana pairs.
    // Example structure for `FuriganaText` to work well:
    // `parts = [{ type: 'kanji', text: '日', furigana: 'ひ'}, {type: 'text', text: 'です'}]`
    // The backend should generate this `parts` array or similar.

    // For the sake of demonstration given the `Riddle` model, we will
    // just render `text_kanji`. A separate "show hiragana" button can
    // reveal `text_hiragana` if the `FuriganaText` component isn't smart enough.
    // True inline furigana is quite advanced for a simple demo.

    // If you want proper <ruby> tags, your API response for riddles
    // would ideally look like:
    // {
    //   id: "...",
    //   parts: [
    //     { type: "text", value: "あたたかい" },
    //     { type: "kanji", value: "日", ruby: "ひ" },
    //     { type: "text", value: "に、これがあるとすずしいです。" }
    //   ],
    //   xp_reward: 10,
    //   // ...
    // }
    // Then, the component iterates `parts` and renders <ruby> for 'kanji' type.

    // For now, let's make a placeholder that simply renders `kanjiText`
    // and indicates `hiraganaText` is also available.
    return (
        <p>
            {kanjiText}
            {/* A real implementation would parse kanjiText and hiraganaText
                to generate <ruby> tags. For simple N5, direct display
                of hiragana as a hint might be sufficient. */}
        </p>
    );
};

export default FuriganaText;
