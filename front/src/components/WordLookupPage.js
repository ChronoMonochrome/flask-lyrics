// front/src/components/WordLookupPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getWords } from '../services/api';

const WordLookupPage = () => {
    const { t } = useTranslation();
    const { word } = useParams(); // Get the 'word' parameter from the URL
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWordData = async () => {
            setLoading(true);
            setError(null);
            if (word) {
                try {
                    const data = await getWords(word);
                    setResults(data);
                } catch (err) {
                    setError(t('word_lookup_fetch_error'));
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchWordData();
    }, [word, t]);

    if (loading) {
        return <div>{t('loading_data')}...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>{error}</div>;
    }

    return (
        <div>
        <h2>{t('word_lookup_title', { word })}</h2>
        {results.length > 0 ? (
            results.map((entry, index) => (
                <div key={index} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
                <h3>
                {entry.k && entry.k.length > 0 ? entry.k.join('・') : t('word_lookup_no_kanji')}
                <span style={{ marginLeft: '10px', color: '#666', fontWeight: 'normal' }}>
                ({entry.r && entry.r.length > 0 ? entry.r.join('・') : t('word_lookup_no_readings')})
                </span>
                </h3>
                {entry.s && entry.s.length > 0 ? (
                    <ul>
                    {entry.s.map((sense, senseIndex) => (
                        <li key={senseIndex}>
                        {sense.g && sense.g.length > 0 ? (
                            <p>{sense.g.map(g => g.str || g).join('; ')}</p>
                        ) : (
                            <p>{t('word_lookup_no_glosses')}</p>
                        )}
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p>{t('word_lookup_no_senses')}</p>
                )}
                </div>
            ))
        ) : (
            <p>{t('word_lookup_no_results', { word })}</p>
        )}
        </div>
    );
};

export default WordLookupPage;
