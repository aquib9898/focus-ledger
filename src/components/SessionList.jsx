import React from 'react';
import { formatHMS, formatTime } from '../utils/time';
import './SessionList.css';

export default function SessionList({ sessions, type }) {
    const isCombined = type === 'combined';
    const isFocus = type === 'focus';
    const listAccent = isCombined ? '' : isFocus ? 'focus-text' : 'waste-text';
    const label = isCombined ? 'All Sessions' : isFocus ? 'Focus Sessions' : 'Waste Sessions';

    return (
        <div className="session-list">
            <h3 className={`session-list-title ${listAccent}`}>{label}</h3>
            {sessions.length === 0 ? (
                <p className="session-list-empty">No sessions yet</p>
            ) : (
                <ul className="session-list-items">
                    {sessions.map((s) => {
                        const accent = isCombined
                            ? (s.type === 'focus' ? 'focus-text' : 'waste-text')
                            : listAccent;
                        const duration = s.durationSeconds != null
                            ? formatHMS(s.durationSeconds)
                            : 'Running…';
                        const startStr = formatTime(s.startTime);
                        const endStr = s.endTime ? formatTime(s.endTime) : 'now';
                        return (
                            <li key={s.id} className={`session-item ${s.endTime === null ? 'session-active' : ''}`}>
                                <span className={`session-duration ${accent}`}>{duration}</span>
                                <span className="session-range">{startStr} → {endStr}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
