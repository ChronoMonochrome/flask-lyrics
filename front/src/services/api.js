// src/services/api.js
import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production'
    ? 'https://japaneseriddle.ignorelist.com/api' // Your Nginx served domain
    : 'http://localhost:8080/api'; // Or directly to Flask for dev: 'http://localhost:8011/api'

const api = axios.create({
    baseURL: API_URL,
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
});

export default api;
