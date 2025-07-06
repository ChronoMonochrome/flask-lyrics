import React, { useState, useEffect, useCallback, useRef } from 'react'; // Import useRef
import { getRandomRiddle, submitAnswer, markRiddleCorrect, getRiddleAnswer } from '../services/api';
import FuriganaText from './FuriganaText';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const RandomRiddlePage = () => {
    const { currentUser, setCurrentUser } = useAuth();
    const [riddle, setRiddle] = useState(null);
    const [answerInput, setAnswerInput] = useState('');
    const [message, setMessage] = useState('');
    const [solvedLocally, setSolvedLocally] = useState(false);
    const [showHiragana, setShowHiragana] = useState(false);
    const [showEnglishTranslation, setShowEnglishTranslation] = useState(false);
    const [showForcedAnswer, setShowForcedAnswer] = useState(false);
    const [revealedCorrectAnswer, setRevealedCorrectAnswer] = useState('');
    const [notification, setNotification] = useState({ type: '', message: '' });
    // NEW STATE: Track if the last submission was incorrect
    const [submittedIncorrectAnswer, setSubmittedIncorrectAnswer] = useState(false);
    const { t } = useTranslation();

    // Use refs to store timeout IDs
    const notificationTimerRef = useRef(null);
    const nextRiddleTimerRef = useRef(null);

    const showNotification = useCallback((type, msg, duration = 3000) => {
        // Clear any existing notification timer
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
        }
        setNotification({ type, message: msg });
        notificationTimerRef.current = setTimeout(() => {
            setNotification({ type: '', message: '' });
            notificationTimerRef.current = null;
        }, duration);
    }, []);

    const fetchNewRiddle = async () => {
        // Clear any pending timers when fetching a new riddle
        if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
        if (nextRiddleTimerRef.current) clearTimeout(nextRiddleTimerRef.current);

        setRiddle(null);
        setAnswerInput('');
        setMessage('');
        setSolvedLocally(false);
        setShowHiragana(false);
        setSubmittedIncorrectAnswer(false); // RESET new state when fetching a new riddle
        setShowEnglishTranslation(false);
        setShowForcedAnswer(false);
        setRevealedCorrectAnswer('');
        setNotification({ type: '', message: '' });

        try {
            const response = await getRandomRiddle();
            setRiddle(response);
            console.log("Fetched new riddle:", response);

            if (currentUser && currentUser.solved_riddles_ids?.includes(response.id)) {
                setSolvedLocally(true);
                setMessage(t('already_solved_riddle'));
                setShowHiragana(true);
                setShowEnglishTranslation(true);
                try {
                    const answers = await getRiddleAnswer(response.id);
                    console.log("Answers for solved riddle:", answers);
                    if (answers && answers.length > 0) {
                        setRevealedCorrectAnswer(answers.join(' / '));
                    } else {
                        console.warn("Answers array for solved riddle is empty or null/undefined.");
                        setRevealedCorrectAnswer(t('answer_not_available'));
                    }
                } catch (ansError) {
                    console.error("Failed to fetch correct answer for already solved riddle:", ansError);
                    setRevealedCorrectAnswer(t('answer_not_available'));
                }
            }
        } catch (error) {
            console.error("Error in fetchNewRiddle:", error);
            setMessage(t('error_fetching_riddles', { message: error.response?.data?.message || error.message }));
        }
    };

    useEffect(() => {
        fetchNewRiddle();
        // Cleanup function for useEffect
        return () => {
            if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
            if (nextRiddleTimerRef.current) clearTimeout(nextRiddleTimerRef.current);
        };
    }, [currentUser, t]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const response = await submitAnswer(riddle.id, answerInput);
            setMessage(response.message);
            console.log("Submit answer response:", response);

            if (response.solved) {
                setSolvedLocally(true);
                setSubmittedIncorrectAnswer(false); // When correctly solved, hide the "I was correct!" button
                setShowHiragana(true);
                setShowEnglishTranslation(true);
                
                // Use the actual_answer from the submit response if available, otherwise fetch
                if (response.actual_answer) {
                    setRevealedCorrectAnswer(response.actual_answer);
                    console.log("Answer from submit response:", response.actual_answer);
                } else {
                    try {
                        const answers = await getRiddleAnswer(riddle.id);
                        console.log("Answers after submission (fetched):", answers);
                        if (answers && answers.length > 0) {
                            setRevealedCorrectAnswer(answers.join(' / '));
                        } else {
                            console.warn("Answers array after submission is empty or null/undefined.");
                            setRevealedCorrectAnswer(t('answer_not_available'));
                        }
                    } catch (ansError) {
                        console.error("Failed to fetch correct answer after submission:", ansError);
                        setRevealedCorrectAnswer(t('answer_not_available'));
                    }
                }

                if (currentUser) {
                    const prevLevel = currentUser.level;
                    setCurrentUser(prevUser => ({
                        ...prevUser,
                        xp: response.new_xp,
                        level: response.new_level,
                        solved_riddles_ids: [...new Set([...(prevUser.solved_riddles_ids || []), riddle.id])]
                    }));

                    let notificationMessage = '';
                    if (response.new_level > prevLevel) {
                        notificationMessage = t('alert_level_up', { newLevel: response.new_level });
                    } else if (response.xp_gained > 0) {
                        notificationMessage = t('alert_xp_gained', { xpGained: response.xp_gained });
                    } else {
                        notificationMessage = response.message;
                    }
                    showNotification('success', notificationMessage);

                } else { // Guest user success logic
                    const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                    guestProgress[riddle.id] = { answered: true, correct: true, answer: answerInput, correctAnswer: response.actual_answer || revealedCorrectAnswer };
                    localStorage.setItem('guest_progress', JSON.stringify(guestProgress));
                    showNotification('success', response.message);
                }

                // Delay fetching next riddle to allow user to see notification
                nextRiddleTimerRef.current = setTimeout(() => {
                    fetchNewRiddle();
                }, 2500); // Adjust delay as needed (e.g., 2500ms = 2.5 seconds)

            } else { // Incorrect answer
                setSubmittedIncorrectAnswer(true);
                showNotification('error', response.message);
            }
        } catch (error) {
            console.error("Error in handleSubmit:", error);
            showNotification('error', t('riddle_submission_failed'));
            setMessage(t('riddle_submission_failed'));
        }
    };

    const handleMarkCorrect = async () => {
        setMessage('');
        try {
            const response = await markRiddleCorrect(riddle.id);
            setMessage(response.message);
            setSolvedLocally(true);
            setSubmittedIncorrectAnswer(false); // Hide the "I was correct!" button after it's been pressed
            setShowHiragana(true);
            setShowEnglishTranslation(true);
            console.log("Mark correct response:", response);

            // After marking correct, fetch the correct answer using the new route
            // Or use response.actual_answer if provided by backend (recommended)
            if (response.actual_answer) {
                setRevealedCorrectAnswer(response.actual_answer);
            } else {
                try {
                    const answers = await getRiddleAnswer(riddle.id);
                    console.log("Answers after marking correct:", answers);
                    if (answers && answers.length > 0) {
                        setRevealedCorrectAnswer(answers.join(' / '));
                    } else {
                        console.warn("Answers array after marking correct is empty or null/undefined.");
                        setRevealedCorrectAnswer(t('answer_not_available'));
                    }
                } catch (ansError) {
                    console.error("Failed to fetch correct answer after marking correct:", ansError);
                    setRevealedCorrectAnswer(t('answer_not_available'));
                }
            }


            if (currentUser) {
                const prevLevel = currentUser.level;
                setCurrentUser(prevUser => ({
                    ...prevUser,
                    xp: response.new_xp,
                    level: response.new_level,
                    solved_riddles_ids: [...new Set([...(prevUser.solved_riddles_ids || []), riddle.id])]
                }));
                let notificationMessage = '';
                if (response.new_level > prevLevel) {
                    notificationMessage = t('alert_level_up', { newLevel: response.new_level });
                } else if (response.xp_gained > 0) {
                    notificationMessage = t('alert_riddle_marked_correct', { xpGained: response.xp_gained });
                } else {
                    notificationMessage = response.message;
                }
                showNotification('success', notificationMessage);
            } else { // Guest user mark correct logic - no XP is awarded on backend, only local state updates
                const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                guestProgress[riddle.id] = { answered: true, correct: true, answer: revealedCorrectAnswer || '[N/A]' };
                localStorage.setItem('guest_progress', JSON.stringify(guestProgress));
                showNotification('success', response.message);
            }

            // Delay fetching next riddle after manually marking correct
            nextRiddleTimerRef.current = setTimeout(() => {
                fetchNewRiddle();
            }, 2500); // Adjust delay as needed
        } catch (error) {
            console.error("Error in handleMarkCorrect:", error);
            showNotification('error', t('error_marking_correct', { message: error.response?.data?.message || error.message }));
            setMessage(t('error_marking_correct', { message: error.response?.data?.message || error.message }));
        }
    };

    const handleToggleShowAnswer = async () => {
        // We only want to set showForcedAnswer if riddle is NOT solved locally and user wants to reveal it.
        // If it's already solved locally (meaning they got it right, or manually marked it),
        // we keep showForcedAnswer as false, but still show the revealedCorrectAnswer.
        if (!solvedLocally) {
            setShowForcedAnswer(prev => !prev);
        }
        
        console.log("Showing answer toggle triggered. Current riddle:", riddle);

        // This condition is for fetching the answer if it's about to be shown AND not already revealed
        if (!showForcedAnswer && !revealedCorrectAnswer) {
            setMessage(t('answer_shown_no_xp')); // Inform user about no XP
            try {
                const answers = await getRiddleAnswer(riddle.id); // CALL THE NEW API HERE
                console.log("Answers from handleToggleShowAnswer (fetched):", answers);
                if (answers && answers.length > 0) {
                    setRevealedCorrectAnswer(answers.join(' / '));
                } else {
                    console.warn("Answers array from handleToggleShowAnswer is empty or null/undefined.");
                    setRevealedCorrectAnswer(t('answer_not_available'));
                }
            } catch (error) {
                console.error("Failed to fetch answer in handleToggleShowAnswer:", error);
                setRevealedCorrectAnswer(t('answer_not_available'));
            }
        } else if (showForcedAnswer) { // If we are about to hide the answer
            setMessage('');
            // We should NOT clear revealedCorrectAnswer here. If the user got it wrong
            // and then revealed it, the button should remain, and the answer too.
            // setRevealedCorrectAnswer(''); // REMOVE THIS LINE
        }
    };

    if (!riddle) {
        return <div>{t('loading_riddles')}</div>;
    }

    // Determine when to show the "I was correct! (Give me XP)" button
    // Show if a user submitted an incorrect answer and the riddle isn't solved yet (either by guessing or marking correct)
    const shouldShowMarkCorrectButton = submittedIncorrectAnswer && !solvedLocally;

    return (
        <div className="random-riddle-page">
            <h2>{t('random_riddle_title')}</h2>

            {notification.message && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}

            <div className="riddle-card">
                <FuriganaText kanjiText={riddle.text_kanji} />

                {showHiragana && (
                    <p className="hiragana-hint">
                        <strong>{t('hiragana_reading')}</strong> {riddle.text_hiragana}
                    </p>
                )}
                {showEnglishTranslation && (
                    <p className="english-translation">
                        <strong>{t('english_translation_label')}</strong> {riddle.english_text}
                    </p>
                )}

                {/* Display the revealed answer if forced OR solvedLocally */}
                {((showForcedAnswer && revealedCorrectAnswer) || (solvedLocally && revealedCorrectAnswer)) && (
                    <p className="correct-answer-display">
                        <strong>{t('correct_answer_label')}</strong> {revealedCorrectAnswer}
                    </p>
                )}

                <div className="button-group">
                    <button onClick={() => setShowHiragana(!showHiragana)}>
                        {showHiragana ? t('hide_reading_button') : t('show_reading_button')}
                    </button>
                    <button onClick={() => setShowEnglishTranslation(!showEnglishTranslation)}>
                        {showEnglishTranslation ? t('hide_translation_button') : t('show_translation_button')}
                    </button>
                    {/* The "show/hide answer" button should be disabled if already solved,
                        but it might still be useful to toggle if they got it wrong. */}
                    <button onClick={handleToggleShowAnswer} disabled={solvedLocally}>
                        {showForcedAnswer ? t('hide_answer_button') : t('show_answer_button')}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder={t('answer_input_placeholder_jp')}
                    disabled={solvedLocally || showForcedAnswer}
                />
                <button type="submit" disabled={solvedLocally || showForcedAnswer}>{t('submit_answer_button')}</button>
            </form>

            {message && <p className="status-message">{message}</p>}

            {/* Display "I was correct!" button based on new logic */}
            {shouldShowMarkCorrectButton && (
                <button onClick={handleMarkCorrect} style={{ marginTop: '10px' }}>
                    {t('mark_correct_button')}
                </button>
            )}

            {riddle.xp_reward && <p>{t('xp_reward_label', { xp: riddle.xp_reward })}</p>}

            {/* Only show 'Get Another Riddle' if NOT currently showing a success notification
                This prevents the user from clicking away before seeing the success message and
                the automatic transition starts. */}
            {!notification.message || notification.type !== 'success' ? (
                <button onClick={fetchNewRiddle} style={{ marginTop: '20px' }}>{t('get_another_riddle_button')}</button>
            ) : null}
        </div>
    );
};

export default RandomRiddlePage;