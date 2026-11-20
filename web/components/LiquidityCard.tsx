"use client";

import { formatToken } from "@/lib/inventory";
import type { GuardView } from "@/state/guard";

const SCENARIO_LIQUIDITY_USD = 248_720;

export function LiquidityCard({ view }: { view: GuardView }) {
  if (view.mode === "scenario") {
    return (
      <article className="card">
        <div className="stat-label"><span className="icon">◆</span>Total liquidity</div>
        <div className="stat-value">${SCENARIO_LIQUIDITY_USD.toLocaleString("en-US")}</div>
        <div className="up">+8.3%</div>
      </article>
    );
  }
  const position = view.position;
  return (
    <article className="card">
      <div className="stat-label"><span className="icon">◆</span>Position value</div>
      <div className="stat-value">{position ? `${formatToken(position.valueIn1)} ${position.symbol1}` : "Loading"}</div>
      <div className="muted small">
        {position
          ? `${formatToken(position.amount0)} ${position.symbol0} + ${formatToken(position.amount1)} ${position.symbol1}`
          : "Reading the position"}
      </div>
    </article>
  );
}
