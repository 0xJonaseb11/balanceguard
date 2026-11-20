import { useState } from "react";
import type { Hash } from "viem";
import { usePublicClient } from "wagmi";
import { walletErrorMessage } from "./walletError";

export function useTransaction() {
  const client = usePublicClient();
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [hash, setHash] = useState<Hash>();

  async function confirm(pending: Promise<Hash>): Promise<Hash> {
    const sent = await pending;
    setHash(sent);
    if (!client) throw new Error("No RPC client for Unichain Sepolia.");
    setStatus("Waiting for the block");
    const receipt = await client.waitForTransactionReceipt({ hash: sent });
    if (receipt.status !== "success") throw new Error("The transaction reverted.");
    return sent;
  }

  async function run(label: string, action: () => Promise<void>): Promise<boolean> {
    setError(undefined);
    setStatus(label);
    try {
      await action();
      return true;
    } catch (caught) {
      setError(walletErrorMessage(caught));
      return false;
    } finally {
      setStatus(undefined);
    }
  }

  return { status, error, hash, busy: status !== undefined, confirm, run, setStatus, setError };
}
