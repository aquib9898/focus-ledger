import { getDB } from './db';

const SYNC_META_KEY = 'syncConfig';

export async function getSyncMeta() {
    const db = await getDB();
    const record = await db.get('syncMeta', SYNC_META_KEY);
    return record || {
        key: SYNC_META_KEY,
        lastSyncedAt: null,
        cloudSyncEnabled: false,
        autoSyncInterval: null, // '3h' | '6h' | '12h' | null
    };
}

export async function setSyncMeta(data) {
    const db = await getDB();
    const existing = await getSyncMeta();
    await db.put('syncMeta', {
        ...existing,
        ...data,
        key: SYNC_META_KEY,
    });
}

export async function updateLastSyncedAt(timestamp) {
    await setSyncMeta({ lastSyncedAt: timestamp });
}

export async function clearSyncMeta() {
    const db = await getDB();
    await db.clear('syncMeta');
}
