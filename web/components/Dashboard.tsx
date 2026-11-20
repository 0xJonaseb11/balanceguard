"use client";

import Link from "next/link";
import { ActivityList } from "@/components/ActivityList";
import { LiquidityCard } from "@/components/LiquidityCard";
import { PoolAnalytics } from "@/components/PoolAnalytics";
import { SimulationPanel } from "@/components/SimulationPanel";
import { TradePanel } from "@/components/TradePanel";
import { WAD, bandCopy, formatFee, formatFeeDelta, formatWeight, riskLabel } from "@/lib/feeCurve";
import { useGuard } from "@/state/guard";

export function Dashboard() {
  const guard = useGuard();
  const weightPercent = formatWeight(guard.weightWad);
  const otherPercent = formatWeight(WAD - guard.weightWad);
  const risk = guard.paused ? "Low" : riskLabel(guard.weightWad, guard.params);
  const status = risk === "Low" ? "On target" : risk === "Medium" ? "Outside band" : "At the cap";
  const loading = !guard.ready;

  return (
    <>
      <h1>Welcome to <em>balanceguard</em></h1>
      <p className="lede">Smarter liquidity. Greater control.</p>
      <section className="grid-4">
        <LiquidityCard view={guard} />
        <article className="card">
          <div className="stat-label"><span className="icon">⚖</span>Inventory balance</div>
          <div className="stat-value">{loading ? "Loading" : `${weightPercent} / ${otherPercent}`}</div>
          <div className="up">{status}</div>
        </article>
        <article className="card">
          <div className="stat-label"><span className="icon">%</span>Current fee</div>
          <div className="stat-value">{loading ? "Loading" : formatFee(guard.fee)}</div>
          <div className="up">{formatFeeDelta(guard.fee, guard.params.baseFee)}</div>
        </article>
        <article className="card">
          <div className="stat-label"><span className="icon">▣</span>Risk level</div>
          <div className="stat-value">{risk}</div>
          <div className={`risk-bar ${risk.toLowerCase()}`}><span /></div>
        </article>
      </section>
      <section className="grid-2">
        <div className="stack">
          <PoolAnalytics />
          {guard.scenario ? <SimulationPanel scenario={guard.scenario} /> : <TradePanel />}
        </div>
        <div className="stack">
          <article className="card">
            <div className="card-head">
              <h2>Active strategy</h2>
              <span className="badge">{guard.paused ? "Paused" : "Active"}</span>
            </div>
            <h3 className="strategy-title">Balanced growth strategy</h3>
            <p className="muted">{bandCopy(guard.params)}</p>
            <div className="bounds">
              <div><div className="muted small">Target ratio</div><strong>{formatWeight(guard.params.targetWad)}</strong></div>
              <div><div className="muted small">Min fee</div><strong>{formatFee(guard.params.minFee)}</strong></div>
              <div><div className="muted small">Max fee</div><strong>{formatFee(guard.params.maxFee)}</strong></div>
            </div>
            <Link className="primary" href="/strategies" style={{ display: "block", textAlign: "center" }}>Manage strategy</Link>
          </article>
          <article className="card">
            <div className="card-head">
              <h2>Recent activity</h2>
              <Link className="muted small" href="/activity">View all</Link>
            </div>
            <ActivityList limit={3} />
          </article>
        </div>
      </section>
    </>
  );
}
