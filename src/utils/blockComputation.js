const BLOCK_COUNT = 100;
const SECONDS_PER_DAY = 86400;
const BLOCK_DURATION = SECONDS_PER_DAY / BLOCK_COUNT; // 864 seconds
const WASTE_THRESHOLD = 204; // 3m 24s
const FOCUS_THRESHOLD = 660; // 11m

/**
 * Get the start/end timestamps (in seconds since midnight) for a given block index.
 */
export function getBlockRange(blockIndex) {
    const start = blockIndex * BLOCK_DURATION;
    const end = start + BLOCK_DURATION;
    return { start, end };
}

/**
 * Convert seconds-since-midnight to a "HH:MM:SS" string.
 */
export function secondsToTime(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * Compute how many seconds overlap between [aStart, aEnd) and [bStart, bEnd).
 */
function overlapSeconds(aStart, aEnd, bStart, bEnd) {
    const start = Math.max(aStart, bStart);
    const end = Math.min(aEnd, bEnd);
    return Math.max(0, end - start);
}

/**
 * Convert an ISO timestamp to seconds since midnight of dateStr.
 */
function isoToSecondsSinceMidnight(iso, dateStr) {
    const d = new Date(iso);
    const midnight = new Date(dateStr + 'T00:00:00');
    return Math.max(0, (d.getTime() - midnight.getTime()) / 1000);
}

/**
 * Compute the 100 blocks for a given date.
 *
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {Array} sessions - sessions for that date (already fetched)
 * @param {boolean} isToday - whether dateStr is the current day
 * @returns {Array<{index, startSec, endSec, focusSec, wasteSec, color}>}
 */
export function computeBlocks(dateStr, sessions, isToday) {
    const nowSec = isToday
        ? isoToSecondsSinceMidnight(new Date().toISOString(), dateStr)
        : SECONDS_PER_DAY;

    // Pre-compute session ranges in seconds-since-midnight
    const sessionRanges = sessions.map((s) => {
        let start = isoToSecondsSinceMidnight(s.startTime, dateStr);
        let end;
        if (s.endTime) {
            end = isoToSecondsSinceMidnight(s.endTime, dateStr);
        } else if (isToday) {
            end = nowSec;
        } else {
            end = SECONDS_PER_DAY;
        }
        // Clamp to [0, SECONDS_PER_DAY]
        start = Math.max(0, Math.min(start, SECONDS_PER_DAY));
        end = Math.max(0, Math.min(end, SECONDS_PER_DAY));
        return { type: s.type, start, end };
    });

    const blocks = [];

    for (let i = 0; i < BLOCK_COUNT; i++) {
        const { start: bStart, end: bEnd } = getBlockRange(i);
        let focusSec = 0;
        let wasteSec = 0;

        for (const sr of sessionRanges) {
            const overlap = overlapSeconds(bStart, bEnd, sr.start, sr.end);
            if (overlap > 0) {
                if (sr.type === 'focus') focusSec += overlap;
                else wasteSec += overlap;
            }
        }

        // Determine color
        let color;
        const blockFullyPassed = nowSec >= bEnd;

        if (wasteSec >= WASTE_THRESHOLD) {
            color = 'red';
        } else if (focusSec >= FOCUS_THRESHOLD) {
            color = 'green';
        } else if (blockFullyPassed) {
            // Block fully passed but didn't reach focus threshold = red
            color = 'red';
        } else {
            color = 'grey';
        }

        blocks.push({
            index: i,
            startSec: bStart,
            endSec: bEnd,
            focusSec,
            wasteSec,
            color,
        });
    }

    return blocks;
}

export { BLOCK_DURATION, WASTE_THRESHOLD, FOCUS_THRESHOLD };
