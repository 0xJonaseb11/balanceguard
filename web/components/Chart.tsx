"use client";

import { useState } from "react";
import { formatFee, formatWeight, quote } from "@/lib/feeCurve";

const HOURS = ["12AM", "6AM", "12PM", "6PM", "12AM"];
const SHAPE = [0.42, 0.45, 0.47, 0.46, 0.48, 0.47, 0.49, 0.5, 0.505, 0.51, 0.515, 0.518];

export function Chart({ weightWad, span }: { weightWad: bigint; span: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const live = Number(weightWad) / 1e18;
  const weights = SHAPE.slice(0, span).map((point, index, list) => (index === list.length - 1 ? live : point));
  const fees = weights.map((point) => quote(BigInt(Math.round(point * 1e18)), point > 0.5) / 10_000);
  const width = 640;
  const height = 220;
  const toX = (index: number) => (index / Math.max(weights.length - 1, 1)) * (width - 24) + 12;
  const toY = (value: number) => height - 28 - value * (height - 48);
  const line = (values: number[], scale: (value: number) => number) =>
    values.map((value, index) => `${toX(index)},${toY(scale(value))}`).join(" ");

  const active = hover ?? weights.length - 1;

  return (
    <div style={{ position: "relative" }}>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pool analytics">
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <line key={level} x1="12" x2={width - 12} y1={toY(level)} y2={toY(level)} stroke="rgba(255,255,255,0.06)" />
        ))}
        <polyline fill="none" stroke="#a78bfa" strokeWidth="3" points={line(weights, (value) => value)} />
        <polyline fill="none" stroke="#f472b6" strokeWidth="3" points={line(fees, (value) => value * 80)} />
        <circle cx={toX(active)} cy={toY(weights[active] ?? 0.5)} r="5" fill="#ddd6fe" />
        {weights.map((_, index) => (
          <rect
            key={index}
            x={toX(index) - 16}
            y="0"
            width="32"
            height={height}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}
      </svg>
      <div className="tooltip" style={{ left: `${(toX(active) / width) * 100}%`, top: 36 }}>
        <div>{active === weights.length - 1 ? "Latest" : "Earlier"}</div>
        <div>Inventory: {formatWeight(BigInt(Math.round((weights[active] ?? live) * 1e18)))}</div>
        <div>Fee: {formatFee(Math.round((fees[active] ?? 0) * 10_000))}</div>
      </div>
      <div className="legend" style={{ justifyContent: "space-between" }}>
        {HOURS.map((hour, index) => (
          <span key={`${hour}-${index}`}>{hour}</span>
        ))}
      </div>
    </div>
  );
}
