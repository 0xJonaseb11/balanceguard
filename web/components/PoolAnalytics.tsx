"use client";

import { useState } from "react";
import { Chart } from "@/components/Chart";
import { formatPrice } from "@/lib/inventory";
import { RANGES, rangeLabels, type RangeOption } from "@/lib/series";
import { useGuard } from "@/state/guard";

export function PoolAnalytics() {
  const guard = useGuard();
  const [range, setRange] = useState<RangeOption>(RANGES[1]);
  const pool = guard.pool;

  return (
    <article className="card">
      <div className="card-head">
        <h2>Pool analytics</h2>
        <div className="ranges">
          {RANGES.map((option) => (
            <button
              key={option.label}
              className={range.label === option.label ? "on" : undefined}
              type="button"
              onClick={() => setRange(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {pool && pool.sqrtPriceX96 > 0n ? (
        <p className="muted small">
          Pool price {formatPrice(pool.sqrtPriceX96)} {pool.token1?.symbol ?? "token1"} per {pool.token0?.symbol ?? "token0"}
        </p>
      ) : null}
      <div className="legend">
        <span><i className="swatch inv" />Inventory balance</span>
        <span><i className="swatch fee" />Swap fee, scaled to the max fee</span>
      </div>
      <Chart points={guard.series(range)} labels={rangeLabels(range)} maxFee={guard.params.maxFee} />
    </article>
  );
}
