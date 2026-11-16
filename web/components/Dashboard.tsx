"use client";

import Link from "next/link";
import { useState } from "react";
import { Chart } from "@/components/Chart";
import { formatFee, formatFeeDelta, formatWeight, riskLabel } from "@/lib/feeCurve";
import { useGuard } from "@/state/guard";

const LIQUIDITY_USD = 248_720;

export function Dashboard() {
  const guard = useGuard();
  const [range, setRange] = useState("24h");
  const span = range === "1h" ? 4 : 12;
  const [zeroForOne, setZeroForOne] = useState(true);
  const other = 1 - Number(guard.weightWad) / 1e18;
  const risk = guard.paused ? "Low" : riskLabel(guard.weightWad, guard.params);
  const status = risk === "Low" ? "On target" : risk === "Medium" ? "Outside band" : "At the cap";

  return (
    <>
      <h1>Welcome to <em>balanceguard</em></h1>
      <p className="lede">Smarter liquidity. Greater control.</p>
      <section className="grid-4">
        <article className="card">
          <div className="stat-label"><span className="icon">◆</span>Total liquidity</div>
          <div className="stat-value">${LIQUIDITY_USD.toLocaleString("en-US")}</div>
          <div className="up">+8.3%</div>
        </article>
        <article className="card">
          <div className="stat-label"><span className="icon">⚖</span>Inventory balance</div>
          <div className="stat-value">{formatWeight(guard.weightWad)} / {(other * 100).toFixed(1)}%</div>
          <div className="up">{status}</div>
        </article>
        <article className="card">
          <div className="stat-label"><span className="icon">%</span>Current fee</div>
          <div className="stat-value">{formatFee(guard.fee)}</div>
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
          <article className="card">
            <div className="card-head">
              <h2>Pool analytics</h2>
              <div className="ranges">
                {["1h", "24h", "7d", "30d"].map((label) => (
                  <button key={label} className={range === label ? "on" : undefined} type="button" onClick={() => setRange(label)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="legend">
              <span><i className="swatch inv" />Inventory balance</span>
              <span><i className="swatch fee" />Swap fee</span>
            </div>
            <Chart weightWad={guard.weightWad} span={span} />
          </article>
          <article className="card">
            <div className="card-head">
              <div>
                <h2>Simulation playground</h2>
                <p className="muted small">Test how balanceguard reacts to market conditions.</p>
              </div>
              <button className="primary" style={{ width: "auto" }} type="button" onClick={() => guard.runSimulation(zeroForOne)}>
                Run simulation
              </button>
            </div>
            <label className="field" style={{ maxWidth: 220 }}>
              Trade direction
              <select className="plain" value={zeroForOne ? "0" : "1"} onChange={(event) => setZeroForOne(event.target.value === "0")}>
                <option value="0">Sell token0</option>
                <option value="1">Sell token1</option>
              </select>
            </label>
            <div className="steps">
              {["Trigger trade", "Watch adjustment", "See results"].map((label, index) => (
                <div key={label} className={guard.step >= index + 1 ? "step on" : "step"}>
                  <strong>{index + 1}</strong>
                  {label}
                </div>
              ))}
            </div>
          </article>
        </div>
        <div className="stack">
          <article className="card">
            <div className="card-head">
              <h2>Active strategy</h2>
              <span className="badge">{guard.paused ? "Paused" : "Active"}</span>
            </div>
            <h3 className="strategy-title">Balanced growth strategy</h3>
            <p className="muted">Keep inventory within 45% to 55% with adaptive fees.</p>
            <div className="bounds">
              <div><div className="muted small">Target ratio</div><strong>50%</strong></div>
              <div><div className="muted small">Min fee</div><strong>0.05%</strong></div>
              <div><div className="muted small">Max fee</div><strong>0.50%</strong></div>
            </div>
            <Link className="primary" href="/strategies" style={{ display: "block", textAlign: "center" }}>Manage strategy</Link>
          </article>
          <article className="card">
            <div className="card-head">
              <h2>Recent activity</h2>
              <Link className="muted small" href="/activity">View all</Link>
            </div>
            <ul className="activity">
              {guard.activity.slice(0, 3).map((item) => (
                <li key={item.id}><span><span className="dot" />{item.text}</span><span className="muted">{item.ago}</span></li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
