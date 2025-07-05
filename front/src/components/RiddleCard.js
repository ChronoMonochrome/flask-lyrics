// front/src/components/RiddleCard.js
import React, { useState, useEffect } from 'react';

// Added isInitiallySolved prop
function RiddleCard({ riddle, onSubmitAnswer, isInitiallySolved }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // { correct: boolean, message: string }
  // Initialize showAnswer based on isInitiallySolved prop
  const [showAnswer, setShowAnswer] = useState(isInitiallySolved);
  const [isSolvedLocally, setIsSolvedLocally] = useState(isInitiallySolved); // Track solved status for this card

  // Update internal solved state if prop changes (e.g., after a submission)
  useEffect(() => {
    setIsSolvedLocally(isInitiallySolved);
    if (isInitiallySolved) {
      setShowAnswer(true); // If already solved, show the answer
    }
  }, [isInitiallySolved]);


  const handleAnswerSubmit = async () => {
    setFeedback(null);
    const result = await onSubmitAnswer(riddle.id, userAnswer);
    setFeedback(result);
    if (result.correct) {
      setIsSolvedLocally(true); // Mark as solved
      setShowAnswer(true); // Show the correct answer after successful guess
    }
  };

  return (
    <div className={`riddle-card ${isSolvedLocally ? 'solved' : ''}`}> {/* Add 'solved' class */}
      <h3>Riddle #{riddle.id}</h3>
      <p><strong>Japanese:</strong> {riddle.japanese_text}</p>
      {riddle.furigana && <p><strong>Furigana:</strong> {riddle.furigana}</p>}
      <p><strong>English:</strong> {riddle.english_text}</p>
      <p><strong>Category:</strong> {riddle.category} | <strong>Difficulty:</strong> {riddle.difficulty}</p>

      {isSolvedLocally ? (
        <p style={{ color: 'green', fontWeight: 'bold' }}>&#10003; Solved!</p>
      ) : null}

      {!isSolvedLocally && !showAnswer ? ( // Only show input if not solved and not showing answer
        <div>
          <input
            type="text"
            placeholder="Your answer (in English or Japanese)"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
          />
          <button onClick={handleAnswerSubmit}>Submit Answer</button>
        </div>
      ) : (
        <p style={{marginTop: '15px'}}>
          <strong>Correct Answer:</strong> {riddle.answer || "N/A (Backend should provide this)"}
        </p>
      )}

      {feedback && (
        <p className={`riddle-status ${feedback.correct ? 'correct' : 'incorrect'}`}>
          {feedback.message}
        </p>
      )}

      {/* Optionally allow revealing answer, even if incorrect or not attempted */}
      {!showAnswer && !isSolvedLocally && ( // Only show "Show Answer" if not solved and not already shown
        <button onClick={() => setShowAnswer(true)} style={{marginTop: '10px', backgroundColor: '#6c757d'}}>
          Show Answer
        </button>
      )}
    </div>
  );
}

export default RiddleCard;