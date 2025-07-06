import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';
import { getRiddles, submitAnswer } from '../services/api';
import RiddleCard from './RiddleCard';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const getGuestId = () => {
    let guestId = localStorage.getItem('guest_id');
    if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('guest_id', guestId);
    }
    return guestId;
};

function RiddlesPage() {
    const { currentUser, loading: authLoading, setCurrentUser } = useAuth();
    const [riddles, setRiddles] = useState([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState('');
    const [guestProgress, setGuestProgress] = useState({});
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState(null);
    const { t } = useTranslation(); // Use the hook

    const fetchAllRiddlesAndProgress = useCallback(async (signal) => {
        try {
            setPageLoading(true);
            setError('');

            const fetchedRiddles = await getRiddles(
                selectedCategory,
                selectedDifficulty,
                { signal: signal }
            );

            if (!currentUser) {
                const storedProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                setGuestProgress(storedProgress);
            }
            setRiddles(fetchedRiddles);
        } catch (err) {
            if (axios.isCancel(err)) {
                console.log('Riddle fetch aborted:', err.message);
            } else {
                console.error("Error fetching riddles:", err);
                setError(err.message || t('error_fetching_riddles', { message: err.message || 'unknown error' })); // Use translation
            }
        } finally {
            setPageLoading(false);
        }
    }, [currentUser, selectedCategory, selectedDifficulty, t]); // Add 't' to dependencies

    useEffect(() => {
        if (!authLoading) {
            const controller = new AbortController();
            const signal = controller.signal;

            fetchAllRiddlesAndProgress(signal);

            return () => {
                controller.abort();
            };
        }
    }, [fetchAllRiddlesAndProgress, authLoading]);

    const handleAnswerSubmission = async (riddleId, userAnswer) => {
        try {
            const result = await submitAnswer(riddleId, userAnswer);

            if (currentUser) {
                if (result.new_xp !== undefined && result.new_level !== undefined) {
                    setCurrentUser(prevUser => ({
                        ...prevUser,
                        xp: result.new_xp,
                        level: result.new_level,
                        solved_riddles_ids: result.correct
                            ? [...new Set([...(prevUser.solved_riddles_ids || []), riddleId])]
                            : prevUser.solved_riddles_ids
                    }));

                    if (result.level_up) {
                        alert(t('alert_level_up', { newLevel: result.new_level })); // Use translation
                    } else if (result.correct) {
                        alert(t('alert_xp_gained', { xpGained: result.xp_gained })); // Use translation
                    }
                }
            } else {
                const updatedProgress = {
                    ...guestProgress,
                    [riddleId]: {
                        answered: true,
                        correct: result.correct,
                        answer: userAnswer,
                        correctAnswer: result.correct ? result.actual_answer : undefined
                    }
                };
                setGuestProgress(updatedProgress);
                localStorage.setItem('guest_progress', JSON.stringify(updatedProgress));
            }

            return {
                correct: result.correct,
                message: result.message,
                actual_answer: result.actual_answer
            };
        } catch (err) {
            setError(err.message || t('riddle_submission_failed')); // Use translation
            return { correct: false, message: t('riddle_submission_failed') }; // Use translation
        }
    };

    const isRiddleSolved = (riddleId) => {
        if (currentUser) {
            return currentUser.solved_riddles_ids?.includes(riddleId);
        } else {
            return guestProgress[riddleId]?.correct;
        }
    };

    if (authLoading || pageLoading) return <p>{t('loading_riddles')}</p>; // Use translation
    if (error) return <p style={{ color: 'red' }}>{t('error_fetching_riddles', { message: error })}</p>; // Use translation
    if (riddles.length === 0) return <p>{t('no_riddles_available')}</p>; // Use translation

    return (
        <div>
            <h2>{currentUser ? t('your_riddles_title') : t('guest_riddles_title')}</h2> {/* Use translation */}
            <p>
                {currentUser
                    ? t('welcome_user', { username: currentUser.username, xp: currentUser.xp, level: currentUser.level }) // Use translation with interpolation
                    : t('guest_info', { guestId: getGuestId() }) // Use translation with interpolation
                }
            </p>
            {riddles.map((riddle) => (
                <RiddleCard
                    key={riddle.id}
                    riddle={riddle}
                    onSubmitAnswer={handleAnswerSubmission}
                    isInitiallySolved={isRiddleSolved(riddle.id)}
                />
            ))}
        </div>
    );
}

export default RiddlesPage;