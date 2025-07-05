// front/src/components/RiddleCard.js
import React, { useState, useEffect } from 'react';

function RiddleCard({ riddle, onSubmitAnswer, isInitiallySolved }) {
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState(null); // { correct: boolean, message: string, actual_answer: string }
    const [showAnswer, setShowAnswer] = useState(isInitiallySolved);
    const [isSolvedLocally, setIsSolvedLocally] = useState(isInitiallySolved); // Track solved status for this card

    // Store the actual correct answer if it's revealed or fetched.
    // This will now primarily come from riddle.correct_answers if available.
    const [revealedCorrectAnswer, setRevealedCorrectAnswer] = useState('');

    useEffect(() => {
        setIsSolvedLocally(isInitiallySolved);
        if (isInitiallySolved) {
            setShowAnswer(true);
            // If the riddle is initially solved (e.g., loaded from user progress),
            // and the riddle object itself contains correct_answers, use them.
            if (riddle.correct_answers && riddle.correct_answers.length > 0) {
                setRevealedCorrectAnswer(riddle.correct_answers.join(' / ')); // Join multiple correct answers
            } else if (!localStorage.getItem('access_token')) {
                // For guest users, if already solved, try to get from local storage if available
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
            // If the submission was correct, use the actual_answer from the backend response
            setRevealedCorrectAnswer(result.actual_answer || riddle.correct_answers.join(' / '));
        }
    };

    const handleShowAnswer = () => {
        setShowAnswer(true);
        setIsSolvedLocally(true); // Mark as solved when answer is manually shown

        // When "Show Answer" is clicked, use the correct_answers from the riddle object
        if (riddle.correct_answers && riddle.correct_answers.length > 0) {
            setRevealedCorrectAnswer(riddle.correct_answers.join(' / ')); // Join multiple answers for display

            // For guests, also update local storage if they manually reveal
            if (!localStorage.getItem('access_token')) {
                const storedGuestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                const updatedProgress = {
                    ...storedGuestProgress,
                    [riddle.id]: {
                        answered: true, // Marked as answered by showing
                        correct: true, // Treat as correct for showing the answer
                        answer: "[Revealed]", // Mark how it was answered
                        correctAnswer: riddle.correct_answers.join(' / ')
                    }
                };
                localStorage.setItem('guest_progress', JSON.stringify(updatedProgress));
            }
        } else {
            setRevealedCorrectAnswer("Answer not available."); // Fallback
        }
    };

    return (
        <div className={`riddle-card ${isSolvedLocally ? 'solved' : ''}`}>
            <h3>Riddle #{riddle.id.substring(0, 8)}...</h3>
            <p><strong>Japanese (Kanji):</strong> {riddle.text_kanji}</p>
            <p><strong>Japanese (Hiragana):</strong> {riddle.text_hiragana}</p>
            <p><strong>English:</strong> {riddle.english_text}</p>
            <p><strong>Category:</strong> {riddle.category} | <strong>Difficulty:</strong> {riddle.difficulty}</p>

            {isSolvedLocally ? (
                <p style={{ color: 'green', fontWeight: 'bold' }}>&#10003; Solved!</p>
            ) : null}

            {!isSolvedLocally ? (
                <div>
                    <input
                        type="text"
                        placeholder="Your answer (in English or Japanese)"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        style={{ display: 'block', marginBottom: '10px', width: 'calc(100% - 20px)', padding: '8px' }}
                    />
                    <button onClick={handleAnswerSubmit} style={{ marginRight: '10px', padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Submit Answer</button>
                    {!showAnswer && (
                        <button onClick={handleShowAnswer} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Show Answer
                        </button>
                    )}
                </div>
            ) : null}

            {showAnswer && (
                <p style={{ marginTop: '15px' }}>
                    <strong>Correct Answer:</strong> {revealedCorrectAnswer || "N/A (Backend did not provide)"}
                </p>
            )}

            {feedback && (
                <p className={`riddle-status ${feedback.correct ? 'correct' : 'incorrect'}`} style={{ marginTop: '10px', fontWeight: 'bold', color: feedback.correct ? 'green' : 'red' }}>
                    {feedback.message}
                </p>
            )}
        </div>
    );
}

export default RiddleCard;