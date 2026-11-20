"use client";

import { useGuard } from "@/state/guard";

export function ChainNotice() {
  const guard = useGuard();
  if (guard.mode === "scenario") {
    return (
      <p className="notice small">
        Showing scenario data. Run the deploy script, which writes the hook address to web/.env.local, then restart the
        dashboard to read the live pool.
      </p>
    );
  }
  if (guard.error) {
    return <p className="notice error small">Could not read the hook. {guard.error}</p>;
  }
  if (!guard.ready) {
    return <p className="notice small">Reading the hook on Unichain Sepolia.</p>;
  }
  return null;
}
