// front/src/components/RiddlesPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { getRiddles, submitAnswer } from '../services/api';
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
  const { currentUser, setCurrentUser } = useAuth(); // Get user and setter from context
  const [riddles, setRiddles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // guestProgress will store {riddleId: {answered: true, correct: true, answer: 'x'}}
  const [guestProgress, setGuestProgress] = useState({});

  // Function to fetch riddles and user progress
  const fetchAllRiddlesAndProgress = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedRiddles = await getRiddles(); // No token needed here, axios interceptor handles it

      if (!currentUser) { // Guest user logic
        const storedProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
        setGuestProgress(storedProgress);
      }
      setRiddles(fetchedRiddles);
    } catch (err) {
      setError(err.message || 'Failed to fetch riddles.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]); // Re-run if currentUser changes (login/logout)

  useEffect(() => {
    fetchAllRiddlesAndProgress();
  }, [fetchAllRiddlesAndProgress]); // Dependency on the memoized function

  const handleAnswerSubmission = async (riddleId, userAnswer) => {
    try {
      const result = await submitAnswer(riddleId, userAnswer); // Axios interceptor handles token

      if (currentUser) { // Logged-in user: update context with new XP/level
        if (result.new_xp !== undefined && result.new_level !== undefined) {
          // Backend should return updated user data on answer submission
          setCurrentUser(prevUser => ({
            ...prevUser,
            xp: result.new_xp,
            level: result.new_level,
            // Backend should also send solved riddle ID if it's new
            solved_riddles_ids: result.correct
              ? [...new Set([...(prevUser.solved_riddles_ids || []), riddleId])] // Add if correct
              : prevUser.solved_riddles_ids
          }));

          // Optionally trigger a notification for XP/level up
          if (result.level_up) { // Assuming backend sends 'level_up: true'
            alert(`Congratulations! You leveled up to Level ${result.new_level}!`);
          } else if (result.correct) {
            alert(`Correct! You gained ${result.xp_gained} XP!`);
          }
        }
      } else { // Guest user: save progress locally
        const updatedProgress = {
          ...guestProgress,
          [riddleId]: { answered: true, correct: result.correct, answer: userAnswer,
            // For guest, we also need to store the actual answer from the backend if it's correct
            correctAnswer: result.correct ? result.actual_answer : undefined
          }
        };
        setGuestProgress(updatedProgress);
        localStorage.setItem('guest_progress', JSON.stringify(updatedProgress));
      }

      // Re-fetch riddles to update their 'solved' status if necessary,
      // or just update the state of the individual riddle
      // For now, we'll rely on the `isInitiallySolved` prop and the update via `setCurrentUser`.
      // A full re-fetch ensures all riddle statuses are fresh.
      // fetchAllRiddlesAndProgress(); // Uncomment if you prefer a full refresh of all riddles

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
      // Assuming currentUser.solved_riddles_ids is an array of riddle IDs
      return currentUser.solved_riddles_ids?.includes(riddleId);
    } else {
      // Check guest progress
      return guestProgress[riddleId]?.correct;
    }
  };

  if (loading) return <p>Loading riddles...</p>;
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
          isInitiallySolved={isRiddleSolved(riddle.id)} // Pass solved status
        />
      ))}
    </div>
  );
}

export default RiddlesPage;