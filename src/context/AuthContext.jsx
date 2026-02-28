import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize from localStorage
    useEffect(() => {
        const savedToken = localStorage.getItem('focus_auth_token');
        const savedUser = localStorage.getItem('focus_auth_user');
        if (savedToken && savedUser) {
            try {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('focus_auth_token');
                localStorage.removeItem('focus_auth_user');
            }
        }
        setLoading(false);
    }, []);

    // Listen for token expiry
    useEffect(() => {
        const handler = () => {
            setUser(null);
            setToken(null);
            toast.error('Session expired. Please log in again.');
        };
        window.addEventListener('auth-expired', handler);
        return () => window.removeEventListener('auth-expired', handler);
    }, []);

    const login = useCallback(async (username, password) => {
        const data = await api.post('/auth/login', { username, password });
        localStorage.setItem('focus_auth_token', data.token);
        localStorage.setItem('focus_auth_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data;
    }, []);

    const signup = useCallback(async (username, password) => {
        const data = await api.post('/auth/signup', { username, password });
        localStorage.setItem('focus_auth_token', data.token);
        localStorage.setItem('focus_auth_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('focus_auth_token');
        localStorage.removeItem('focus_auth_user');
        setToken(null);
        setUser(null);
        toast.success('Logged out');
    }, []);

    const value = {
        user,
        token,
        isAuthenticated: !!token,
        isGuest: !token,
        loading,
        login,
        signup,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}
