"use client";

import { useWriteContract } from "wagmi";
import { hookAbi } from "@/lib/abi";
import { txUrl } from "@/lib/chain";
import { useTransaction } from "@/lib/useTransaction";
import { useWalletStatus } from "@/lib/useWalletStatus";
import { useGuard } from "@/state/guard";

function pauseBlocker(isOwner: boolean, connected: boolean, wrongChain: boolean): string | undefined {
  if (!connected) return "Connect the manager wallet to pause.";
  if (wrongChain) return "Switch the wallet to Unichain Sepolia.";
  if (!isOwner) return "Only the manager can pause.";
  return undefined;
}

export function PauseControl() {
  const guard = useGuard();
  const wallet = useWalletStatus();
  const write = useWriteContract();
  const tx = useTransaction();
  const label = guard.paused ? "Resume adaptive fees" : "Pause to base fee";

  if (guard.scenario) {
    const scenario = guard.scenario;
    return (
      <button className="primary" style={{ width: "auto" }} type="button" onClick={() => scenario.setPaused(!guard.paused)}>
        {label}
      </button>
    );
  }

  const blocker = pauseBlocker(guard.isOwner, wallet.connected, wallet.wrongChain);
  const hook = guard.pool?.hook;

  function toggle() {
    if (!hook) return;
    const nextPaused = !guard.paused;
    void tx.run("Confirm in your wallet", async () => {
      await tx.confirm(write.mutateAsync({ address: hook, abi: hookAbi, functionName: "setPaused", args: [nextPaused] }));
      await guard.refresh();
    });
  }

  return (
    <>
      <button className="primary" style={{ width: "auto" }} type="button" disabled={Boolean(blocker) || tx.busy || !hook} onClick={toggle}>
        {tx.busy ? "Working" : label}
      </button>
      {blocker ? <p className="muted small">{blocker}</p> : null}
      {tx.status ? <p className="small">{tx.status}.</p> : null}
      {tx.error ? <p className="wallet-error small">{tx.error}</p> : null}
      {tx.hash ? (
        <p className="small"><a className="link" href={txUrl(tx.hash)} target="_blank" rel="noreferrer">Last transaction</a></p>
      ) : null}
    </>
  );
}
