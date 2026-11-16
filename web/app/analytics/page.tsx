"use client";

import { useState } from "react";
import { Chart } from "@/components/Chart";
import { useGuard } from "@/state/guard";

export default function AnalyticsPage() {
  const guard = useGuard();
  const [span, setSpan] = useState(12);
  return (
    <>
      <h1 className="page-title">Analytics</h1>
      <article className="card">
        <div className="card-head">
          <h2>Pool analytics</h2>
          <div className="ranges">
            <button className={span === 4 ? "on" : undefined} type="button" onClick={() => setSpan(4)}>1h</button>
            <button className={span === 12 ? "on" : undefined} type="button" onClick={() => setSpan(12)}>24h</button>
          </div>
        </div>
        <Chart weightWad={guard.weightWad} span={span} />
      </article>
    </>
  );
}
