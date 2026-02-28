import { useState, useEffect, useCallback, useRef } from 'react';
import {
    createSession,
    closeSession,
    closeAllActiveSessions,
    updateHeartbeat,
    getActiveSession,
    getSessionsByDate,
} from '../db/sessions';
import { getMetadata, setMetadata } from '../db/metadata';
import { recoverCrash } from '../utils/recovery';
import { checkAndSplitDate } from '../utils/dateSplit';
import { getTodayStr, diffSeconds } from '../utils/time';
import toast from 'react-hot-toast';

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes
const DATE_CHECK_INTERVAL = 60 * 1000;     // 1 minute
const ANTI_SPAM_SECONDS = 30;

export function useSessionManager() {
    const [activeSession, setActiveSession] = useState(null);
    const [todaySessions, setTodaySessions] = useState([]);
    const [isFirstTime, setIsFirstTime] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const activeSessionRef = useRef(null);
    const toggleLockRef = useRef(false);

    // Keep ref in sync
    useEffect(() => {
        activeSessionRef.current = activeSession;
    }, [activeSession]);

    const refreshTodaySessions = useCallback(async () => {
        const sessions = await getSessionsByDate(getTodayStr());
        setTodaySessions(sessions);
    }, []);

    // Initialize on mount
    useEffect(() => {
        async function init() {
            const meta = await getMetadata();
            setIsFirstTime(!meta);

            const active = await getActiveSession();
            setActiveSession(active);
            await refreshTodaySessions();
            setIsLoading(false);
        }
        init();
    }, [refreshTodaySessions]);

    // Heartbeat interval
    useEffect(() => {
        if (!activeSession) return;

        const interval = setInterval(async () => {
            const current = activeSessionRef.current;
            if (current && current.endTime === null) {
                const updated = await updateHeartbeat(current.id);
                setActiveSession(updated);
            }
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(interval);
    }, [activeSession?.id]);

    // Date split check interval
    useEffect(() => {
        if (!activeSession) return;

        const interval = setInterval(async () => {
            const current = activeSessionRef.current;
            if (!current || current.endTime !== null) return;

            const newSession = await checkAndSplitDate(current);
            if (newSession) {
                setActiveSession(newSession);
                await refreshTodaySessions();
            }
        }, DATE_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [activeSession?.id, refreshTodaySessions]);

    // Handle first-ever start
    const handleStart = useCallback(async () => {
        // Prevent concurrent calls
        if (toggleLockRef.current) return;
        toggleLockRef.current = true;

        try {
            // Crash recovery — closes ALL stale sessions
            await recoverCrash();

            // Set metadata if first time
            const meta = await getMetadata();
            if (!meta) {
                await setMetadata(new Date().toISOString());
                setIsFirstTime(false);
            }

            // Create new focus session
            const session = await createSession('focus');
            setActiveSession(session);
            await refreshTodaySessions();
        } finally {
            toggleLockRef.current = false;
        }
    }, [refreshTodaySessions]);

    // Handle toggle (Pause / Start)
    const handleToggle = useCallback(async () => {
        // Prevent concurrent calls
        if (toggleLockRef.current) return;
        toggleLockRef.current = true;

        try {
            const current = activeSessionRef.current;
            if (!current) {
                toggleLockRef.current = false;
                await handleStart();
                return;
            }

            // Anti-spam: check if session is less than 30 seconds old
            const elapsed = diffSeconds(current.startTime, new Date().toISOString());
            if (elapsed < ANTI_SPAM_SECONDS) {
                toast('Please wait before toggling', {
                    icon: '⏳',
                    style: {
                        background: '#1e1e2e',
                        color: '#cdd6f4',
                        border: '1px solid rgba(255,255,255,0.1)',
                    },
                });
                return;
            }

            const now = new Date().toISOString();

            // Close ALL active sessions first (safety guard against duplicates)
            await closeAllActiveSessions(now);

            if (current.type === 'focus') {
                // Pause: start waste
                const waste = await createSession('waste', now);
                setActiveSession(waste);
            } else {
                // Start: start focus
                const focus = await createSession('focus', now);
                setActiveSession(focus);
            }

            await refreshTodaySessions();
        } finally {
            toggleLockRef.current = false;
        }
    }, [handleStart, refreshTodaySessions]);

    const todayFocus = todaySessions
        .filter((s) => s.type === 'focus')
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    const todayWaste = todaySessions
        .filter((s) => s.type === 'waste')
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return {
        activeSession,
        todayFocus,
        todayWaste,
        isFirstTime,
        isLoading,
        handleStart,
        handleToggle,
        refreshTodaySessions,
    };
}
