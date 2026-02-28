import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllConflicts, removeConflict } from '../db/conflicts';
import { resolveConflict } from '../services/syncEngine';
import { putSession } from '../db/sessions';
import toast from 'react-hot-toast';
import './ConflictsPage.css';

function formatTime(iso) {
    if (!iso) return '--';
    return new Date(iso).toLocaleString();
}

function formatDuration(seconds) {
    if (seconds == null) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function DiffRow({ label, localVal, cloudVal }) {
    const isDiff = localVal !== cloudVal;
    return (
        <div className={`conflict-diff-row ${isDiff ? 'different' : ''}`}>
            <span className="conflict-diff-label">{label}</span>
            <span className="conflict-diff-local">{localVal || '--'}</span>
            <span className="conflict-diff-cloud">{cloudVal || '--'}</span>
        </div>
    );
}

function ConflictCard({ conflict, onResolve }) {
    const [resolving, setResolving] = useState(false);
    const { localVersion: local, cloudVersion: cloud } = conflict;

    const handleResolve = async (resolution) => {
        setResolving(true);
        try {
            await onResolve(resolution, conflict);
        } finally {
            setResolving(false);
        }
    };

    return (
        <div className="conflict-card">
            <div className="conflict-card-header">
                <span className={`conflict-type ${local.type}`}>{local.type}</span>
                <span className="conflict-date">{local.date}</span>
                <span className="conflict-detected">Detected: {formatTime(conflict.detectedAt)}</span>
            </div>

            <div className="conflict-diff-table">
                <div className="conflict-diff-header">
                    <span className="conflict-diff-label">Field</span>
                    <span className="conflict-diff-local">Local</span>
                    <span className="conflict-diff-cloud">Cloud</span>
                </div>
                <DiffRow label="Type" localVal={local.type} cloudVal={cloud.type} />
                <DiffRow label="Start" localVal={formatTime(local.startTime)} cloudVal={formatTime(cloud.startTime)} />
                <DiffRow label="End" localVal={formatTime(local.endTime)} cloudVal={formatTime(cloud.endTime)} />
                <DiffRow label="Duration" localVal={formatDuration(local.durationSeconds)} cloudVal={formatDuration(cloud.durationSeconds)} />
                <DiffRow label="Device" localVal={local.deviceId?.slice(0, 8)} cloudVal={cloud.deviceId?.slice(0, 8)} />
                <DiffRow label="Updated" localVal={formatTime(local.updatedAt)} cloudVal={formatTime(cloud.updatedAt)} />
            </div>

            <div className="conflict-actions">
                <button
                    className="conflict-btn conflict-btn-local"
                    onClick={() => handleResolve('local')}
                    disabled={resolving}
                >
                    Keep Local
                </button>
                <button
                    className="conflict-btn conflict-btn-cloud"
                    onClick={() => handleResolve('cloud')}
                    disabled={resolving}
                >
                    Keep Cloud
                </button>
                <button
                    className="conflict-btn conflict-btn-delete"
                    onClick={() => handleResolve('delete')}
                    disabled={resolving}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

export default function ConflictsPage() {
    const navigate = useNavigate();
    const [conflicts, setConflicts] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadConflicts = useCallback(async () => {
        const all = await getAllConflicts();
        setConflicts(all);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadConflicts();
    }, [loadConflicts]);

    const handleResolve = async (resolution, conflict) => {
        try {
            if (resolution !== 'later') {
                await resolveConflict(resolution, conflict);
            }
            await removeConflict(conflict.sessionId);
            await loadConflicts();
            toast.success(
                resolution === 'local' ? 'Kept local version' :
                    resolution === 'cloud' ? 'Kept cloud version' :
                        resolution === 'delete' ? 'Session deleted' : 'Resolved later'
            );
        } catch (err) {
            toast.error(err.message || 'Resolution failed');
        }
    };

    return (
        <div className="conflicts-page">
            <header className="conflicts-header">
                <button className="conflicts-back" onClick={() => navigate('/')}>
                    ← Back
                </button>
                <h1 className="conflicts-title">
                    Conflicts
                    {conflicts.length > 0 && (
                        <span className="conflicts-count">{conflicts.length}</span>
                    )}
                </h1>
                <div className="conflicts-spacer" />
            </header>

            {loading ? (
                <div className="conflicts-loading">
                    <div className="conflicts-spinner" />
                </div>
            ) : conflicts.length === 0 ? (
                <div className="conflicts-empty">
                    <div className="conflicts-empty-icon">✅</div>
                    <h2>No Conflicts</h2>
                    <p>All your sessions are in sync</p>
                </div>
            ) : (
                <div className="conflicts-list">
                    {conflicts.map(c => (
                        <ConflictCard
                            key={c.sessionId}
                            conflict={c}
                            onResolve={handleResolve}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
