import React, { useMemo } from 'react';
import './AnalogClock.css';

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 90;
const HAND_LENGTH = 72;
const TICK_OUTER = RADIUS - 2;
const TICK_INNER_MAJOR = RADIUS - 14;
const TICK_INNER_MINOR = RADIUS - 8;

export default function AnalogClock({ elapsedSeconds = 0, active = false, theme = 'focus' }) {
    const isFocus = theme === 'focus';
    const accentColor = isFocus ? '#a6e3a1' : '#f38ba8';
    const accentDim = isFocus ? 'rgba(166,227,161,0.15)' : 'rgba(243,139,168,0.15)';
    const glowColor = isFocus ? 'rgba(166,227,161,0.4)' : 'rgba(243,139,168,0.4)';

    // Seconds within the current hour for hand rotation
    const secondsInHour = elapsedSeconds % 3600;
    const handAngle = (secondsInHour / 3600) * 360 - 90; // -90 so 0 is at top

    // Hours completed
    const hoursCompleted = Math.floor(elapsedSeconds / 3600);

    // Progress for arc (0 → 1)
    const progress = secondsInHour / 3600;

    const ticks = useMemo(() => {
        const elements = [];
        for (let i = 0; i < 60; i++) {
            const angle = (i / 60) * 360;
            const rad = (angle * Math.PI) / 180;
            const isMajor = i % 5 === 0;
            const inner = isMajor ? TICK_INNER_MAJOR : TICK_INNER_MINOR;
            const x1 = CENTER + inner * Math.cos(rad - Math.PI / 2);
            const y1 = CENTER + inner * Math.sin(rad - Math.PI / 2);
            const x2 = CENTER + TICK_OUTER * Math.cos(rad - Math.PI / 2);
            const y2 = CENTER + TICK_OUTER * Math.sin(rad - Math.PI / 2);
            elements.push(
                <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isMajor ? 'rgba(205,214,244,0.6)' : 'rgba(205,214,244,0.2)'}
                    strokeWidth={isMajor ? 2 : 1}
                    strokeLinecap="round"
                />
            );
        }
        return elements;
    }, []);

    // Arc path
    const arcPath = useMemo(() => {
        if (progress === 0) return '';
        const endAngle = progress * 360;
        const startRad = -Math.PI / 2;
        const endRad = ((endAngle - 90) * Math.PI) / 180;
        const largeArc = endAngle > 180 ? 1 : 0;
        const x1 = CENTER + RADIUS * Math.cos(startRad);
        const y1 = CENTER + RADIUS * Math.sin(startRad);
        const x2 = CENTER + RADIUS * Math.cos(endRad);
        const y2 = CENTER + RADIUS * Math.sin(endRad);

        if (progress >= 0.999) {
            // Full circle
            return `M ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 ${CENTER - 0.01} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER} ${CENTER - RADIUS}`;
        }

        return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`;
    }, [progress]);

    // Hand endpoint
    const handRad = (handAngle * Math.PI) / 180;
    const handX = CENTER + HAND_LENGTH * Math.cos(handRad);
    const handY = CENTER + HAND_LENGTH * Math.sin(handRad);

    return (
        <div className={`analog-clock ${active ? 'active' : 'inactive'} ${theme}`}>
            <div className="clock-label">{isFocus ? 'FOCUS' : 'WASTE'}</div>
            <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="clock-svg"
            >
                {/* Glow filter */}
                <defs>
                    <filter id={`glow-${theme}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background circle */}
                <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={accentDim} stroke="rgba(205,214,244,0.1)" strokeWidth="1.5" />

                {/* Tick marks */}
                {ticks}

                {/* Progress arc */}
                {active && arcPath && (
                    <path
                        d={arcPath}
                        fill="none"
                        stroke={accentColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                        filter={`url(#glow-${theme})`}
                        opacity="0.9"
                    />
                )}

                {/* Center dot */}
                <circle cx={CENTER} cy={CENTER} r="5" fill={active ? accentColor : 'rgba(205,214,244,0.3)'} />

                {/* Hand */}
                {active && (
                    <line
                        x1={CENTER}
                        y1={CENTER}
                        x2={handX}
                        y2={handY}
                        stroke={accentColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        filter={`url(#glow-${theme})`}
                    />
                )}

                {/* Hour counter */}
                {hoursCompleted > 0 && active && (
                    <text
                        x={CENTER}
                        y={CENTER + 30}
                        textAnchor="middle"
                        fill={accentColor}
                        fontSize="18"
                        fontWeight="700"
                        fontFamily="Inter, sans-serif"
                    >
                        {hoursCompleted}h
                    </text>
                )}
            </svg>
        </div>
    );
}
