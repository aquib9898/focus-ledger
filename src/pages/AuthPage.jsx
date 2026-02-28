import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './AuthPage.css';

export default function AuthPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (!username.trim() || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        if (mode === 'signup' && password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            if (mode === 'login') {
                await login(username.trim(), password);
                toast.success('Welcome back!');
            } else {
                await signup(username.trim(), password);
                toast.success('Account created!');
            }
            navigate('/');
        } catch (err) {
            toast.error(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = () => {
        navigate('/');
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <span className="auth-logo-icon">⏱</span>
                    <h1 className="auth-logo-text">Focus</h1>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => setMode('login')}
                    >
                        Log In
                    </button>
                    <button
                        className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                        onClick={() => setMode('signup')}
                    >
                        Sign Up
                    </button>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="auth-username">Username</label>
                        <input
                            id="auth-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoComplete="username"
                            autoFocus
                        />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="auth-password">Password</label>
                        <input
                            id="auth-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={mode === 'signup' ? 'Min 8 characters' : 'Enter password'}
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        />
                    </div>
                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="auth-spinner" />
                        ) : (
                            mode === 'login' ? 'Log In' : 'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <button className="auth-guest" onClick={handleGuest}>
                    Continue as Guest
                </button>
                <p className="auth-guest-note">Cloud sync features will be disabled</p>
            </div>
        </div>
    );
}
