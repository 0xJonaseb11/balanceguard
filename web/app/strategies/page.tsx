"use client";

import Link from "next/link";
import { StrategyForm } from "@/components/StrategyForm";
import { bandCopy, formatFee, formatWeight } from "@/lib/feeCurve";
import { useGuard } from "@/state/guard";

export default function StrategiesPage() {
  const guard = useGuard();
  const params = guard.params;
  const paramsKey = `${params.targetWad}-${params.minFee}-${params.baseFee}-${params.maxFee}-${params.slope}`;

  return (
    <>
      <h1 className="page-title">Strategies</h1>
      <div className="stack" style={{ maxWidth: 720 }}>
        <article className="card">
          <div className="card-head">
            <h2>Balanced growth strategy</h2>
            <span className="badge">{guard.paused ? "Paused" : "Active"}</span>
          </div>
          <p className="muted">{bandCopy(params)} The worsening side pays more. The repairing side pays less.</p>
          <div className="bounds">
            <div><div className="muted small">Target ratio</div><strong>{formatWeight(params.targetWad)}</strong></div>
            <div><div className="muted small">Min fee</div><strong>{formatFee(params.minFee)}</strong></div>
            <div><div className="muted small">Base fee</div><strong>{formatFee(params.baseFee)}</strong></div>
            <div><div className="muted small">Max fee</div><strong>{formatFee(params.maxFee)}</strong></div>
            <div><div className="muted small">Current weight</div><strong>{formatWeight(guard.weightWad)}</strong></div>
            <div><div className="muted small">Current fee</div><strong>{formatFee(guard.fee)}</strong></div>
          </div>
          <Link className="link" href="/settings">Edit pool settings</Link>
        </article>
        {guard.mode === "chain" && guard.ready ? (
          <article className="card">
            <h2>Retune bounds</h2>
            <p className="muted small">The hook checks these bounds again on chain. The fee always stays between min and max.</p>
            <StrategyForm key={paramsKey} />
          </article>
        ) : null}
      </div>
    </>
  );
}
