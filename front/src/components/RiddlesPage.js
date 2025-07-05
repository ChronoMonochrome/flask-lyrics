// front/src/components/RiddlesPage.js
import React, { useState, useEffect } from 'react';
import { getRiddles, submitAnswer } from '../services/api';
import RiddleCard from './RiddleCard';

// Helper to generate a unique guest ID
const getGuestId = () => {
  let guestId = localStorage.getItem('guest_id');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('guest_id', guestId);
  }
  return guestId;
};

function RiddlesPage({ token }) {
  const [riddles, setRiddles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guestProgress, setGuestProgress] = useState({}); // Stores {riddleId: {answered: true, correct: true, answer: 'x'}}

  useEffect(() => {
    const fetchRiddles = async () => {
      try {
        setLoading(true);
        const fetchedRiddles = await getRiddles(token); // Pass token if logged in
        setRiddles(fetchedRiddles);

        // Load guest progress if applicable
        if (!token) { // Only for guests
          const storedProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
          setGuestProgress(storedProgress);
        }

      } catch (err) {
        setError(err.message || 'Failed to fetch riddles.');
      } finally {
        setLoading(false);
      }
    };

    fetchRiddles();
  }, [token]); // Re-fetch if token changes (login/logout)

  const handleAnswerSubmission = async (riddleId, userAnswer) => {
    try {
      const result = await submitAnswer(riddleId, userAnswer, token); // Pass token for authenticated users

      if (!token) { // If guest user, save progress locally
        const updatedProgress = {
          ...guestProgress,
          [riddleId]: { answered: true, correct: result.correct, answer: userAnswer }
        };
        setGuestProgress(updatedProgress);
        localStorage.setItem('guest_progress', JSON.stringify(updatedProgress));
      }

      return result; // Return result to RiddleCard for feedback
    } catch (err) {
      setError(err.message || 'Failed to submit answer.');
      return { correct: false, message: 'Submission failed.' };
    }
  };

  if (loading) return <p>Loading riddles...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (riddles.length === 0) return <p>No riddles available yet. Check back later!</p>;

  return (
    <div>
      <h2>{token ? "Your Riddles" : "Riddles (Guest Mode)"}</h2>
      <p>
        {token
          ? "You are logged in. Your progress will be saved!"
          : `You are playing as a guest (ID: ${getGuestId()}). Your progress is saved locally.`
        }
      </p>
      {riddles.map((riddle) => (
        <RiddleCard
          key={riddle.id}
          riddle={riddle}
          onSubmitAnswer={handleAnswerSubmission}
        />
      ))}
    </div>
  );
}

export default RiddlesPage;
