"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { hookAbi, hookAddress, stateViewAbi, stateViewAddress, zeroAddress } from "@/lib/chain";
import { balancedGrowth, formatFee, quote, WAD, type FeeParams } from "@/lib/feeCurve";
import { START_AMOUNT0, START_AMOUNT1, applyTrade, formatPrice, weight0 } from "@/lib/inventory";

export type ActivityItem = {
  id: string;
  text: string;
  ago: string;
};

type GuardContextValue = {
  amount0: bigint;
  amount1: bigint;
  weightWad: bigint;
  fee: number;
  params: FeeParams;
  paused: boolean;
  activity: ActivityItem[];
  step: 0 | 1 | 2 | 3;
  chainLive: boolean;
  poolLiquidity?: bigint;
  poolPrice?: string;
  canPause: boolean;
  runSimulation: (zeroForOne: boolean) => void;
  setPaused: (paused: boolean) => void;
};

const GuardContext = createContext<GuardContextValue | null>(null);

const TRADE_POINTS = 20n * 10n ** 15n;
const ZERO_POOL = `0x${"0".repeat(64)}` as const;

type QuoteResult = readonly [fee: number | bigint, weight0Wad: bigint];
type StrategyResult = readonly [bigint, number | bigint, number | bigint, number | bigint, bigint];

function strategyParams(value: StrategyResult | undefined): FeeParams {
  if (!value) return balancedGrowth;
  return {
    targetWad: value[0],
    minFee: Number(value[1]),
    baseFee: Number(value[2]),
    maxFee: Number(value[3]),
    slope: value[4],
  };
}

export function GuardProvider({ children }: { children: ReactNode }) {
  const configured = hookAddress();
  const address = configured ?? zeroAddress;
  const enabled = Boolean(configured);
  const { address: account } = useAccount();
  const { writeContract } = useWriteContract();
  const { data } = useReadContracts({
    contracts: [
      { address, abi: hookAbi, functionName: "quoteFee", args: [true] },
      { address, abi: hookAbi, functionName: "quoteFee", args: [false] },
      { address, abi: hookAbi, functionName: "paused" },
      { address, abi: hookAbi, functionName: "strategy" },
      { address, abi: hookAbi, functionName: "poolId" },
      { address, abi: hookAbi, functionName: "owner" },
    ],
    query: { enabled, refetchInterval: 12_000 },
  });

  const quoteZero = data?.[0]?.status === "success" ? (data[0].result as QuoteResult) : undefined;
  const quoteOne = data?.[1]?.status === "success" ? (data[1].result as QuoteResult) : undefined;
  const chainPaused = data?.[2]?.status === "success" ? Boolean(data[2].result) : undefined;
  const params = strategyParams(data?.[3]?.status === "success" ? data[3].result : undefined);
  const poolId = data?.[4]?.status === "success" ? data[4].result : undefined;
  const owner = data?.[5]?.status === "success" ? data[5].result : undefined;
  const poolReady = Boolean(poolId && poolId !== ZERO_POOL);
  const slot0 = useReadContract({
    address: stateViewAddress,
    abi: stateViewAbi,
    functionName: "getSlot0",
    args: poolReady && poolId ? [poolId] : undefined,
    query: { enabled: poolReady, refetchInterval: 12_000 },
  });
  const liquidityRead = useReadContract({
    address: stateViewAddress,
    abi: stateViewAbi,
    functionName: "getLiquidity",
    args: poolReady && poolId ? [poolId] : undefined,
    query: { enabled: poolReady, refetchInterval: 12_000 },
  });

  const chainWeight = quoteZero ? quoteZero[1] : undefined;
  const chainLive = chainWeight !== undefined && quoteOne !== undefined;
  const [amount0, setAmount0] = useState(START_AMOUNT0);
  const [amount1, setAmount1] = useState(START_AMOUNT1);
  const [localPaused, setLocalPaused] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [activity, setActivity] = useState<ActivityItem[]>([
    { id: "fee", text: "Fee adjusted to 0.40%", ago: "2m ago" },
    { id: "strategy", text: "Strategy updated", ago: "10m ago" },
    { id: "liquidity", text: "Liquidity added: $25,000", ago: "15m ago" },
  ]);

  const paused = chainLive && chainPaused !== undefined ? chainPaused : localPaused;
  const weightWad = !simulated && chainWeight !== undefined ? chainWeight : weight0(amount0, amount1);
  const worsening = weightWad > params.targetWad;
  const chainFee = worsening ? Number(quoteZero?.[0]) : Number(quoteOne?.[0]);
  const fee = paused ? params.baseFee : !simulated && chainLive ? chainFee : quote(weightWad, worsening, params);
  const canPause = Boolean(
    chainLive && account && typeof owner === "string" && account.toLowerCase() === owner.toLowerCase(),
  );
  const sqrtPrice = slot0.data?.[0];

  function runSimulation(zeroForOne: boolean) {
    const start0 = simulated || chainWeight === undefined ? amount0 : chainWeight;
    const start1 = simulated || chainWeight === undefined ? amount1 : WAD - chainWeight;
    const next = applyTrade(start0, start1, zeroForOne, TRADE_POINTS);
    const nextWeight = weight0(next.amount0, next.amount1);
    const nextFee = quote(nextWeight, zeroForOne, params);
    setAmount0(next.amount0);
    setAmount1(next.amount1);
    setSimulated(true);
    setStep(3);
    setActivity((items) => [
      { id: crypto.randomUUID(), text: `Fee adjusted to ${formatFee(nextFee)}`, ago: "just now" },
      ...items,
    ]);
  }

  function setPaused(nextPaused: boolean) {
    if (configured && canPause) {
      writeContract({ address: configured, abi: hookAbi, functionName: "setPaused", args: [nextPaused] });
      return;
    }
    if (!chainLive) setLocalPaused(nextPaused);
  }

  const value = {
    amount0,
    amount1,
    weightWad,
    fee,
    params,
    paused,
    activity,
    step,
    chainLive,
    poolLiquidity: liquidityRead.data,
    poolPrice: sqrtPrice !== undefined && sqrtPrice > 0n ? formatPrice(sqrtPrice) : undefined,
    canPause,
    runSimulation,
    setPaused,
  };

  return <GuardContext.Provider value={value}>{children}</GuardContext.Provider>;
}

export function useGuard() {
  const value = useContext(GuardContext);
  if (!value) {
    throw new Error("Guard state is missing");
  }
  return value;
}
