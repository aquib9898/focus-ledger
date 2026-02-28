import React, { createContext, useContext } from 'react';
import { useSessionManager } from '../hooks/useSessionManager';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
    const session = useSessionManager();
    return (
        <SessionContext.Provider value={session}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return ctx;
}
