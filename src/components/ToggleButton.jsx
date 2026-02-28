import React from 'react';
import './ToggleButton.css';

export default function ToggleButton({ activeSession, isFirstTime, onStart, onToggle }) {
    if (isFirstTime || !activeSession) {
        return (
            <button className="toggle-btn toggle-start" onClick={onStart}>
                <span className="btn-icon">▶</span>
                <span>Start</span>
            </button>
        );
    }

    if (activeSession.type === 'focus') {
        return (
            <button className="toggle-btn toggle-pause" onClick={onToggle}>
                <span className="btn-icon">⏸</span>
                <span>Pause</span>
            </button>
        );
    }

    return (
        <button className="toggle-btn toggle-start" onClick={onToggle}>
            <span className="btn-icon">▶</span>
            <span>Start</span>
        </button>
    );
}
