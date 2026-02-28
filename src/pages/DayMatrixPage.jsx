import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessionsByDate } from '../db/sessions';
import { getMetadata } from '../db/metadata';
import { computeBlocks } from '../utils/blockComputation';
import { toDateStr, getTodayStr } from '../utils/time';
import MatrixGrid from '../components/MatrixGrid';
import FocusLineChart from '../components/FocusLineChart';
import './DayMatrixPage.css';

export default function DayMatrixPage() {
    const navigate = useNavigate();
    const [viewDate, setViewDate] = useState(getTodayStr());
    const [sessions, setSessions] = useState([]);
    const [firstDate, setFirstDate] = useState(null);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const dateInputRef = useRef(null);
    const today = getTodayStr();

    // Load metadata for firstStartTime
    useEffect(() => {
        (async () => {
            const meta = await getMetadata();
            if (meta?.firstStartTime) {
                setFirstDate(toDateStr(new Date(meta.firstStartTime)));
            }
        })();
    }, []);

    // Fetch sessions when date changes
    useEffect(() => {
        (async () => {
            const s = await getSessionsByDate(viewDate);
            setSessions(s);
        })();
    }, [viewDate]);

    // Live refresh for today every 5 seconds
    useEffect(() => {
        if (viewDate !== today) return;
        const interval = setInterval(async () => {
            const s = await getSessionsByDate(today);
            setSessions(s);
        }, 5000);
        return () => clearInterval(interval);
    }, [viewDate, today]);

    const isToday = viewDate === today;

    // Navigation limits
    const minDate = useMemo(() => {
        if (!firstDate) return today;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenStr = toDateStr(sevenDaysAgo);
        return firstDate > sevenStr ? firstDate : sevenStr;
    }, [firstDate, today]);

    const canGoBack = viewDate > minDate;
    const canGoForward = viewDate < today;

    const goBack = useCallback(() => {
        if (!canGoBack) return;
        const d = new Date(viewDate + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        const newDate = toDateStr(d);
        if (newDate >= minDate) setViewDate(newDate);
    }, [viewDate, canGoBack, minDate]);

    const goForward = useCallback(() => {
        if (!canGoForward) return;
        const d = new Date(viewDate + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        const newDate = toDateStr(d);
        if (newDate <= today) setViewDate(newDate);
    }, [viewDate, canGoForward, today]);

    const goToday = useCallback(() => {
        setViewDate(today);
    }, [today]);

    const handleCalendarChange = (e) => {
        const val = e.target.value;
        if (val) {
            setViewDate(val);
            setCalendarOpen(false);
        }
    };

    const openCalendar = () => {
        if (dateInputRef.current) {
            dateInputRef.current.showPicker();
        }
    };

    // Compute blocks (memoized)
    const blocks = useMemo(() => {
        return computeBlocks(viewDate, sessions, isToday);
    }, [viewDate, sessions, isToday]);

    // Stats summary
    const greenCount = blocks.filter((b) => b.color === 'green').length;
    const redCount = blocks.filter((b) => b.color === 'red').length;
    const greyCount = blocks.filter((b) => b.color === 'grey').length;

    // Format date for display
    const displayDate = new Date(viewDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="daymatrix-page">
            <header className="dm-header">
                <button className="dm-back" onClick={() => navigate('/')}>
                    ← Back
                </button>
                <h1 className="dm-title">Day Matrix</h1>
                <div className="dm-spacer" />
            </header>

            {/* Date navigation */}
            <div className="dm-nav">
                {canGoBack ? (
                    <button className="dm-nav-btn" onClick={goBack} aria-label="Previous day">
                        ←
                    </button>
                ) : (
                    <div className="dm-nav-btn-placeholder" />
                )}

                <div className="dm-date-center">
                    <span className="dm-date-text">{displayDate}</span>
                    {isToday && <span className="dm-today-badge">Today</span>}
                </div>

                {canGoForward ? (
                    <button className="dm-nav-btn" onClick={goForward} aria-label="Next day">
                        →
                    </button>
                ) : (
                    <div className="dm-nav-btn-placeholder" />
                )}
            </div>

            <div className="dm-nav-actions">
                {!isToday && (
                    <button className="dm-action-btn" onClick={goToday}>
                        Today
                    </button>
                )}
                <button className="dm-action-btn" onClick={openCalendar}>
                    📅
                </button>
                <input
                    ref={dateInputRef}
                    type="date"
                    className="dm-date-input"
                    value={viewDate}
                    min={firstDate || undefined}
                    max={today}
                    onChange={handleCalendarChange}
                />
            </div>

            {/* Matrix grid */}
            <div className="dm-grid-container">
                <MatrixGrid blocks={blocks} />
            </div>

            {/* Stats bar */}
            <div className="dm-stats">
                <div className="dm-stat dm-stat--green">
                    <span className="dm-stat-dot dm-dot--green" />
                    <span>{greenCount}</span>
                </div>
                <div className="dm-stat dm-stat--red">
                    <span className="dm-stat-dot dm-dot--red" />
                    <span>{redCount}</span>
                </div>
                <div className="dm-stat dm-stat--grey">
                    <span className="dm-stat-dot dm-dot--grey" />
                    <span>{greyCount}</span>
                </div>
            </div>

            {/* Focus Percentage Line Chart */}
            <FocusLineChart blocks={blocks} />
        </div>
    );
}
