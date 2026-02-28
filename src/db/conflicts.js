import { getDB } from './db';

export async function addConflict(conflict) {
    const db = await getDB();
    await db.put('conflicts', {
        sessionId: conflict.sessionId,
        localVersion: conflict.localVersion,
        cloudVersion: conflict.cloudVersion,
        detectedAt: conflict.detectedAt || new Date().toISOString(),
    });
}

export async function getAllConflicts() {
    const db = await getDB();
    return db.getAll('conflicts');
}

export async function getConflict(sessionId) {
    const db = await getDB();
    return db.get('conflicts', sessionId);
}

export async function removeConflict(sessionId) {
    const db = await getDB();
    await db.delete('conflicts', sessionId);
}

export async function hasUnresolvedConflicts() {
    const db = await getDB();
    const all = await db.getAll('conflicts');
    return all.length > 0;
}

export async function clearAllConflicts() {
    const db = await getDB();
    await db.clear('conflicts');
}
