import { api } from './api';
import { getAllSessions, bulkPutSessions, deleteSession } from '../db/sessions';
import { getSyncMeta, updateLastSyncedAt } from '../db/syncMeta';
import { addConflict, hasUnresolvedConflicts } from '../db/conflicts';
import { getDeviceId } from '../utils/deviceId';

/**
 * Core sync engine implementing ID-based deterministic merge.
 *
 * Sync process:
 * 1. Check for unresolved conflicts — block if any exist
 * 2. Pull cloud sessions updated after lastSyncedAt
 * 3. Compare with all local sessions by session.id
 * 4. Apply merge rules (CASE A/B/C)
 * 5. Detect true conflicts (both modified after last sync)
 * 6. Push resolved local changes to cloud
 * 7. Update lastSyncedAt
 */
export async function runSync() {
    // Block sync if unresolved conflicts exist
    const hasConflicts = await hasUnresolvedConflicts();
    if (hasConflicts) {
        throw new Error('Resolve existing conflicts before syncing');
    }

    const deviceId = getDeviceId();
    const syncMeta = await getSyncMeta();
    const lastSyncedAt = syncMeta.lastSyncedAt;

    // Get all local sessions
    const localSessions = await getAllSessions();

    // Build a map of local sessions by id
    const localMap = new Map();
    for (const s of localSessions) {
        localMap.set(s.id, s);
    }

    // Call the sync endpoint
    // Send all local sessions that need to be pushed
    const localSessionsToPush = [];
    const syncResponse = await api.post('/sync', {
        deviceId,
        lastSyncedAt,
        sessions: [], // First pull, then we'll push
    });

    const cloudSessions = syncResponse.cloudSessions || [];
    const cloudMap = new Map();
    for (const s of cloudSessions) {
        cloudMap.set(s.id, s);
    }

    const toDownload = [];   // Cloud → Local
    const toUpload = [];     // Local → Cloud
    const conflicts = [];    // Both modified

    // Process all sessions
    const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);

    for (const id of allIds) {
        const local = localMap.get(id);
        const cloud = cloudMap.get(id);

        if (local && !cloud) {
            // CASE A: Local only → Upload to cloud
            toUpload.push(local);
        } else if (cloud && !local) {
            // CASE B: Cloud only → Download to local
            toDownload.push(cloud);
        } else if (local && cloud) {
            // CASE C: Both exist → Compare updatedAt
            const localUpdated = local.updatedAt || local.startTime;
            const cloudUpdated = cloud.updatedAt || cloud.startTime;

            if (localUpdated === cloudUpdated) {
                // Equal → do nothing
                continue;
            }

            // Check for true conflict: both modified after last sync
            if (lastSyncedAt &&
                localUpdated > lastSyncedAt &&
                cloudUpdated > lastSyncedAt) {
                // True conflict — both sides modified since last sync
                conflicts.push({
                    sessionId: id,
                    localVersion: local,
                    cloudVersion: cloud,
                    detectedAt: new Date().toISOString(),
                });
            } else if (localUpdated > cloudUpdated) {
                // Local is newer → push to cloud
                toUpload.push(local);
            } else {
                // Cloud is newer → download to local
                toDownload.push(cloud);
            }
        }
    }

    // Store conflicts locally
    for (const conflict of conflicts) {
        await addConflict(conflict);
    }

    // Download cloud sessions to local
    if (toDownload.length > 0) {
        await bulkPutSessions(toDownload);
    }

    // Upload local sessions to cloud
    if (toUpload.length > 0) {
        await api.post('/sessions/bulk', { sessions: toUpload });
    }

    // Update lastSyncedAt
    const syncedAt = syncResponse.syncedAt || new Date().toISOString();
    await updateLastSyncedAt(syncedAt);

    return {
        downloaded: toDownload.length,
        uploaded: toUpload.length,
        conflicts: conflicts.length,
        syncedAt,
    };
}

/**
 * Resolve a conflict by choosing a version.
 * @param {'local'|'cloud'|'delete'} resolution
 * @param {object} conflict - The conflict object from conflicts store
 */
export async function resolveConflict(resolution, conflict) {
    const { sessionId, localVersion, cloudVersion } = conflict;

    switch (resolution) {
        case 'local':
            // Push local version to cloud, keep local
            await api.post('/sessions/bulk', { sessions: [localVersion] });
            break;

        case 'cloud':
            // Replace local with cloud version
            await bulkPutSessions([cloudVersion]);
            break;

        case 'delete':
            // Delete from both local and cloud
            await deleteSession(sessionId);
            try {
                await api.delete(`/sessions/${sessionId}`);
            } catch {
                // Cloud delete may fail if it doesn't exist — that's ok
            }
            break;

        default:
            throw new Error(`Unknown resolution: ${resolution}`);
    }
}
