// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            api.get('/auth/user_profile')
                .then(response => {
                    setCurrentUser(response.data);
                })
                .catch(error => {
                    console.error("Failed to fetch user profile:", error);
                    localStorage.removeItem('access_token'); // Clear invalid token
                    setCurrentUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            localStorage.setItem('access_token', response.data.access_token);
            setCurrentUser(response.data.user);
            return true;
        } catch (error) {
            console.error("Login failed:", error.response.data.message);
            return false;
        }
    };

    const register = async (username, password, email) => {
        try {
            const response = await api.post('/auth/register', { username, password, email });
            // Optionally log in after registration
            const loginResponse = await api.post('/auth/login', { username, password });
            localStorage.setItem('access_token', loginResponse.data.access_token);
            setCurrentUser(loginResponse.data.user);
            return true;
        } catch (error) {
            console.error("Registration failed:", error.response.data.message);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        setCurrentUser(null);
    };

    if (loading) {
        return <div>Loading user session...</div>;
    }

    return (
        <AuthContext.Provider value={{ currentUser, login, register, logout, setCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
