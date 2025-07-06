import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation

function RiddleCard({ riddle, onSubmitAnswer, isInitiallySolved }) {
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [showAnswer, setShowAnswer] = useState(isInitiallySolved);
    const [isSolvedLocally, setIsSolvedLocally] = useState(isInitiallySolved);
    const [revealedCorrectAnswer, setRevealedCorrectAnswer] = useState('');
    const { t } = useTranslation(); // Use the hook

    useEffect(() => {
        setIsSolvedLocally(isInitiallySolved);
        if (isInitiallySolved) {
            setShowAnswer(true);
            if (riddle.correct_answers && riddle.correct_answers.length > 0) {
                setRevealedCorrectAnswer(riddle.correct_answers.join(' / '));
            } else if (!localStorage.getItem('access_token')) {
                const storedGuestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                if (storedGuestProgress[riddle.id]?.correct) {
                    setRevealedCorrectAnswer(storedGuestProgress[riddle.id].correctAnswer);
                }
            }
        }
    }, [isInitiallySolved, riddle.id, riddle.correct_answers]);

    const handleAnswerSubmit = async () => {
        setFeedback(null);
        const result = await onSubmitAnswer(riddle.id, userAnswer);
        setFeedback(result);
        if (result.correct) {
            setIsSolvedLocally(true);
            setShowAnswer(true);
            setRevealedCorrectAnswer(result.actual_answer || riddle.correct_answers.join(' / '));
        }
    };

    const handleShowAnswer = () => {
        setShowAnswer(true);
        setIsSolvedLocally(true);

        if (riddle.correct_answers && riddle.correct_answers.length > 0) {
            setRevealedCorrectAnswer(riddle.correct_answers.join(' / '));
            if (!localStorage.getItem('access_token')) {
                const storedGuestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                const updatedProgress = {
                    ...storedGuestProgress,
                    [riddle.id]: {
                        answered: true,
                        correct: true,
                        answer: "[Revealed]",
                        correctAnswer: riddle.correct_answers.join(' / ')
                    }
                };
                localStorage.setItem('guest_progress', JSON.stringify(updatedProgress));
            }
        } else {
            setRevealedCorrectAnswer(t('answer_not_available')); // Use translation
        }
    };

    return (
        <div className={`riddle-card ${isSolvedLocally ? 'solved' : ''}`}>
            <h3>{t('riddle_card_title')}{riddle.id.substring(0, 8)}...</h3> {/* Use translation */}
            <p><strong>{t('japanese_kanji')}</strong> {riddle.text_kanji}</p> {/* Use translation */}
            <p><strong>{t('japanese_hiragana')}</strong> {riddle.text_hiragana}</p> {/* Use translation */}
            <p><strong>{t('english_text')}</strong> {riddle.english_text}</p> {/* Use translation */}
            <p><strong>{t('category_label')}</strong> {riddle.category} | <strong>{t('difficulty_label')}</strong> {riddle.difficulty}</p> {/* Use translation */}

            {isSolvedLocally ? (
                <p style={{ color: 'green', fontWeight: 'bold' }}>{t('solved_status')}</p> // Use translation
            ) : null}

            {!isSolvedLocally ? (
                <div>
                    <input
                        type="text"
                        placeholder={t('answer_input_placeholder')} // Use translation
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        style={{ display: 'block', marginBottom: '10px', width: 'calc(100% - 20px)', padding: '8px' }}
                    />
                    <button onClick={handleAnswerSubmit} style={{ marginRight: '10px', padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{t('submit_answer_button')}</button> {/* Use translation */}
                    {!showAnswer && (
                        <button onClick={handleShowAnswer} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            {t('show_answer_button')} {/* Use translation */}
                        </button>
                    )}
                </div>
            ) : null}

            {showAnswer && (
                <p style={{ marginTop: '15px' }}>
                    <strong>{t('correct_answer_label')}</strong> {revealedCorrectAnswer || t('answer_not_available')} {/* Use translation */}
                </p>
            )}

            {feedback && (
                <p className={`riddle-status ${feedback.correct ? 'correct' : 'incorrect'}`} style={{ marginTop: '10px', fontWeight: 'bold', color: feedback.correct ? 'green' : 'red' }}>
                    {feedback.message === 'Submission failed.' ? t('riddle_submission_failed') : feedback.message} {/* Handle generic submission failed message */}
                </p>
            )}
        </div>
    );
}

export default RiddleCard;