"use client";

import Link from "next/link";
import { formatFee, formatWeight } from "@/lib/feeCurve";
import { useGuard } from "@/state/guard";

export default function StrategiesPage() {
  const guard = useGuard();
  return (
    <>
      <h1 className="page-title">Strategies</h1>
      <article className="card" style={{ maxWidth: 720 }}>
        <div className="card-head">
          <h2>Balanced growth strategy</h2>
          <span className="badge">{guard.paused ? "Paused" : "Active"}</span>
        </div>
        <p className="muted">Keep inventory within 45% to 55% with adaptive fees. The worsening side pays more. The repairing side pays less.</p>
        <div className="bounds">
          <div><div className="muted small">Target ratio</div><strong>50%</strong></div>
          <div><div className="muted small">Min fee</div><strong>{formatFee(guard.params.minFee)}</strong></div>
          <div><div className="muted small">Base fee</div><strong>{formatFee(guard.params.baseFee)}</strong></div>
          <div><div className="muted small">Max fee</div><strong>{formatFee(guard.params.maxFee)}</strong></div>
          <div><div className="muted small">Current weight</div><strong>{formatWeight(guard.weightWad)}</strong></div>
          <div><div className="muted small">Current fee</div><strong>{formatFee(guard.fee)}</strong></div>
        </div>
        <Link href="/settings">Edit pool settings</Link>
      </article>
    </>
  );
}
