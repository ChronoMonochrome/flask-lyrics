import React, { useState, useEffect, useCallback } from 'react';
import { addRiddle, getAllRiddles, updateRiddle, deleteRiddle } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const AdminPanel = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation(); // Initialize useTranslation
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
                setMessage(t('admin_error_unexpected_data'));
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
            setMessage(t('admin_error_fetching_riddles', { message: error.response?.data?.message || error.message }));
        }
    }, [selectedRiddleId, t]); // Add t to dependencies

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
        return <p>{t('admin_access_denied', { role: currentUser ? currentUser.role : 'Guest' })}</p>;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const answersArray = answers.split(',').map(s => s.trim()).filter(s => s);

        if (answersArray.length === 0) {
            setMessage(t('admin_no_answer_provided'));
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
                setMessage(t('admin_riddle_updated', { id: response.data.riddle.id }));
            } else {
                // Otherwise, add a new riddle
                response = await addRiddle(riddleData);
                setMessage(t('admin_riddle_added', { id: response.data.riddle.id }));
            }

            // After success, re-fetch riddles to update the list and clear form
            fetchRiddles();
            setSelectedRiddleId(''); // Deselect current riddle to go back to "Add New" mode
            // Form fields will be cleared by the useEffect when selectedRiddleId becomes ''
        } catch (error) {
            setMessage(t('admin_error_action', { action: selectedRiddleId ? 'updating' : 'adding', message: error.response?.data?.message || error.message }));
        }
    };

    const handleDelete = async () => {
        if (!selectedRiddleId) {
            setMessage(t('admin_select_riddle_to_delete'));
            return;
        }
        if (window.confirm(t('admin_confirm_delete'))) {
            setMessage('');
            try {
                await deleteRiddle(selectedRiddleId);
                setMessage(t('admin_riddle_deleted'));
                fetchRiddles(); // Re-fetch riddles
                setSelectedRiddleId(''); // Deselect current riddle
            } catch (error) {
                setMessage(t('admin_error_deleting_riddle', { message: error.response?.data?.message || error.message }));
            }
        }
    };

    const handleClearForm = () => {
        setSelectedRiddleId(''); // This will trigger useEffect to clear form
    };

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>{t('admin_panel_title')}</h2>

            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>{t('admin_select_riddle_to_edit')}</label>
                <select
                    value={selectedRiddleId}
                    onChange={(e) => setSelectedRiddleId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1em' }}
                >
                    <option value="">{t('admin_add_new_riddle_option')}</option>
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
                    {t('admin_add_riddle_button')}
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('admin_riddle_text_input')}</label>
                    <textarea
                        value={kanjiText}
                        onChange={(e) => setKanjiText(e.target.value)}
                        required
                        rows="3"
                        style={inputStyle}
                    ></textarea>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('admin_hiragana_text_input')}</label>
                    <textarea
                        value={hiraganaText}
                        onChange={(e) => setHiraganaText(e.target.value)}
                        required
                        rows="3"
                        style={inputStyle}
                    ></textarea>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('admin_english_text_input')}</label>
                    <textarea
                        value={englishText}
                        onChange={(e) => setEnglishText(e.target.value)}
                        required
                        rows="3"
                        style={inputStyle}
                    ></textarea>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('admin_category_input')}</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                        style={{ ...inputStyle, width: 'calc(100% - 16px)', maxWidth: '250px' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('admin_difficulty_input')}</label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        required
                        style={{ ...inputStyle, width: 'calc(100% - 16px)', maxWidth: '200px', padding: '10px' }}
                    >
                        <option value="Easy">{t('admin_difficulty_easy')}</option>
                        <option value="Medium">{t('admin_difficulty_medium')}</option>
                        <option value="Hard">{t('admin_difficulty_hard')}</option>
                    </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('admin_xp_reward_input')}</label>
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
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('admin_answers_input')}</label>
                    <input
                        type="text"
                        value={answers}
                        onChange={(e) => setAnswers(e.target.value)}
                        placeholder={t('admin_answers_placeholder')}
                        required
                        style={inputStyle}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={submitButtonStyle}>
                        {selectedRiddleId ? t('admin_update_riddle_button') : t('admin_add_riddle_button')}
                    </button>
                    {selectedRiddleId && (
                        <button type="button" onClick={handleDelete} style={deleteButtonStyle}>
                            {t('admin_delete_riddle_button')}
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