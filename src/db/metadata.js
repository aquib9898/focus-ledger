import { getDB } from './db';

const META_KEY = 'main';

export async function getMetadata() {
    const db = await getDB();
    const record = await db.get('metadata', META_KEY);
    return record || null;
}

export async function setMetadata(firstStartTime) {
    const db = await getDB();
    await db.put('metadata', {
        key: META_KEY,
        firstStartTime,
        version: 1,
    });
}

export async function clearMetadata() {
    const db = await getDB();
    await db.clear('metadata');
}

export async function importMetadata(meta) {
    const db = await getDB();
    await db.put('metadata', { ...meta, key: META_KEY });
}
