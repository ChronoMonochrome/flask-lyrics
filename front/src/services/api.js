// front/src/services/api.js
import axios from 'axios';

// We'll store the navigate function here
let navigateRef;

export const setNavigateFunction = (navigate) => {
    navigateRef = navigate;
};

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
api.interceptors.response.use(response => response, async error => { // Made async to await data
    const originalRequest = error.config;

    // Check if the error is due to an expired/invalid token (401 status)
    // AND it's not a retry after a refresh attempt (to prevent infinite loops)
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
        // Check for the specific backend signal for redirection
        const errorData = error.response.data;
        if (errorData && errorData.redirect_to_home) {
            console.warn('Unauthorized access - token might be expired or invalid. Redirecting to home.');
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('guest_progress');

            // Use the stored navigate function to redirect
            if (navigateRef) {
                navigateRef('/'); // Redirect to the home page
            } else {
                // Fallback for cases where navigateRef isn't set yet (unlikely in AuthProvider useEffect)
                window.location.href = '/';
            }

            // Reject the promise to stop the original request from proceeding
            return Promise.reject(new Error(errorData.message || 'Session expired. Please log in again.'));
        }
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

export const getRiddles = async (category = null, difficulty = null, axiosConfig = {}) => {
    let url = '/riddles';
    const params = new URLSearchParams();

    if (category && typeof category === 'string') {
        params.append('category', category);
    }
    if (difficulty && typeof difficulty === 'string') {
        params.append('difficulty', difficulty);
    }

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    const response = await api.get(url, axiosConfig);
    return response.data;
};

export const getRandomRiddle = async (axiosConfig = {}) => {
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

export const getUserProfile = async (axiosConfig = {}) => {
    const response = await api.get('/auth/user_profile', axiosConfig);
    return response.data;
};

export const addRiddle = async (riddleData) => {
    const response = await api.post('/admin/add_riddle', riddleData);
    return response.data;
};

export default api;