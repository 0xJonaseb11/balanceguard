"use client";

import type { Address, Hex } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { hookAbi, routerAbi, tokenAbi } from "@/lib/abi";
import { hookAddress, routerAddress, zeroAddress } from "@/lib/chain";
import type { FeeParams } from "@/lib/feeCurve";

const REFRESH_MS = 12_000;

export type PoolToken = {
  address: Address;
  symbol: string;
  balance?: bigint;
  allowance?: bigint;
};

export type ChainPool = {
  hook: Address;
  router?: Address;
  owner: Address;
  poolId: Hex;
  paused: boolean;
  params: FeeParams;
  quotes: { zeroForOne: number; oneForZero: number };
  weightWad: bigint;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  tickLower: number;
  tickUpper: number;
  token0?: PoolToken;
  token1?: PoolToken;
};

export type ChainPoolState = {
  pool?: ChainPool;
  error?: Error;
  loading: boolean;
  refetch: () => Promise<void>;
};

export function useChainPool(account: Address | undefined): ChainPoolState {
  const hook = hookAddress ?? zeroAddress;
  const router = routerAddress ?? zeroAddress;
  const holder = account ?? zeroAddress;

  const hookReads = useReadContracts({
    allowFailure: false,
    contracts: [
      { address: hook, abi: hookAbi, functionName: "quoteFee", args: [true] },
      { address: hook, abi: hookAbi, functionName: "quoteFee", args: [false] },
      { address: hook, abi: hookAbi, functionName: "paused" },
      { address: hook, abi: hookAbi, functionName: "strategy" },
      { address: hook, abi: hookAbi, functionName: "poolId" },
      { address: hook, abi: hookAbi, functionName: "owner" },
      { address: hook, abi: hookAbi, functionName: "inventory" },
      { address: hook, abi: hookAbi, functionName: "tickLower" },
      { address: hook, abi: hookAbi, functionName: "tickUpper" },
    ],
    query: { enabled: hookAddress !== undefined, refetchInterval: REFRESH_MS },
  });

  const keyRead = useReadContract({
    address: router,
    abi: routerAbi,
    functionName: "poolKey",
    query: { enabled: routerAddress !== undefined },
  });
  const token0 = keyRead.data?.[0];
  const token1 = keyRead.data?.[1];

  const tokenReads = useReadContracts({
    allowFailure: false,
    contracts: [
      { address: token0 ?? zeroAddress, abi: tokenAbi, functionName: "symbol" },
      { address: token1 ?? zeroAddress, abi: tokenAbi, functionName: "symbol" },
      { address: token0 ?? zeroAddress, abi: tokenAbi, functionName: "balanceOf", args: [holder] },
      { address: token1 ?? zeroAddress, abi: tokenAbi, functionName: "balanceOf", args: [holder] },
      { address: token0 ?? zeroAddress, abi: tokenAbi, functionName: "allowance", args: [holder, router] },
      { address: token1 ?? zeroAddress, abi: tokenAbi, functionName: "allowance", args: [holder, router] },
    ],
    query: { enabled: token0 !== undefined && token1 !== undefined, refetchInterval: REFRESH_MS },
  });

  async function refetch(): Promise<void> {
    await Promise.all([hookReads.refetch(), keyRead.refetch(), tokenReads.refetch()]);
  }

  const error = hookReads.error ?? keyRead.error ?? tokenReads.error ?? undefined;
  if (!hookAddress || !hookReads.data) {
    return { error, loading: hookReads.isLoading, refetch };
  }

  const [zeroForOneQuote, oneForZeroQuote, paused, strategy, poolId, owner, inventory, tickLower, tickUpper] =
    hookReads.data;
  const tokens = tokenReads.data;
  const pool: ChainPool = {
    hook: hookAddress,
    router: routerAddress,
    owner,
    poolId,
    paused,
    params: {
      targetWad: strategy[0],
      minFee: strategy[1],
      baseFee: strategy[2],
      maxFee: strategy[3],
      slope: strategy[4],
    },
    quotes: { zeroForOne: zeroForOneQuote[0], oneForZero: oneForZeroQuote[0] },
    weightWad: zeroForOneQuote[1],
    amount0: inventory[0],
    amount1: inventory[1],
    sqrtPriceX96: inventory[2],
    tickLower,
    tickUpper,
    token0:
      token0 && tokens
        ? { address: token0, symbol: tokens[0], balance: account && tokens[2], allowance: account && tokens[4] }
        : undefined,
    token1:
      token1 && tokens
        ? { address: token1, symbol: tokens[1], balance: account && tokens[3], allowance: account && tokens[5] }
        : undefined,
  };
  return { pool, error, loading: false, refetch };
}
