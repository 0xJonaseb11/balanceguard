"use client";

import { useState } from "react";
import { maxUint256, parseUnits, type Address } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { TradeSteps } from "@/components/TradeSteps";
import { routerAbi, tokenAbi } from "@/lib/abi";
import { txUrl, unichainSepolia } from "@/lib/chain";
import { formatFee } from "@/lib/feeCurve";
import { formatToken } from "@/lib/inventory";
import { useTransaction } from "@/lib/useTransaction";
import { useWalletStatus } from "@/lib/useWalletStatus";
import type { ChainPool, PoolToken } from "@/state/useChainPool";
import { useGuard } from "@/state/guard";

const SLIPPAGE_BPS = 100n;
const AMOUNT_PATTERN = /^\d+(\.\d{1,18})?$/;

function parseAmount(value: string): bigint {
  const trimmed = value.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) throw new Error("Enter an amount such as 1 or 2.5.");
  const amount = parseUnits(trimmed, 18);
  if (amount === 0n) throw new Error("Enter an amount above zero.");
  return amount;
}

function tradeBlocker(pool: ChainPool | undefined, connected: boolean, wrongChain: boolean): string | undefined {
  if (!pool) return "Reading the pool.";
  if (!pool.router) return "Set NEXT_PUBLIC_ROUTER_ADDRESS to trade against the pool.";
  if (!pool.token0 || !pool.token1) return "Reading the pool tokens.";
  if (!connected) return "Connect a wallet to trade.";
  if (wrongChain) return "Switch the wallet to Unichain Sepolia.";
  return undefined;
}

export function TradePanel() {
  const guard = useGuard();
  const pool = guard.pool;
  const wallet = useWalletStatus();
  const client = usePublicClient({ chainId: unichainSepolia.id });
  const write = useWriteContract();
  const tx = useTransaction();
  const [zeroForOne, setZeroForOne] = useState(true);
  const [amount, setAmount] = useState("1");
  const [step, setStep] = useState(0);
  const blocker = tradeBlocker(pool, wallet.connected, wallet.wrongChain);
  const tokenIn = zeroForOne ? pool?.token0 : pool?.token1;
  const tokenOut = zeroForOne ? pool?.token1 : pool?.token0;
  const directionFee = zeroForOne ? guard.quotes.zeroForOne : guard.quotes.oneForZero;

  async function approveIfNeeded(token: PoolToken, router: Address, amountIn: bigint) {
    if ((token.allowance ?? 0n) >= amountIn) return;
    tx.setStatus(`Approve ${token.symbol} in your wallet`);
    await tx.confirm(
      write.mutateAsync({ address: token.address, abi: tokenAbi, functionName: "approve", args: [router, maxUint256] }),
    );
  }

  async function quoteMinimumOut(router: Address, account: Address, amountIn: bigint): Promise<bigint> {
    if (!client) throw new Error("No RPC client for Unichain Sepolia.");
    const simulation = await client.simulateContract({
      account,
      address: router,
      abi: routerAbi,
      functionName: "swapExactIn",
      args: [zeroForOne, amountIn, 0n],
    });
    return (simulation.result * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  }

  function claimTokens() {
    if (!pool?.token0 || !pool.token1) return;
    const tokens = [pool.token0, pool.token1];
    void tx.run("Mint test tokens in your wallet", async () => {
      for (const token of tokens) {
        tx.setStatus(`Mint ${token.symbol} in your wallet`);
        await tx.confirm(write.mutateAsync({ address: token.address, abi: tokenAbi, functionName: "faucet" }));
      }
      await guard.refresh();
    });
  }

  function trade() {
    const router = pool?.router;
    const account = wallet.address;
    if (!router || !account || !tokenIn) return;
    setStep(0);
    void tx.run("Preparing the trade", async () => {
      const amountIn = parseAmount(amount);
      if ((tokenIn.balance ?? 0n) < amountIn) {
        throw new Error(`Not enough ${tokenIn.symbol}. Use Get test tokens first.`);
      }
      await approveIfNeeded(tokenIn, router, amountIn);
      const minimumOut = await quoteMinimumOut(router, account, amountIn);
      tx.setStatus("Confirm the trade in your wallet");
      const pending = write.mutateAsync({
        address: router,
        abi: routerAbi,
        functionName: "swapExactIn",
        args: [zeroForOne, amountIn, minimumOut],
      });
      setStep(1);
      await tx.confirm(pending);
      setStep(2);
      await guard.refresh();
      setStep(3);
    });
  }

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h2>Trade playground</h2>
          <p className="muted small">Swap against the live pool and watch the hook move the fee.</p>
        </div>
        <button className="ghost" type="button" disabled={Boolean(blocker) || tx.busy} onClick={claimTokens}>
          Get test tokens
        </button>
      </div>
      <div className="trade-row">
        <label className="field">
          Trade direction
          <select className="plain" value={zeroForOne ? "0" : "1"} onChange={(event) => setZeroForOne(event.target.value === "0")}>
            <option value="0">Sell {pool?.token0?.symbol ?? "token0"}</option>
            <option value="1">Sell {pool?.token1?.symbol ?? "token1"}</option>
          </select>
        </label>
        <label className="field">
          Amount
          <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <button className="primary" type="button" disabled={Boolean(blocker) || tx.busy} onClick={trade}>
          {tx.busy ? "Working" : "Run trade"}
        </button>
      </div>
      <p className="muted small">
        This direction pays {formatFee(directionFee)} now.
        {tokenIn?.balance !== undefined ? ` Balance ${formatToken(tokenIn.balance)} ${tokenIn.symbol}.` : ""}
        {tokenOut ? ` You receive ${tokenOut.symbol}.` : ""}
      </p>
      {blocker ? <p className="muted small">{blocker}</p> : null}
      {tx.status ? <p className="small">{tx.status}.</p> : null}
      {tx.error ? <p className="wallet-error small">{tx.error}</p> : null}
      {tx.hash ? (
        <p className="small">
          <a className="link" href={txUrl(tx.hash)} target="_blank" rel="noreferrer">Last transaction</a>
        </p>
      ) : null}
      <TradeSteps step={step} />
    </article>
  );
}
