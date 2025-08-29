// front/src/services/api.js
import axios from 'axios';

let navigateRef;

export const setNavigateFunction = (navigate) => {
    navigateRef = navigate;
};

const API_BASE_URL = 'https://japaneseapp.ignorelist.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

api.interceptors.response.use(response => response, async error => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
        const errorData = error.response.data;
        if (errorData && errorData.redirect_to_home) {
            console.warn('Unauthorized access - token might be expired or invalid. Redirecting to home.');
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('guest_progress');

            if (navigateRef) {
                navigateRef('/');
            } else {
                window.location.href = '/';
            }

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

export const getWords = async (query) => {
    try {
        const response = await api.get('/words/search', {
            params: { q: query }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching words:", error.response?.data || error.message);
        return [];
    }
};

// NEW: API Functions for Lyrics
export const getSongList = async () => {
    try {
        const response = await api.get('/lyrics/list');
        return response.data;
    } catch (error) {
        console.error("Error fetching song list:", error.response?.data || error.message);
        return [];
    }
};

export const getSongLyricsHtml = async (songId) => {
    try {
        // Note: We expect HTML back, so we use `responseType: 'text'`
        const response = await api.get(`/lyrics/${songId}/html`, { responseType: 'text' });
        return response.data;
    } catch (error) {
        console.error(`Error fetching lyrics for ${songId}:`, error.response?.data || error.message);
        return null;
    }
};

export default api;
