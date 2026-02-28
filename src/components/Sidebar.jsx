import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasUnresolvedConflicts } from '../db/conflicts';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
    const { isAuthenticated, isGuest, user, logout } = useAuth();
    const [conflictCount, setConflictCount] = useState(0);

    useEffect(() => {
        if (isOpen) {
            (async () => {
                const { getAllConflicts } = await import('../db/conflicts');
                const all = await getAllConflicts();
                setConflictCount(all.length);
            })();
        }
    }, [isOpen]);

    return (
        <>
            <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
            <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2 className="sidebar-title">Focus</h2>
                    <button className="sidebar-close" onClick={onClose} aria-label="Close menu">✕</button>
                </div>
                <div className="sidebar-nav">
                    <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <span className="sidebar-icon">⏱</span>
                        Dashboard
                    </NavLink>
                    <NavLink to="/cloud-sync" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <span className="sidebar-icon">☁️</span>
                        Cloud Sync
                    </NavLink>
                    <NavLink to="/conflicts" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <span className="sidebar-icon">⚠️</span>
                        Conflicts
                        {conflictCount > 0 && (
                            <span className="sidebar-badge">{conflictCount}</span>
                        )}
                    </NavLink>
                    <NavLink to="/day-matrix" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <span className="sidebar-icon">🧱</span>
                        Day Matrix
                    </NavLink>
                    <NavLink to="/import-export" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                        <span className="sidebar-icon">📦</span>
                        Import / Export
                    </NavLink>
                </div>
                <div className="sidebar-footer">
                    {isAuthenticated ? (
                        <div className="sidebar-user">
                            <span className="sidebar-user-name">👤 {user?.username}</span>
                            <button className="sidebar-logout" onClick={() => { logout(); onClose(); }}>
                                Log out
                            </button>
                        </div>
                    ) : (
                        <NavLink to="/auth" className="sidebar-login-link" onClick={onClose}>
                            🔑 Log in / Sign up
                        </NavLink>
                    )}
                    <span className="sidebar-version">v2.0.0</span>
                </div>
            </nav>
        </>
    );
}
