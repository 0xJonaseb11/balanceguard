"use client";

import { useState } from "react";
import { TradeSteps } from "@/components/TradeSteps";
import type { ScenarioControls } from "@/state/guard";

export function SimulationPanel({ scenario }: { scenario: ScenarioControls }) {
  const [zeroForOne, setZeroForOne] = useState(true);

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h2>Simulation playground</h2>
          <p className="muted small">Test how balanceguard reacts to market conditions.</p>
        </div>
        <button className="primary" style={{ width: "auto" }} type="button" onClick={() => scenario.runSimulation(zeroForOne)}>
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
      <TradeSteps step={scenario.step} />
    </article>
  );
}
