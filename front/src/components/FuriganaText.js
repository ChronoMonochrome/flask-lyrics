// src/components/FuriganaText.js
import React from 'react';

const FuriganaText = ({ kanjiText }) => {
    // This component now simply displays the kanji text.
    // The full hiragana reading can be toggled via buttons in parent components (Riddle, RandomRiddlePage).
    // For true inline furigana, you'd need a more complex parsing logic,
    // potentially using the `hiraganaText` to map to individual kanji readings.
    return (
        <p className="riddle-kanji-text">
            {kanjiText}
        </p>
    );
};

export default FuriganaText;