// src/components/AdminPanel.js
import React, { useState } from 'react';
import { addRiddle } from '../services/api'; // Use the new addRiddle API
import { useAuth } from '../contexts/AuthContext';

const AdminPanel = () => {
    const { currentUser } = useAuth();
    const [kanjiText, setKanjiText] = useState('');
    const [hiraganaText, setHiraganaText] = useState('');
    const [englishText, setEnglishText] = useState(''); // NEW: State for English translation
    const [category, setCategory] = useState('General'); // NEW: State for Category
    const [difficulty, setDifficulty] = useState('Easy'); // NEW: State for Difficulty
    const [xpReward, setXpReward] = useState(10);
    const [answers, setAnswers] = useState(''); // Comma-separated
    const [message, setMessage] = useState('');

    // Check for admin role
    if (!currentUser || currentUser.role !== 'admin') {
        return <p>You must be an admin to access this panel. (Current role: {currentUser ? currentUser.role : 'Guest'})</p>;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const answersArray = answers.split(',').map(s => s.trim()).filter(s => s);

        // Basic validation for answers
        if (answersArray.length === 0) {
            setMessage('Please provide at least one accepted answer.');
            return;
        }

        try {
            const response = await addRiddle({ // Use the addRiddle API call
                text_kanji: kanjiText,
                text_hiragana: hiraganaText,
                english_text: englishText, // NEW: Include English text
                category: category,         // NEW: Include Category
                difficulty: difficulty,     // NEW: Include Difficulty
                xp_reward: parseInt(xpReward),
                answers: answersArray
            });
            // Based on your api.py, the response for add_riddle is:
            // return {'message': 'Riddle added successfully', 'riddle': marshaled_new_riddle}, 201
            setMessage(`Riddle added: ${response.riddle.id}`);
            setKanjiText('');
            setHiraganaText('');
            setEnglishText(''); // Clear English text
            setCategory('General'); // Reset category
            setDifficulty('Easy'); // Reset difficulty
            setXpReward(10);
            setAnswers('');
        } catch (error) {
            setMessage(`Error adding riddle: ${error.response?.data?.message || error.message}`);
        }
    };

    return (
        <div>
            <h2>Add New Riddle (Admin)</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '10px' }}> {/* Added some inline style for spacing */}
                    <label style={{ display: 'block', marginBottom: '5px' }}>Riddle Text (Kanji/Kana):</label>
                    <textarea
                        value={kanjiText}
                        onChange={(e) => setKanjiText(e.target.value)}
                        required
                        rows="4" // Make textarea taller
                        cols="50" // Make textarea wider
                        style={{ width: '100%', maxWidth: '400px', padding: '8px', boxSizing: 'border-box' }} // Basic styling
                    ></textarea>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Riddle Text (Hiragana Reading):</label>
                    <textarea
                        value={hiraganaText}
                        onChange={(e) => setHiraganaText(e.target.value)}
                        required
                        rows="4" // Make textarea taller
                        cols="50" // Make textarea wider
                        style={{ width: '100%', maxWidth: '400px', padding: '8px', boxSizing: 'border-box' }}
                    ></textarea>
                </div>
                <div style={{ marginBottom: '10px' }}> {/* NEW: English Translation */}
                    <label style={{ display: 'block', marginBottom: '5px' }}>English Translation:</label>
                    <textarea
                        value={englishText}
                        onChange={(e) => setEnglishText(e.target.value)}
                        required
                        rows="4" // Make textarea taller
                        cols="50" // Make textarea wider
                        style={{ width: '100%', maxWidth: '400px', padding: '8px', boxSizing: 'border-box' }}
                    ></textarea>
                </div>
                <div style={{ marginBottom: '10px' }}> {/* NEW: Category Input */}
                    <label style={{ display: 'block', marginBottom: '5px' }}>Category:</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                        style={{ width: '100%', maxWidth: '200px', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: '10px' }}> {/* NEW: Difficulty Dropdown */}
                    <label style={{ display: 'block', marginBottom: '5px' }}>Difficulty:</label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        required
                        style={{ padding: '8px' }}
                    >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                    </select>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>XP Reward:</label>
                    <input
                        type="number"
                        value={xpReward}
                        onChange={(e) => setXpReward(parseInt(e.target.value))} // Ensure it's parsed as int
                        min="1"
                        required
                        style={{ width: '100%', maxWidth: '100px', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Accepted Answers (comma-separated):</label>
                    <input
                        type="text"
                        value={answers}
                        onChange={(e) => setAnswers(e.target.value)}
                        placeholder="e.g., くだもの,果物"
                        required
                        style={{ width: '100%', maxWidth: '400px', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>Add Riddle</button>
            </form>
            {message && <p style={{ marginTop: '15px', color: message.startsWith('Error') ? 'red' : 'green' }}>{message}</p>}
        </div>
    );
};

export default AdminPanel;