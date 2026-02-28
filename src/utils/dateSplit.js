import { closeSession, createSession } from '../db/sessions';
import { toDateStr, endOfDay, startOfDay } from './time';

/**
 * Check if the active session spans across a date boundary.
 * If so, close it at 23:59:59 of its date and open a new session
 * of the same type at 00:00:00 of the current date.
 * Returns the new session if split happened, otherwise null.
 */
export async function checkAndSplitDate(activeSession) {
    if (!activeSession || activeSession.endTime !== null) return null;

    const currentDateStr = toDateStr(new Date());
    const sessionDateStr = activeSession.date;

    if (currentDateStr === sessionDateStr) return null;

    // Close the active session at end of its day
    await closeSession(activeSession.id, endOfDay(sessionDateStr));

    // Create a new session of the same type starting at midnight of the new day
    // We might need to handle multi-day gaps (e.g. session date is 2 days ago)
    let iterDate = new Date(sessionDateStr + 'T00:00:00.000');
    iterDate.setDate(iterDate.getDate() + 1);
    let newSession = null;

    while (toDateStr(iterDate) <= currentDateStr) {
        const dateStr = toDateStr(iterDate);
        if (dateStr === currentDateStr) {
            // This is today — create an open session
            newSession = await createSession(activeSession.type, startOfDay(dateStr));
            break;
        } else {
            // Intermediate day — create and close a full-day session
            const s = await createSession(activeSession.type, startOfDay(dateStr));
            await closeSession(s.id, endOfDay(dateStr));
            iterDate.setDate(iterDate.getDate() + 1);
        }
    }

    return newSession;
}
