"use client";

import { useState } from "react";
import { WAD, formatFee, formatWeight } from "@/lib/feeCurve";
import type { ChartPoint } from "@/lib/series";

const WIDTH = 640;
const HEIGHT = 220;

function toX(position: number): number {
  return position * (WIDTH - 24) + 12;
}

function toY(unit: number): number {
  return HEIGHT - 28 - Math.min(Math.max(unit, 0), 1) * (HEIGHT - 48);
}

function weightUnit(weightWad: bigint): number {
  return Number((weightWad * 10_000n) / WAD) / 10_000;
}

export function Chart({ points, labels, maxFee }: { points: ChartPoint[]; labels: string[]; maxFee: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover !== null && hover < points.length ? hover : points.length - 1;
  const focus = points[active];
  const weightLine = points.map((point) => `${toX(point.position)},${toY(weightUnit(point.weightWad))}`).join(" ");
  const feeLine = points.map((point) => `${toX(point.position)},${toY(point.fee / maxFee)}`).join(" ");
  const slot = Math.max((WIDTH - 24) / Math.max(points.length, 1), 12);

  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Inventory weight and swap fee">
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <line key={level} x1="12" x2={WIDTH - 12} y1={toY(level)} y2={toY(level)} stroke="rgba(255,255,255,0.06)" />
        ))}
        <polyline fill="none" stroke="#a78bfa" strokeWidth="3" points={weightLine} />
        <polyline fill="none" stroke="#f472b6" strokeWidth="3" points={feeLine} />
        {focus ? <circle cx={toX(focus.position)} cy={toY(weightUnit(focus.weightWad))} r="5" fill="#ddd6fe" /> : null}
        {points.map((point, index) => (
          <rect
            key={`${point.position}-${index}`}
            x={toX(point.position) - slot / 2}
            y="0"
            width={slot}
            height={HEIGHT}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}
      </svg>
      {focus ? (
        <div className="tooltip" style={{ left: `${(toX(focus.position) / WIDTH) * 100}%`, top: 36 }}>
          <div>{focus.label}</div>
          <div>Inventory: {formatWeight(focus.weightWad)}</div>
          <div>Fee: {formatFee(focus.fee)}</div>
        </div>
      ) : null}
      <div className="legend" style={{ justifyContent: "space-between" }}>
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}
