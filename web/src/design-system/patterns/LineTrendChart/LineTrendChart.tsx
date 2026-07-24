"use client";

import { useId, useMemo, useState } from "react";
import styles from "./LineTrendChart.module.css";

export type TrendPoint = { timestamp: string; value: number };

export type LineTrendChartProps = {
  title: string;
  points: TrendPoint[];
  formatValue: (value: number) => string;
  emptyLabel: string;
};

const WIDTH = 600;
const HEIGHT = 200;
const PADDING = { top: 12, right: 56, bottom: 24, left: 8 };

/** Rounds a max value up to a clean step, per the dataviz method's "round to clean numbers" rule -- avoids an axis topping out at an arbitrary value like 743. */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Trend-over-time, single series (Epic E6's latency/cost charts,
 * 06_Dashboard_Architecture.md) -- one hue (brand-indigo, the
 * cross-dashboard rule's primary-series color), 2px line with a 10%-opacity
 * area wash, hairline recessive grid, direct end-label, crosshair + tooltip
 * on hover/focus, and a visually-hidden table alternative so the same data
 * is reachable without the pointer -- per the dataviz method's interaction
 * and accessibility rules. No legend: a single series needs none, the
 * title already says what's plotted.
 */
export function LineTrendChart({ title, points, formatValue, emptyLabel }: LineTrendChartProps) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (points.length === 0) return null;

    const times = points.map((p) => new Date(p.timestamp).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeSpan = maxTime - minTime || 1;

    const maxValue = niceMax(Math.max(...points.map((p) => p.value)));
    const innerWidth = WIDTH - PADDING.left - PADDING.right;
    const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

    const positioned = points.map((p, i) => {
      const t = new Date(p.timestamp).getTime();
      const x = PADDING.left + (points.length === 1 ? innerWidth / 2 : ((t - minTime) / timeSpan) * innerWidth);
      const y = PADDING.top + innerHeight - (p.value / maxValue) * innerHeight;
      return { ...p, x, y, index: i };
    });

    const linePath = positioned.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePath} L ${positioned[positioned.length - 1].x} ${PADDING.top + innerHeight} L ${positioned[0].x} ${PADDING.top + innerHeight} Z`;

    return { positioned, maxValue, innerHeight, linePath, areaPath };
  }, [points]);

  if (!chart) {
    return (
      <div className={styles.card}>
        <p className={styles.title}>{title}</p>
        <p className={styles.empty}>{emptyLabel}</p>
      </div>
    );
  }

  const { positioned, maxValue, innerHeight, linePath, areaPath } = chart;
  const hovered = hoverIndex !== null ? positioned[hoverIndex] : null;
  const last = positioned[positioned.length - 1];

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDistance = Infinity;
    positioned.forEach((p, i) => {
      const distance = Math.abs(p.x - pointerX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div className={styles.card}>
      <p className={styles.title}>{title}</p>

      <div className={styles.chartWrap}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={styles.svg}
          role="img"
          aria-label={`${title} over time`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-interactive)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--color-interactive)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((fraction) => {
            const y = PADDING.top + innerHeight * (1 - fraction);
            return (
              <g key={fraction}>
                <line x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y} className={styles.gridline} />
                <text x={WIDTH - PADDING.right + 6} y={y + 4} className={styles.axisLabel}>
                  {formatValue(maxValue * fraction)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path d={linePath} className={styles.line} />

          {hovered && (
            <line
              x1={hovered.x}
              y1={PADDING.top}
              x2={hovered.x}
              y2={PADDING.top + innerHeight}
              className={styles.crosshair}
            />
          )}

          <circle cx={last.x} cy={last.y} r={5} className={styles.endDot} />
          <text x={last.x} y={last.y - 10} className={styles.endLabel} textAnchor="end">
            {formatValue(last.value)}
          </text>

          {(hovered ?? last) && (
            <circle
              cx={(hovered ?? last).x}
              cy={(hovered ?? last).y}
              r={5}
              className={styles.hoverDot}
              style={{ opacity: hovered ? 1 : 0 }}
            />
          )}
        </svg>

        {hovered && (
          <div
            className={styles.tooltip}
            style={{ left: `${(hovered.x / WIDTH) * 100}%` }}
          >
            <p className={styles.tooltipValue}>{formatValue(hovered.value)}</p>
            <p className={styles.tooltipDate}>{formatTimestamp(hovered.timestamp)}</p>
          </div>
        )}
      </div>

      <table className={styles.tableView}>
        <caption>{title} — table view</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.timestamp}>
              <td>{formatTimestamp(p.timestamp)}</td>
              <td>{formatValue(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
