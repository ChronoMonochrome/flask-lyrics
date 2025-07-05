// front/src/services/api.js

// Adjust this URL based on your backend's exposed port in docker-compose.yml
// If Flask runs on 8012 in the container and exposed to 8012 on host:
// Axios instance for easier HTTP requests and interceptors
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://japaneseriddle.ignorelist.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token'); // Use 'access_token' from AuthContext
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// Response interceptor to handle token expiration/invalidity
api.interceptors.response.use(response => response, error => {
    // Example: if 401 Unauthorized, maybe redirect to login
    if (error.response && error.response.status === 401) {
        console.warn('Unauthorized access - token might be expired or invalid.');
        // Potentially clear token and redirect to login,
        // but AuthContext's useEffect already handles this on initial load.
        // For expired tokens during a session, you might want a more active redirect here.
    }
    return Promise.reject(error);
});

// --- API Functions (now real, no more mocks!) ---

export const loginUser = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data; // Should return { access_token: "...", user: { ... } }
};

export const registerUser = async (username, password, email) => {
    const response = await api.post('/auth/register', { username, password, email });
    return response.data; // Should return { message: "..." }
};

export const getRiddles = async (category = null, difficulty = null) => {
    let url = '/riddles';
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (difficulty) params.append('difficulty', difficulty);
    if (params.toString()) url += `?${params.toString()}`;
    const response = await api.get(url);
    return response.data; // Should return an array of riddle objects
};

export const getRandomRiddle = async () => {
    const response = await api.get('/riddles/random');
    return response.data; // Should return a single riddle object
};

// For riddle submission, backend should update user progress and possibly return XP/level
export const submitAnswer = async (riddleId, userAnswer) => {
    const response = await api.post(`/riddles/${riddleId}/submit_answer`, {
        answer_text: userAnswer,
    });
    return response.data; // Expected: { correct: boolean, message: string, new_xp?: number, new_level?: number, solved_status?: object }
};

export const markRiddleCorrect = async (riddleId) => {
    const response = await api.post(`/riddles/${riddleId}/mark_correct`);
    return response.data; // Expected: { message: string, new_xp?: number, new_level?: number }
}

// User Profile (fetched by AuthContext already, but good to have a direct function)
export const getUserProfile = async () => {
    const response = await api.get('/auth/user_profile');
    return response.data; // Expected: { id, username, email, xp, level, role, avatar_url, solved_riddles_ids: [...] }
};

// Admin functionality
export const addRiddle = async (riddleData) => {
    const response = await api.post('/admin/add_riddle', riddleData);
    return response.data;
};

export default api; // Export the axios instance for direct use where needed
