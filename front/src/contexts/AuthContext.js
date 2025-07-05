// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react'; // Import useCallback
// Import both 'api' (for login/register direct calls) and 'getUserProfile' (for initial profile fetch)
import api, { getUserProfile } from '../services/api'; // <-- THIS IS THE FIX

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null); // To store authentication-related errors

    // Function to load user profile, typically called on app start or after login/logout
    const loadUserFromToken = useCallback(async () => {
        setLoading(true);
        setAuthError(null); // Clear previous errors
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                // Use the getUserProfile from api.js which correctly uses the axios instance
                // The interceptor in api.js will add the Authorization header if token exists
                const user = await getUserProfile();
                setCurrentUser(user);
            } catch (error) {
                console.error("Failed to fetch user profile with token:", error);
                // Handle cases where token is expired or invalid
                if (error.response && error.response.status === 401) {
                    setAuthError("Session expired or invalid. Please log in again.");
                } else {
                    setAuthError("An error occurred while loading your profile.");
                }
                localStorage.removeItem('access_token'); // Clear invalid/expired token
                localStorage.removeItem('user_data'); // Clear other user data if stored
                localStorage.removeItem('guest_progress'); // Ensure guest progress is cleared on token issues for clarity
                setCurrentUser(null);
            }
        } else {
            setCurrentUser(null);
        }
        setLoading(false);
    }, []); // Empty dependency array means this function is created once

    useEffect(() => {
        loadUserFromToken(); // Call the async function to load user on component mount

        // Listen for custom event dispatch from api.js interceptor for token expiry
        const handleTokenExpired = () => {
            console.log("Token expired event received in AuthContext.");
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('guest_progress');
            setCurrentUser(null);
            setAuthError("Your session has expired. Please log in again.");
            // Optionally, force a refresh or redirect here if needed
        };

        window.addEventListener('tokenExpired', handleTokenExpired);

        return () => {
            window.removeEventListener('tokenExpired', handleTokenExpired);
        };
    }, [loadUserFromToken]); // Re-run if loadUserFromToken changes (which it won't due to useCallback)


    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            localStorage.setItem('access_token', response.data.access_token);
            // After successful login, immediately set the current user
            setCurrentUser(response.data.user);
            setAuthError(null); // Clear any previous auth errors
            return true;
        } catch (error) {
            console.error("Login failed:", error.response?.data?.message || error.message);
            setAuthError(error.response?.data?.message || 'Login failed. Please try again.');
            return false;
        }
    };

    const register = async (username, password, email) => {
        try {
            const response = await api.post('/auth/register', { username, password, email });
            // After successful registration, directly log in
            const loginResponse = await api.post('/auth/login', { username, password });
            localStorage.setItem('access_token', loginResponse.data.access_token);
            setCurrentUser(loginResponse.data.user);
            setAuthError(null);
            return true;
        } catch (error) {
            console.error("Registration failed:", error.response?.data?.message || error.message);
            setAuthError(error.response?.data?.message || 'Registration failed. Please try again.');
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data'); // Clear user data
        localStorage.removeItem('guest_progress'); // Clear guest progress on logout
        setCurrentUser(null);
        setAuthError(null); // Clear auth errors on logout
    };

    // Render loading state until authentication check is complete
    if (loading) {
        return <div>Loading user session...</div>;
    }

    return (
        <AuthContext.Provider value={{ currentUser, login, register, logout, setCurrentUser, loading, authError }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);