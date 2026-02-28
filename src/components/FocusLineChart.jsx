import React, { useMemo, useState, useCallback } from 'react';
import { secondsToTime, BLOCK_DURATION } from '../utils/blockComputation';
import { formatHMS } from '../utils/time';
import './FocusLineChart.css';

const THRESHOLD_PCT = 76.4;
const CHART_HEIGHT = 300;
const CHART_PADDING = { top: 20, right: 30, bottom: 40, left: 50 };
const MIN_CHART_WIDTH = 1200;

export default function FocusLineChart({ blocks }) {
    const [tooltip, setTooltip] = useState(null);

    // Compute focus percentages and filter visible points
    const points = useMemo(() => {
        const now = Date.now();
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);

        return blocks.map((block) => {
            const pct = (block.focusSec / BLOCK_DURATION) * 100;
            // A block is visible if it's not fully in the future
            // (color !== 'grey' means it has passed or is current)
            const visible = block.color !== 'grey';
            // Current block = grey is not visible, so check if block is partially in progress
            // Actually, we need to check: if the block has ANY data or time has entered it
            const isCurrent = block.color === 'grey' && block.focusSec > 0;
            return {
                index: block.index,
                pct,
                visible: visible || isCurrent,
                isCurrent: isCurrent,
                focusSec: block.focusSec,
                startSec: block.startSec,
                endSec: block.endSec,
                aboveThreshold: pct > THRESHOLD_PCT,
            };
        });
    }, [blocks]);

    const visiblePoints = points.filter((p) => p.visible);

    const innerWidth = MIN_CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

    const xScale = useCallback(
        (index) => CHART_PADDING.left + (index / 99) * innerWidth,
        [innerWidth]
    );
    const yScale = useCallback(
        (pct) => CHART_PADDING.top + (1 - pct / 100) * innerHeight,
        [innerHeight]
    );

    // Build line path connecting only visible points in order
    const linePath = useMemo(() => {
        if (visiblePoints.length < 2) return '';
        return visiblePoints
            .map((p, i) => {
                const x = xScale(p.index);
                const y = yScale(p.pct);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');
    }, [visiblePoints, xScale, yScale]);

    // Y-axis ticks
    const yTicks = [0, 25, 50, 75, 100];

    // X-axis labels every 10 blocks
    const xLabels = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    const handleMouseEnter = (point, e) => {
        setTooltip({
            point,
            x: e.clientX,
            y: e.clientY,
        });
    };

    const handleMouseMove = (e) => {
        if (tooltip) {
            setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
        }
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    return (
        <div className="focus-chart-wrapper">
            <h3 className="focus-chart-title">Focus Percentage by Block</h3>
            <div className="focus-chart-scroll">
                <svg
                    width={MIN_CHART_WIDTH}
                    height={CHART_HEIGHT}
                    className="focus-chart-svg"
                    onMouseMove={handleMouseMove}
                >
                    {/* Horizontal gridlines */}
                    {yTicks.map((tick) => (
                        <line
                            key={`grid-${tick}`}
                            x1={CHART_PADDING.left}
                            x2={MIN_CHART_WIDTH - CHART_PADDING.right}
                            y1={yScale(tick)}
                            y2={yScale(tick)}
                            stroke="rgba(205,214,244,0.06)"
                            strokeWidth="1"
                        />
                    ))}

                    {/* Threshold line at 76.4% */}
                    <line
                        x1={CHART_PADDING.left}
                        x2={MIN_CHART_WIDTH - CHART_PADDING.right}
                        y1={yScale(THRESHOLD_PCT)}
                        y2={yScale(THRESHOLD_PCT)}
                        stroke="rgba(243,139,168,0.5)"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                    />
                    <text
                        x={MIN_CHART_WIDTH - CHART_PADDING.right + 4}
                        y={yScale(THRESHOLD_PCT) + 4}
                        fill="rgba(243,139,168,0.6)"
                        fontSize="9"
                        fontFamily="Inter, sans-serif"
                    >
                        76.4%
                    </text>

                    {/* Y-axis labels */}
                    {yTicks.map((tick) => (
                        <text
                            key={`ylabel-${tick}`}
                            x={CHART_PADDING.left - 8}
                            y={yScale(tick) + 4}
                            fill="rgba(205,214,244,0.35)"
                            fontSize="10"
                            fontFamily="Inter, sans-serif"
                            textAnchor="end"
                        >
                            {tick}%
                        </text>
                    ))}

                    {/* X-axis labels */}
                    {xLabels.map((label) => (
                        <text
                            key={`xlabel-${label}`}
                            x={xScale(label - 1)}
                            y={CHART_HEIGHT - CHART_PADDING.bottom + 20}
                            fill="rgba(205,214,244,0.35)"
                            fontSize="10"
                            fontFamily="Inter, sans-serif"
                            textAnchor="middle"
                        >
                            {label}
                        </text>
                    ))}

                    {/* Axes */}
                    <line
                        x1={CHART_PADDING.left}
                        x2={CHART_PADDING.left}
                        y1={CHART_PADDING.top}
                        y2={CHART_HEIGHT - CHART_PADDING.bottom}
                        stroke="rgba(205,214,244,0.12)"
                        strokeWidth="1"
                    />
                    <line
                        x1={CHART_PADDING.left}
                        x2={MIN_CHART_WIDTH - CHART_PADDING.right}
                        y1={CHART_HEIGHT - CHART_PADDING.bottom}
                        y2={CHART_HEIGHT - CHART_PADDING.bottom}
                        stroke="rgba(205,214,244,0.12)"
                        strokeWidth="1"
                    />

                    {/* Line path */}
                    {linePath && (
                        <path
                            d={linePath}
                            fill="none"
                            stroke="rgba(205,214,244,0.3)"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Points */}
                    {visiblePoints.map((p) => (
                        <circle
                            key={p.index}
                            cx={xScale(p.index)}
                            cy={yScale(p.pct)}
                            r={p.isCurrent ? 5.5 : 2.5}
                            fill={p.aboveThreshold ? '#a6e3a1' : '#f38ba8'}
                            opacity={p.isCurrent ? 1 : 0.7}
                            stroke={p.isCurrent ? 'rgba(255,255,255,0.5)' : 'none'}
                            strokeWidth={p.isCurrent ? 1 : 0}
                            className="chart-point"
                            style={p.isCurrent ? { filter: 'drop-shadow(0 0 4px rgba(205,214,244,0.25))' } : undefined}
                            onMouseEnter={(e) => handleMouseEnter(p, e)}
                            onMouseLeave={handleMouseLeave}
                        />
                    ))}
                </svg>
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="chart-tooltip"
                    style={{
                        left: tooltip.x + 12,
                        top: tooltip.y - 10,
                    }}
                >
                    <div className="chart-tooltip-block">Block {tooltip.point.index + 1}</div>
                    <div className="chart-tooltip-range">
                        {secondsToTime(tooltip.point.startSec)} – {secondsToTime(tooltip.point.endSec)}
                    </div>
                    <div className="chart-tooltip-pct">
                        <span className={tooltip.point.aboveThreshold ? 'focus-text' : 'waste-text'}>
                            {tooltip.point.pct.toFixed(1)}%
                        </span>
                    </div>
                    <div className="chart-tooltip-dur">
                        Focus: {formatHMS(Math.floor(tooltip.point.focusSec))}
                    </div>
                </div>
            )}
        </div>
    );
}
