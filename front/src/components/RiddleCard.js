// front/src/components/RiddleCard.js
import React, { useState } from 'react';

function RiddleCard({ riddle, onSubmitAnswer }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // { correct: boolean, message: string }
  const [showAnswer, setShowAnswer] = useState(false);

  const handleAnswerSubmit = async () => {
    setFeedback(null);
    const result = await onSubmitAnswer(riddle.id, userAnswer);
    setFeedback(result);
    if (result.correct) {
      setShowAnswer(true); // Show the correct answer after successful guess
    }
  };

  return (
    <div className="riddle-card">
      <h3>Riddle #{riddle.id}</h3>
      <p><strong>Japanese:</strong> {riddle.japanese_text}</p>
      {riddle.furigana && <p><strong>Furigana:</strong> {riddle.furigana}</p>}
      <p><strong>English:</strong> {riddle.english_text}</p>
      <p><strong>Category:</strong> {riddle.category} | <strong>Difficulty:</strong> {riddle.difficulty}</p>

      {!showAnswer ? (
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
      {!showAnswer && (
        <button onClick={() => setShowAnswer(true)} style={{marginTop: '10px', backgroundColor: '#6c757d'}}>
          Show Answer
        </button>
      )}
    </div>
  );
}

export default RiddleCard;