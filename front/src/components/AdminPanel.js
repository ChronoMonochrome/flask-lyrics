import React, { useState, useEffect, useCallback } from 'react';
import { addRiddle, getAllRiddles, updateRiddle, deleteRiddle } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AdminPanel = () => {
    const { currentUser } = useAuth();
    const [riddles, setRiddles] = useState([]); // State to store all riddles
    const [selectedRiddleId, setSelectedRiddleId] = useState(''); // State for selected riddle to edit

    // Form states
    const [kanjiText, setKanjiText] = useState('');
    const [hiraganaText, setHiraganaText] = useState('');
    const [englishText, setEnglishText] = useState('');
    const [category, setCategory] = useState('General');
    const [difficulty, setDifficulty] = useState('Easy');
    const [xpReward, setXpReward] = useState(10);
    const [answers, setAnswers] = useState(''); // Comma-separated
    const [message, setMessage] = useState('');

    // Function to fetch riddles
    const fetchRiddles = useCallback(async () => {
        setMessage('');
        try {
			const response = await getAllRiddles();
			console.log('API Response data for getAllRiddles:', response.data); // Add this
			if (!Array.isArray(response.data)) { // Add a check
				console.error("Expected an array from /admin/riddles, but received:", response.data);
				setMessage('Error: Unexpected data format from server when fetching riddles.');
				setRiddles([]); // Ensure riddles is an array to prevent further errors
				return;
			}
			setRiddles(response.data);
            if (response.data.length > 0 && !selectedRiddleId) {
                // Optionally select the first riddle for editing by default
                // setSelectedRiddleId(response.data[0].id);
                // populateForm(response.data[0]); // If you want to auto-load the first one
            }
        } catch (error) {
            setMessage(`Error fetching riddles: ${error.response?.data?.message || error.message}`);
        }
    }, [selectedRiddleId]); // Add selectedRiddleId to dependencies to avoid stale closure if you uncomment auto-selection

    useEffect(() => {
        if (currentUser && currentUser.role === 'admin') {
            fetchRiddles();
        }
    }, [currentUser, fetchRiddles]);

    // Populate form fields when a riddle is selected
    useEffect(() => {
        if (selectedRiddleId) {
            const riddle = riddles.find(r => r.id === selectedRiddleId);
            if (riddle) {
                setKanjiText(riddle.text_kanji);
                setHiraganaText(riddle.text_hiragana);
                setEnglishText(riddle.english_text);
                setCategory(riddle.category);
                setDifficulty(riddle.difficulty);
                setXpReward(riddle.xp_reward);
                // Join correct_answers array back into a comma-separated string
                setAnswers(riddle.correct_answers.join(', '));
                setMessage(''); // Clear any previous messages
            }
        } else {
            // Clear form if no riddle is selected (e.g., for "Add New Riddle" mode)
            setKanjiText('');
            setHiraganaText('');
            setEnglishText('');
            setCategory('General');
            setDifficulty('Easy');
            setXpReward(10);
            setAnswers('');
            setMessage('');
        }
    }, [selectedRiddleId, riddles]);

    // Check for admin role
    if (!currentUser || currentUser.role !== 'admin') {
        return <p>You must be an admin to access this panel. (Current role: {currentUser ? currentUser.role : 'Guest'})</p>;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const answersArray = answers.split(',').map(s => s.trim()).filter(s => s);

        if (answersArray.length === 0) {
            setMessage('Please provide at least one accepted answer.');
            return;
        }

        const riddleData = {
            text_kanji: kanjiText,
            text_hiragana: hiraganaText,
            english_text: englishText,
            category: category,
            difficulty: difficulty,
            xp_reward: parseInt(xpReward),
            answers: answersArray
        };

        try {
            let response;
            if (selectedRiddleId) {
                // If a riddle is selected, update it
                response = await updateRiddle(selectedRiddleId, riddleData);
                setMessage(`Riddle updated: ${response.data.riddle.id}`);
            } else {
                // Otherwise, add a new riddle
                response = await addRiddle(riddleData);
                setMessage(`Riddle added: ${response.data.riddle.id}`);
            }

            // After success, re-fetch riddles to update the list and clear form
            fetchRiddles();
            setSelectedRiddleId(''); // Deselect current riddle to go back to "Add New" mode
            // Form fields will be cleared by the useEffect when selectedRiddleId becomes ''
        } catch (error) {
            setMessage(`Error: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleDelete = async () => {
        if (!selectedRiddleId) {
            setMessage('Please select a riddle to delete.');
            return;
        }
        if (window.confirm('Are you sure you want to delete this riddle? This action cannot be undone.')) {
            setMessage('');
            try {
                await deleteRiddle(selectedRiddleId);
                setMessage('Riddle deleted successfully!');
                fetchRiddles(); // Re-fetch riddles
                setSelectedRiddleId(''); // Deselect current riddle
            } catch (error) {
                setMessage(`Error deleting riddle: ${error.response?.data?.message || error.message}`);
            }
        }
    };

    const handleClearForm = () => {
        setSelectedRiddleId(''); // This will trigger useEffect to clear form
    };

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>Admin Panel: Manage Riddles</h2>

            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Select Riddle to Edit:</label>
                <select
                    value={selectedRiddleId}
                    onChange={(e) => setSelectedRiddleId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1em' }}
                >
                    <option value="">-- Add New Riddle --</option>
                    {riddles.map(riddle => (
                        <option key={riddle.id} value={riddle.id}>
                            {riddle.text_kanji.substring(0, 30)}... ({riddle.category} - {riddle.difficulty})
                        </option>
                    ))}
                </select>
                <button
                    onClick={handleClearForm}
                    style={{
                        marginTop: '10px',
                        padding: '8px 15px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9em'
                    }}
                >
                    Add New Riddle
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Riddle Text (Kanji/Kana):</label>
                    <textarea
                        value={kanjiText}
                        onChange={(e) => setKanjiText(e.target.value)}
                        required
                        rows="3"
                        style={inputStyle}
                    ></textarea>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Riddle Text (Hiragana Reading):</label>
                    <textarea
                        value={hiraganaText}
                        onChange={(e) => setHiraganaText(e.target.value)}
                        required
                        rows="3"
                        style={inputStyle}
                    ></textarea>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>English Translation:</label>
                    <textarea
                        value={englishText}
                        onChange={(e) => setEnglishText(e.target.value)}
                        required
                        rows="3"
                        style={inputStyle}
                    ></textarea>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Category:</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                        style={{ ...inputStyle, width: 'calc(100% - 16px)', maxWidth: '250px' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Difficulty:</label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        required
                        style={{ ...inputStyle, width: 'calc(100% - 16px)', maxWidth: '200px', padding: '10px' }}
                    >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                    </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>XP Reward:</label>
                    <input
                        type="number"
                        value={xpReward}
                        onChange={(e) => setXpReward(parseInt(e.target.value))}
                        min="1"
                        required
                        style={{ ...inputStyle, width: 'calc(100% - 16px)', maxWidth: '100px' }}
                    />
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Accepted Answers (comma-separated):</label>
                    <input
                        type="text"
                        value={answers}
                        onChange={(e) => setAnswers(e.target.value)}
                        placeholder="e.g., くだもの,果物"
                        required
                        style={inputStyle}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={submitButtonStyle}>
                        {selectedRiddleId ? 'Update Riddle' : 'Add New Riddle'}
                    </button>
                    {selectedRiddleId && (
                        <button type="button" onClick={handleDelete} style={deleteButtonStyle}>
                            Delete Riddle
                        </button>
                    )}
                </div>
            </form>
            {message && <p style={{ marginTop: '20px', color: message.startsWith('Error') ? 'red' : 'green', fontWeight: 'bold' }}>{message}</p>}
        </div>
    );
};

// Basic inline styles for better appearance
const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box',
    fontSize: '1em'
};

const submitButtonStyle = {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
    flexGrow: 1
};

const deleteButtonStyle = {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
    flexGrow: 1
};

export default AdminPanel;