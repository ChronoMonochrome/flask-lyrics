import React from 'react';
// import { useTranslation } from 'react-i18next'; // Not directly needed unless you add text inside

const FuriganaText = ({ kanjiText }) => {
    // const { t } = useTranslation(); // If you want to use it here
    return (
        <p className="riddle-kanji-text">
            {kanjiText}
        </p>
    );
};

export default FuriganaText;