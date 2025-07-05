// src/components/RiddlesPage.js
import axios from 'axios'; // Keep this import for axios.isCancel
import React, { useState, useEffect, useCallback } from 'react';
import { getRiddles, submitAnswer } from '../services/api'; // Ensure getRiddles is imported
import RiddleCard from './RiddleCard';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

// Helper to generate a unique guest ID (already good)
const getGuestId = () => {
    let guestId = localStorage.getItem('guest_id');
    if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('guest_id', guestId);
    }
    return guestId;
};

function RiddlesPage() {
    // Get currentUser, the `loading` state, and setCurrentUser from AuthContext
    const { currentUser, loading: authLoading, setCurrentUser } = useAuth(); // <-- Add setCurrentUser here
    const [riddles, setRiddles] = useState([]);
    const [pageLoading, setPageLoading] = useState(true); // Separate loading state for this page's data fetch
    const [error, setError] = useState('');
    const [guestProgress, setGuestProgress] = useState({});

    // Add state for filters (even if not used in UI yet, ensures the function signature is matched)
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState(null);


    // Function to fetch riddles and user progress
    // Updated to accept signal and filter parameters
    const fetchAllRiddlesAndProgress = useCallback(async (signal) => {
        try {
            setPageLoading(true); // Start page-specific loading
            setError(''); // Clear any previous errors

            // Pass category, difficulty, and then the signal in an object
            const fetchedRiddles = await getRiddles(
                selectedCategory,    // Pass category (can be null)
                selectedDifficulty,  // Pass difficulty (can be null)
                { signal: signal }   // Pass axios config with signal
            );

            if (!currentUser) { // Guest user logic
                const storedProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                setGuestProgress(storedProgress);
            }
            setRiddles(fetchedRiddles);
        } catch (err) {
            if (axios.isCancel(err)) {
                console.log('Riddle fetch aborted:', err.message);
            } else {
                console.error("Error fetching riddles:", err);
                setError(err.message || 'Failed to fetch riddles.');
            }
        } finally {
            setPageLoading(false); // End page-specific loading
        }
    }, [currentUser, selectedCategory, selectedDifficulty]); // Dependencies for useCallback

    useEffect(() => {
        // *** CRUCIAL: Only fetch riddles if AuthContext has finished its initial loading ***
        if (!authLoading) {
            const controller = new AbortController();
            const signal = controller.signal;

            fetchAllRiddlesAndProgress(signal);

            return () => {
                controller.abort();
            };
        }
    }, [fetchAllRiddlesAndProgress, authLoading]); // Dependency on both fetch function and authLoading

    const handleAnswerSubmission = async (riddleId, userAnswer) => {
        try {
            const result = await submitAnswer(riddleId, userAnswer);

            if (currentUser) { // Logged-in user: update context with new XP/level
                if (result.new_xp !== undefined && result.new_level !== undefined) {
                    setCurrentUser(prevUser => ({
                        ...prevUser,
                        xp: result.new_xp,
                        level: result.new_level,
                        // Update solved riddles
                        solved_riddles_ids: result.correct
                            ? [...new Set([...(prevUser.solved_riddles_ids || []), riddleId])]
                            : prevUser.solved_riddles_ids
                    }));

                    if (result.level_up) { // Assuming backend sends 'level_up: true'
                        alert(`Congratulations! You leveled up to Level ${result.new_level}!`);
                    } else if (result.correct) {
                        alert(`Correct! You gained ${result.xp_gained} XP!`);
                    }
                }
            } else { // Guest user: save progress locally
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
                actual_answer: result.actual_answer // Backend should send this for solved riddles
            };
        } catch (err) {
            setError(err.message || 'Failed to submit answer.');
            return { correct: false, message: 'Submission failed.' };
        }
    };

    // Helper to check if a riddle is solved (for rendering)
    const isRiddleSolved = (riddleId) => {
        if (currentUser) {
            return currentUser.solved_riddles_ids?.includes(riddleId);
        } else {
            return guestProgress[riddleId]?.correct;
        }
    };

    // Display loading state from either AuthContext or this page's fetch
    if (authLoading || pageLoading) return <p>Loading riddles...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (riddles.length === 0) return <p>No riddles available yet. Check back later!</p>;

    return (
        <div>
            <h2>{currentUser ? "Your Riddles" : "Riddles (Guest Mode)"}</h2>
            <p>
                {currentUser
                    ? `Welcome, ${currentUser.username}! Your current XP: ${currentUser.xp}, Level: ${currentUser.level}.`
                    : `You are playing as a guest (ID: ${getGuestId()}). Your progress is saved locally.`
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