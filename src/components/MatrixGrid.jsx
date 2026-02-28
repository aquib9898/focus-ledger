import React, { useState } from 'react';
import { secondsToTime } from '../utils/blockComputation';
import { formatHMS } from '../utils/time';
import './MatrixGrid.css';

export default function MatrixGrid({ blocks }) {
    const [tooltip, setTooltip] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const handleMouseEnter = (block, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
        });
        setTooltip(block);
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    return (
        <div className="matrix-wrapper">
            <div className="matrix-grid">
                {blocks.map((block) => (
                    <div
                        key={block.index}
                        className={`matrix-block matrix-block--${block.color}`}
                        onMouseEnter={(e) => handleMouseEnter(block, e)}
                        onMouseLeave={handleMouseLeave}
                    />
                ))}
            </div>

            {tooltip && (
                <div
                    className="matrix-tooltip"
                    style={{
                        left: tooltipPos.x,
                        top: tooltipPos.y,
                    }}
                >
                    <div className="tooltip-range">
                        {secondsToTime(tooltip.startSec)} — {secondsToTime(tooltip.endSec)}
                    </div>
                    <div className="tooltip-row">
                        <span className="tooltip-label focus-text">Focus:</span>
                        <span className="tooltip-value">{formatHMS(Math.floor(tooltip.focusSec))}</span>
                    </div>
                    <div className="tooltip-row">
                        <span className="tooltip-label waste-text">Waste:</span>
                        <span className="tooltip-value">{formatHMS(Math.floor(tooltip.wasteSec))}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
