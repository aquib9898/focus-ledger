import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSessions } from '../db/sessions';
import { getMetadata, clearMetadata, importMetadata } from '../db/metadata';
import { deleteDatabase, resetDBPromise, getDB } from '../db/db';
import { importSessions } from '../db/sessions';
import toast from 'react-hot-toast';
import './ImportExportPage.css';

export default function ImportExportPage() {
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

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

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate structure
            if (!data.sessions || !Array.isArray(data.sessions)) {
                throw new Error('Invalid file: missing sessions array');
            }
            if (!data.metadata || !data.metadata.firstStartTime) {
                throw new Error('Invalid file: missing metadata');
            }

            // Validate each session
            for (const s of data.sessions) {
                if (!s.id || !s.type || !s.startTime || !s.date) {
                    throw new Error('Invalid session entry found');
                }
                if (s.type !== 'focus' && s.type !== 'waste') {
                    throw new Error(`Invalid session type: ${s.type}`);
                }
            }

            // Full overwrite
            await deleteDatabase();
            await resetDBPromise();
            await getDB(); // Re-initialize

            await importMetadata(data.metadata);
            await importSessions(data.sessions);

            toast.success(`Imported ${data.sessions.length} sessions`);
            navigate('/');
        } catch (err) {
            toast.error('Import failed: ' + err.message);
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="ie-page">
            <header className="ie-header">
                <button className="ie-back" onClick={() => navigate('/')}>
                    ← Back
                </button>
                <h1 className="ie-title">Import / Export</h1>
                <div className="ie-spacer" />
            </header>

            <div className="ie-cards">
                <div className="ie-card">
                    <div className="ie-card-icon">📤</div>
                    <h2>Export Data</h2>
                    <p>Download all your sessions and metadata as a JSON file for backup or analysis.</p>
                    <button className="ie-btn ie-btn-export" onClick={handleExport}>
                        Export JSON
                    </button>
                </div>

                <div className="ie-card">
                    <div className="ie-card-icon">📥</div>
                    <h2>Import Data</h2>
                    <p>Import a previously exported JSON file. This will <strong>overwrite</strong> all existing data.</p>
                    <input
                        type="file"
                        accept=".json,application/json"
                        ref={fileInputRef}
                        onChange={handleImport}
                        style={{ display: 'none' }}
                        id="import-file-input"
                    />
                    <button
                        className="ie-btn ie-btn-import"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                    >
                        {importing ? 'Importing…' : 'Choose File'}
                    </button>
                </div>
            </div>
        </div>
    );
}
