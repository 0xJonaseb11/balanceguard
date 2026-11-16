"use client";

import { hookAddress } from "@/lib/chain";
import { useGuard } from "@/state/guard";

export default function SettingsPage() {
  const guard = useGuard();
  const hook = hookAddress();
  return (
    <>
      <h1 className="page-title">Pool settings</h1>
      <article className="card" style={{ maxWidth: 640 }}>
        <h2>Quoting</h2>
        <p className="muted">Pause returns the flat base fee. The position and the strategy stay in place.</p>
        <button className="primary" style={{ width: "auto", marginTop: 12 }} type="button" onClick={() => guard.setPaused(!guard.paused)}>
          {guard.paused ? "Resume adaptive fees" : "Pause to base fee"}
        </button>
        <p className="small muted">Hook {hook ?? "not configured"}. Set NEXT_PUBLIC_HOOK_ADDRESS after deploy.</p>
      </article>
    </>
  );
}
