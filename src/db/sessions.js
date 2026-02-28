import { v4 as uuidv4 } from 'uuid';
import { getDB } from './db';
import { toDateStr } from '../utils/time';
import { getDeviceId } from '../utils/deviceId';

export async function createSession(type, startTime = null) {
    const db = await getDB();
    const now = startTime || new Date().toISOString();
    const session = {
        id: uuidv4(),
        type,
        startTime: now,
        endTime: null,
        durationSeconds: null,
        date: toDateStr(new Date(now)),
        lastHeartbeat: now,
        createdAt: now,
        updatedAt: now,
        deviceId: getDeviceId(),
    };
    await db.put('sessions', session);
    return session;
}

export async function closeSession(id, endTime = null) {
    const db = await getDB();
    const session = await db.get('sessions', id);
    if (!session || session.endTime !== null) return session;

    const end = endTime || new Date().toISOString();
    const duration = Math.round(
        (new Date(end).getTime() - new Date(session.startTime).getTime()) / 1000
    );

    const updated = {
        ...session,
        endTime: end,
        durationSeconds: Math.max(0, duration),
        updatedAt: new Date().toISOString(),
    };
    await db.put('sessions', updated);
    return updated;
}

export async function updateHeartbeat(id) {
    const db = await getDB();
    const session = await db.get('sessions', id);
    if (!session || session.endTime !== null) return session;

    const now = new Date().toISOString();
    const updated = {
        ...session,
        lastHeartbeat: now,
        updatedAt: now,
    };
    await db.put('sessions', updated);
    return updated;
}

export async function getActiveSession() {
    const db = await getDB();
    const all = await db.getAll('sessions');
    return all.find((s) => s.endTime === null) || null;
}

export async function getAllActiveSessions() {
    const db = await getDB();
    const all = await db.getAll('sessions');
    return all.filter((s) => s.endTime === null);
}

export async function closeAllActiveSessions(endTime = null) {
    const actives = await getAllActiveSessions();
    for (const session of actives) {
        await closeSession(session.id, endTime || session.lastHeartbeat);
    }
    return actives;
}

export async function getSessionsByDate(dateStr) {
    const db = await getDB();
    const tx = db.transaction('sessions', 'readonly');
    const index = tx.store.index('by-date');
    return index.getAll(dateStr);
}

export async function getAllSessions() {
    const db = await getDB();
    return db.getAll('sessions');
}

export async function putSession(session) {
    const db = await getDB();
    await db.put('sessions', session);
}

export async function clearAllSessions() {
    const db = await getDB();
    await db.clear('sessions');
}

export async function importSessions(sessions) {
    const db = await getDB();
    const tx = db.transaction('sessions', 'readwrite');
    for (const session of sessions) {
        await tx.store.put(session);
    }
    await tx.done;
}

// Sync helpers

export async function getSessionsUpdatedAfter(timestamp) {
    const db = await getDB();
    const all = await db.getAll('sessions');
    if (!timestamp) return all;
    return all.filter(s => s.updatedAt && s.updatedAt > timestamp);
}

export async function bulkPutSessions(sessions) {
    const db = await getDB();
    const tx = db.transaction('sessions', 'readwrite');
    for (const session of sessions) {
        await tx.store.put(session);
    }
    await tx.done;
}

export async function deleteSession(id) {
    const db = await getDB();
    await db.delete('sessions', id);
}

// Migration: backfill createdAt/updatedAt/deviceId for old sessions
export async function migrateSessionsForSync() {
    const db = await getDB();
    const all = await db.getAll('sessions');
    const deviceId = getDeviceId();
    const tx = db.transaction('sessions', 'readwrite');
    let migrated = 0;

    for (const session of all) {
        let needsUpdate = false;
        const updated = { ...session };

        if (!updated.createdAt) {
            updated.createdAt = updated.startTime || new Date().toISOString();
            needsUpdate = true;
        }
        if (!updated.updatedAt) {
            updated.updatedAt = updated.endTime || updated.lastHeartbeat || updated.startTime || new Date().toISOString();
            needsUpdate = true;
        }
        if (!updated.deviceId) {
            updated.deviceId = deviceId;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await tx.store.put(updated);
            migrated++;
        }
    }

    await tx.done;
    return migrated;
}
