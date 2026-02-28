import React, { useState, useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { useAnimationClock } from '../hooks/useAnimationClock';
import AnalogClock from '../components/AnalogClock';
import SessionList from '../components/SessionList';
import ToggleButton from '../components/ToggleButton';
import Sidebar from '../components/Sidebar';
import { formatHMS } from '../utils/time';
import './MainPage.css';

export default function MainPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [combinedView, setCombinedView] = useState(false);
    const {
        activeSession,
        todayFocus,
        todayWaste,
        isFirstTime,
        isLoading,
        handleStart,
        handleToggle,
    } = useSession();

    const elapsed = useAnimationClock(activeSession);

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Merged chronological list for combined view
    const combinedSessions = useMemo(() => {
        return [...todayFocus, ...todayWaste]
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    }, [todayFocus, todayWaste]);

    if (isLoading) {
        return (
            <div className="main-page">
                <div className="loading">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }

    const focusElapsed = activeSession?.type === 'focus' ? elapsed : 0;
    const wasteElapsed = activeSession?.type === 'waste' ? elapsed : 0;

    // Calculate total time for today — only add elapsed to the ONE active session
    const totalFocusSeconds = todayFocus.reduce((acc, s) => {
        if (s.endTime === null && activeSession?.id === s.id) return acc + elapsed;
        return acc + (s.durationSeconds || 0);
    }, 0);
    const totalWasteSeconds = todayWaste.reduce((acc, s) => {
        if (s.endTime === null && activeSession?.id === s.id) return acc + elapsed;
        return acc + (s.durationSeconds || 0);
    }, 0);

    return (
        <div className="main-page">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <header className="main-header">
                <button
                    className="burger-btn"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open menu"
                >
                    <span /><span /><span />
                </button>
                <div className="header-date">{today}</div>
                <div className="header-spacer" />
            </header>

            <div className="clocks-section">
                <AnalogClock
                    elapsedSeconds={focusElapsed}
                    active={activeSession?.type === 'focus'}
                    theme="focus"
                />
                <AnalogClock
                    elapsedSeconds={wasteElapsed}
                    active={activeSession?.type === 'waste'}
                    theme="waste"
                />
            </div>

            {activeSession && (
                <div className="elapsed-display">
                    <span className={activeSession.type === 'focus' ? 'focus-text' : 'waste-text'}>
                        {formatHMS(Math.floor(elapsed))}
                    </span>
                </div>
            )}

            <div className="toggle-section">
                <ToggleButton
                    activeSession={activeSession}
                    isFirstTime={isFirstTime}
                    onStart={handleStart}
                    onToggle={handleToggle}
                />
            </div>

            <div className="totals-bar">
                <div className="total-item">
                    <span className="total-label">Focus Today</span>
                    <span className="total-value focus-text">{formatHMS(Math.floor(totalFocusSeconds))}</span>
                </div>
                <div className="total-divider" />
                <div className="total-item">
                    <span className="total-label">Waste Today</span>
                    <span className="total-value waste-text">{formatHMS(Math.floor(totalWasteSeconds))}</span>
                </div>
            </div>

            {combinedView ? (
                <div className="sessions-section sessions-combined">
                    <SessionList sessions={combinedSessions} type="combined" />
                </div>
            ) : (
                <div className="sessions-section">
                    <SessionList sessions={todayFocus} type="focus" />
                    <SessionList sessions={todayWaste} type="waste" />
                </div>
            )}

            <button
                className="view-toggle-btn"
                onClick={() => setCombinedView((v) => !v)}
            >
                {combinedView ? '⇄ Split View' : '☰ Display as One'}
            </button>
        </div>
    );
}
