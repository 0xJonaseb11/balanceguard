"use client";

import { PauseControl } from "@/components/PauseControl";
import { addressUrl, shortAddress, unichainSepolia } from "@/lib/chain";
import { useGuard } from "@/state/guard";

export default function SettingsPage() {
  const guard = useGuard();
  const pool = guard.pool;
  const contracts = pool
    ? [
        { label: "Hook", address: pool.hook },
        { label: "Router", address: pool.router },
        { label: "Manager", address: pool.owner },
        { label: pool.token0?.symbol ?? "Token0", address: pool.token0?.address },
        { label: pool.token1?.symbol ?? "Token1", address: pool.token1?.address },
      ]
    : [];

  return (
    <>
      <h1 className="page-title">Pool settings</h1>
      <div className="stack" style={{ maxWidth: 720 }}>
        <article className="card">
          <h2>Quoting</h2>
          <p className="muted">Pause returns the flat base fee. The position and the strategy stay in place.</p>
          <p className="small">Status: {guard.paused ? "Paused" : "Adaptive fees on"}</p>
          <PauseControl />
        </article>
        <article className="card">
          <h2>Contracts</h2>
          {guard.mode === "scenario" ? (
            <p className="muted small">
              No hook configured. Run the deploy script. It writes NEXT_PUBLIC_HOOK_ADDRESS and NEXT_PUBLIC_ROUTER_ADDRESS
              to web/.env.local.
            </p>
          ) : (
            <ul className="activity">
              <li><span>Network</span><span className="muted">{unichainSepolia.name} ({unichainSepolia.id})</span></li>
              {contracts.map((entry) => (
                <li key={entry.label}>
                  <span>{entry.label}</span>
                  {entry.address ? (
                    <a className="link" href={addressUrl(entry.address)} target="_blank" rel="noreferrer">
                      {shortAddress(entry.address)}
                    </a>
                  ) : (
                    <span className="muted">Not set</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </>
  );
}
