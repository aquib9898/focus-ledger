import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Returns the elapsed seconds for the active session, updating at ~60fps
 * using requestAnimationFrame.
 */
export function useAnimationClock(activeSession) {
    const [elapsed, setElapsed] = useState(0);
    const rafRef = useRef(null);
    const startTimeRef = useRef(null);

    const tick = useCallback(() => {
        if (startTimeRef.current) {
            const now = Date.now();
            const diff = (now - startTimeRef.current) / 1000;
            setElapsed(diff);
        }
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(() => {
        if (activeSession && activeSession.endTime === null) {
            startTimeRef.current = new Date(activeSession.startTime).getTime();
            rafRef.current = requestAnimationFrame(tick);
        } else {
            startTimeRef.current = null;
            setElapsed(0);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        }

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [activeSession?.id, activeSession?.endTime, tick]);

    return elapsed;
}
