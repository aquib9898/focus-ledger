export function toDateStr(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function endOfDay(dateStr) {
    return `${dateStr}T23:59:59.000`;
}

export function startOfNextDay(dateStr) {
    const d = new Date(dateStr + 'T00:00:00.000');
    d.setDate(d.getDate() + 1);
    return toDateStr(d) + 'T00:00:00.000';
}

export function startOfDay(dateStr) {
    return `${dateStr}T00:00:00.000`;
}

export function diffSeconds(isoA, isoB) {
    return Math.round(
        (new Date(isoB).getTime() - new Date(isoA).getTime()) / 1000
    );
}

export function formatHMS(totalSeconds) {
    if (totalSeconds == null || totalSeconds < 0) return '00:00:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export function formatTime(isoStr) {
    if (!isoStr) return '--:--:--';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function getTodayStr() {
    return toDateStr(new Date());
}
