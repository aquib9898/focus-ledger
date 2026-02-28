import { getAllActiveSessions, closeSession, createSession } from '../db/sessions';
import { toDateStr, endOfDay, startOfNextDay, diffSeconds } from './time';

/**
 * Recover from a crash by closing ALL stale active sessions at their lastHeartbeat,
 * then filling the gap from the latest lastHeartbeat → now with waste session(s),
 * splitting across date boundaries as needed.
 */
export async function recoverCrash() {
    const actives = await getAllActiveSessions();
    if (actives.length === 0) return null;

    let latestHeartbeat = null;

    // Close ALL stale sessions at their respective lastHeartbeat
    for (const active of actives) {
        await closeSession(active.id, active.lastHeartbeat);
        const hb = new Date(active.lastHeartbeat);
        if (!latestHeartbeat || hb > latestHeartbeat) {
            latestHeartbeat = hb;
        }
    }

    const now = new Date();

    // Fill the gap with waste sessions, splitting by date
    await createWasteSessionsForGap(latestHeartbeat, now);

    return actives[0];
}

/**
 * Create waste sessions to fill a time gap, splitting at date boundaries.
 */
async function createWasteSessionsForGap(gapStart, gapEnd) {
    let current = new Date(gapStart);
    const end = new Date(gapEnd);

    while (current < end) {
        const currentDateStr = toDateStr(current);
        const dayEnd = new Date(endOfDay(currentDateStr));

        if (end <= dayEnd || toDateStr(end) === currentDateStr) {
            // Gap ends within the same date
            const wasteSession = await createSession('waste', current.toISOString());
            await closeSession(wasteSession.id, end.toISOString());
            break;
        } else {
            // Gap crosses a date boundary — fill to end of current day
            const wasteSession = await createSession('waste', current.toISOString());
            await closeSession(wasteSession.id, endOfDay(currentDateStr));
            // Move to start of next day
            current = new Date(startOfNextDay(currentDateStr));
        }
    }
}
