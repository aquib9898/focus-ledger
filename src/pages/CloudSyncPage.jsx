import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { runSync } from '../services/syncEngine';
import { getSyncMeta, setSyncMeta } from '../db/syncMeta';
import { hasUnresolvedConflicts } from '../db/conflicts';
import { migrateSessionsForSync } from '../db/sessions';
import { getAllSessions } from '../db/sessions';
import { getMetadata } from '../db/metadata';
import toast from 'react-hot-toast';
import './CloudSyncPage.css';

const AUTO_SYNC_OPTIONS = [
    { label: '3 hours', value: '3h', ms: 3 * 60 * 60 * 1000 },
    { label: '6 hours', value: '6h', ms: 6 * 60 * 60 * 1000 },
    { label: '12 hours', value: '12h', ms: 12 * 60 * 60 * 1000 },
];

export default function CloudSyncPage() {
    const navigate = useNavigate();
    const { isAuthenticated, isGuest, user } = useAuth();
    const [syncMeta, setSyncMetaState] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [hasConflicts, setHasConflicts] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const autoSyncRef = useRef(null);

    const loadMeta = useCallback(async () => {
        const meta = await getSyncMeta();
        setSyncMetaState(meta);
        const conflicts = await hasUnresolvedConflicts();
        setHasConflicts(conflicts);
    }, []);

    useEffect(() => {
        loadMeta();
    }, [loadMeta]);

    // Auto sync timer
    useEffect(() => {
        if (autoSyncRef.current) {
            clearInterval(autoSyncRef.current);
            autoSyncRef.current = null;
        }

        if (!syncMeta?.cloudSyncEnabled || !syncMeta?.autoSyncInterval || !isAuthenticated) {
            return;
        }

        const option = AUTO_SYNC_OPTIONS.find(o => o.value === syncMeta.autoSyncInterval);
        if (!option) return;

        autoSyncRef.current = setInterval(async () => {
            const conflicts = await hasUnresolvedConflicts();
            if (conflicts) return; // Block auto sync if conflicts exist

            try {
                await runSync();
                await loadMeta();
            } catch {
                // Silent fail for auto sync
            }
        }, option.ms);

        return () => {
            if (autoSyncRef.current) {
                clearInterval(autoSyncRef.current);
            }
        };
    }, [syncMeta?.cloudSyncEnabled, syncMeta?.autoSyncInterval, isAuthenticated, loadMeta]);

    const handleToggleSync = async () => {
        const newEnabled = !syncMeta?.cloudSyncEnabled;
        await setSyncMeta({ cloudSyncEnabled: newEnabled });

        // Run migration on first enable
        if (newEnabled) {
            const migrated = await migrateSessionsForSync();
            if (migrated > 0) {
                toast.success(`Migrated ${migrated} sessions for sync`);
            }
        }

        await loadMeta();
        toast.success(newEnabled ? 'Cloud Sync enabled' : 'Cloud Sync disabled');
    };

    const handleSyncNow = async () => {
        if (syncing) return;
        setSyncing(true);
        try {
            // Migrate sessions first
            await migrateSessionsForSync();
            const result = await runSync();
            setLastResult(result);
            await loadMeta();
            toast.success(
                `Synced! ↓${result.downloaded} ↑${result.uploaded}` +
                (result.conflicts > 0 ? ` ⚠${result.conflicts} conflicts` : '')
            );
        } catch (err) {
            toast.error(err.message || 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const handleAutoSyncChange = async (e) => {
        const value = e.target.value || null;
        await setSyncMeta({ autoSyncInterval: value });
        await loadMeta();
        if (value) {
            const label = AUTO_SYNC_OPTIONS.find(o => o.value === value)?.label;
            toast.success(`Auto sync set to every ${label}`);
        } else {
            toast.success('Auto sync disabled');
        }
    };

    // Export handler
    const handleExport = async () => {
        try {
            const sessions = await getAllSessions();
            const metadata = await getMetadata();
            const data = { metadata, sessions };
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `focus-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Data exported successfully');
        } catch (err) {
            toast.error('Export failed: ' + err.message);
        }
    };

    const formatLastSynced = () => {
        if (!syncMeta?.lastSyncedAt) return 'Never';
        const d = new Date(syncMeta.lastSyncedAt);
        return d.toLocaleString();
    };

    return (
        <div className="cs-page">
            <header className="cs-header">
                <button className="cs-back" onClick={() => navigate('/')}>
                    ← Back
                </button>
                <h1 className="cs-title">Cloud Sync</h1>
                <div className="cs-spacer" />
            </header>

            <div className="cs-cards">
                {/* Cloud Sync Toggle */}
                <div className="cs-card">
                    <div className="cs-card-row">
                        <div>
                            <div className="cs-card-icon">☁️</div>
                            <h2>Cloud Sync</h2>
                            <p>{syncMeta?.cloudSyncEnabled ? 'Syncing your data to the cloud' : 'Keep your data backed up and synced'}</p>
                        </div>
                        <label className={`cs-toggle ${!isAuthenticated ? 'disabled' : ''}`}>
                            <input
                                type="checkbox"
                                checked={syncMeta?.cloudSyncEnabled || false}
                                onChange={handleToggleSync}
                                disabled={!isAuthenticated}
                            />
                            <span className="cs-toggle-slider" />
                        </label>
                    </div>
                    {isGuest && (
                        <div className="cs-guest-notice">
                            <span>🔒</span> Log in to enable cloud sync
                            <button className="cs-login-link" onClick={() => navigate('/auth')}>Log in</button>
                        </div>
                    )}
                    {isAuthenticated && (
                        <div className="cs-user-badge">
                            Logged in as <strong>{user?.username}</strong>
                        </div>
                    )}
                </div>

                {/* Sync Now */}
                <div className="cs-card">
                    <div className="cs-card-icon">🔄</div>
                    <h2>Sync Now</h2>
                    <p>Last synced: {formatLastSynced()}</p>
                    {hasConflicts && (
                        <div className="cs-conflict-warning">
                            ⚠️ Resolve conflicts before syncing
                            <button className="cs-login-link" onClick={() => navigate('/conflicts')}>View Conflicts</button>
                        </div>
                    )}
                    {lastResult && (
                        <div className="cs-sync-result">
                            ↓ {lastResult.downloaded} downloaded · ↑ {lastResult.uploaded} uploaded
                            {lastResult.conflicts > 0 && ` · ⚠ ${lastResult.conflicts} conflicts`}
                        </div>
                    )}
                    <button
                        className="cs-btn cs-btn-sync"
                        onClick={handleSyncNow}
                        disabled={!isAuthenticated || syncing || hasConflicts}
                    >
                        {syncing ? (
                            <>
                                <span className="cs-spinner" />
                                Syncing...
                            </>
                        ) : 'Sync Now'}
                    </button>
                </div>

                {/* Auto Sync */}
                <div className="cs-card">
                    <div className="cs-card-icon">⏰</div>
                    <h2>Auto Sync</h2>
                    <p>Automatically sync in the background</p>
                    <select
                        className="cs-select"
                        value={syncMeta?.autoSyncInterval || ''}
                        onChange={handleAutoSyncChange}
                        disabled={!isAuthenticated || !syncMeta?.cloudSyncEnabled}
                    >
                        <option value="">Disabled</option>
                        {AUTO_SYNC_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                Every {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Local Backup */}
                <div className="cs-card">
                    <div className="cs-card-icon">💾</div>
                    <h2>Local Backup</h2>
                    <p>Export or import your data as a JSON file</p>
                    <div className="cs-btn-group">
                        <button className="cs-btn cs-btn-export" onClick={handleExport}>
                            📤 Export
                        </button>
                        <button className="cs-btn cs-btn-import" onClick={() => navigate('/import-export')}>
                            📥 Import
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
