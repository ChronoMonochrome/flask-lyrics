// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
// Import both 'api' (for login/register direct calls) and 'getUserProfile' (for initial profile fetch)
import api, { getUserProfile, setNavigateFunction } from '../services/api'; // <-- Import setNavigateFunction

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null); // To store authentication-related errors
    const navigate = useNavigate(); // Get the navigate function here

    // Set the navigate function in the api service as soon as it's available
    useEffect(() => {
        setNavigateFunction(navigate);
    }, [navigate]); // Dependency on navigate ensures it's set if it ever changes (though it's stable)

    // Function to load user profile, typically called on app start or after login/logout
    const loadUserFromToken = useCallback(async () => {
        setLoading(true);
        setAuthError(null); // Clear previous errors
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const user = await getUserProfile();
                setCurrentUser(user);
            } catch (error) {
                console.error("Failed to fetch user profile with token:", error);
                // The API interceptor should handle 401 and redirect.
                // If an error still propagates here (e.g., network error, or non-401 backend error),
                // we can handle it generally.
                if (error.response && error.response.status !== 401) { // If it's not a 401, handle it
                    setAuthError(error.response?.data?.message || "An error occurred while loading your profile.");
                } else if (!error.response) { // Network error or other non-response errors
                    setAuthError("Could not connect to the server. Please check your internet connection.");
                }
                // The interceptor already clears tokens and navigates for 401
                // For other errors, we might not want to clear token or navigate
                setCurrentUser(null); // Ensure user is null if profile fetch fails
            }
        } else {
            setCurrentUser(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadUserFromToken();

        // The 'tokenExpired' event from the old setup is now largely redundant
        // because the Axios interceptor handles the logic directly with `MapsRef`.
        // However, if you have other parts of your app dispatching this, you can keep it
        // but it might be better to centralize token clearing/redirection in the interceptor.
        // For now, let's remove the listener here to avoid duplicate logic if the interceptor does the job.
        // If you keep it, ensure it doesn't cause a double-redirect or unnecessary state updates.
        /*
        const handleTokenExpired = () => {
            console.log("Token expired event received in AuthContext. (Redundant if interceptor handles nav)");
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('guest_progress');
            setCurrentUser(null);
            setAuthError("Your session has expired. Please log in again.");
            // navigate('/'); // AuthContext itself can navigate here too as a fallback
        };
        window.addEventListener('tokenExpired', handleTokenExpired);
        return () => {
            window.removeEventListener('tokenExpired', handleTokenExpired);
        };
        */
    }, [loadUserFromToken, navigate]); // Add navigate to dependency array for clarity, though `setNavigateFunction` handles it

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            localStorage.setItem('access_token', response.data.access_token);
            setCurrentUser(response.data.user);
            setAuthError(null);
            return true;
        } catch (error) {
            console.error("Login failed:", error.response?.data?.message || error.message);
            // The interceptor will handle the redirect for 401.
            // For other login-specific errors (e.g., 400 Bad Request, 401 Invalid Credentials but not expired token),
            // we still want to show an error message.
            setAuthError(error.response?.data?.message || 'Login failed. Please try again.');
            return false;
        }
    };

    const register = async (username, password, email) => {
        try {
            const response = await api.post('/auth/register', { username, password, email });
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
        localStorage.removeItem('user_data');
        localStorage.removeItem('guest_progress');
        setCurrentUser(null);
        setAuthError(null);
        // Optionally redirect to home on logout
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ currentUser, loading, authError, login, register, logout, setCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};