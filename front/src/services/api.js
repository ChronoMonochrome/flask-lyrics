// front/src/services/api.js
import axios from 'axios';

// KEEP THIS AS HTTPS - It's correct for the base URL
const API_BASE_URL = 'https://japaneseriddle.ignorelist.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// Response interceptor to handle token expiration/invalidity
api.interceptors.response.use(response => response, error => {
    if (error.response && error.response.status === 401) {
        console.warn('Unauthorized access - token might be expired or invalid. Clearing token.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('guest_progress');
        // Dispatch a custom event for AuthContext to listen to
        window.dispatchEvent(new CustomEvent('tokenExpired'));
    }
    return Promise.reject(error);
});

// --- API Functions ---

export const loginUser = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
};

export const registerUser = async (username, password, email) => {
    const response = await api.post('/auth/register', { username, password, email });
    return response.data;
};

// *** THIS IS THE CRITICAL CHANGE FOR getRiddles ***
export const getRiddles = async (category = null, difficulty = null, axiosConfig = {}) => {
    let url = '/riddles';
    const params = new URLSearchParams();

    // Ensure category and difficulty are strings before appending to URL params
    if (category && typeof category === 'string') {
        params.append('category', category);
    }
    if (difficulty && typeof difficulty === 'string') {
        params.append('difficulty', difficulty);
    }

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    // Pass the axiosConfig object (which includes the signal) to api.get
    const response = await api.get(url, axiosConfig);
    return response.data;
};

export const getRandomRiddle = async (axiosConfig = {}) => { // Also add config here for consistency
    const response = await api.get('/riddles/random', axiosConfig);
    return response.data;
};

export const submitAnswer = async (riddleId, userAnswer) => {
    const response = await api.post(`/riddles/${riddleId}/submit_answer`, {
        answer_text: userAnswer,
    });
    return response.data;
};

export const markRiddleCorrect = async (riddleId) => {
    const response = await api.post(`/riddles/${riddleId}/mark_correct`);
    return response.data;
}

export const getUserProfile = async (axiosConfig = {}) => { // Add config here too
    const response = await api.get('/auth/user_profile', axiosConfig);
    return response.data;
};

export const addRiddle = async (riddleData) => {
    const response = await api.post('/admin/add_riddle', riddleData);
    return response.data;
};

export default api;
