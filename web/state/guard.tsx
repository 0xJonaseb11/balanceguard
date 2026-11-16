"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { balancedGrowth, formatFee, quote, type FeeParams } from "@/lib/feeCurve";
import { START_AMOUNT0, START_AMOUNT1, applyTrade, weight0 } from "@/lib/inventory";

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
  runSimulation: (zeroForOne: boolean) => void;
  setPaused: (paused: boolean) => void;
};

const GuardContext = createContext<GuardContextValue | null>(null);

const TRADE_POINTS = 20n * 10n ** 15n;

export function GuardProvider({ children }: { children: ReactNode }) {
  const [amount0, setAmount0] = useState(START_AMOUNT0);
  const [amount1, setAmount1] = useState(START_AMOUNT1);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [activity, setActivity] = useState<ActivityItem[]>([
    { id: "fee", text: "Fee adjusted to 0.40%", ago: "2m ago" },
    { id: "strategy", text: "Strategy updated", ago: "10m ago" },
    { id: "liquidity", text: "Liquidity added: $25,000", ago: "15m ago" },
  ]);

  const weightWad = useMemo(() => weight0(amount0, amount1), [amount0, amount1]);
  const fee = paused ? balancedGrowth.baseFee : quote(weightWad, weightWad > balancedGrowth.targetWad, balancedGrowth);

  function runSimulation(zeroForOne: boolean) {
    const next = applyTrade(amount0, amount1, zeroForOne, TRADE_POINTS);
    const nextWeight = weight0(next.amount0, next.amount1);
    const nextFee = quote(nextWeight, zeroForOne, balancedGrowth);
    setAmount0(next.amount0);
    setAmount1(next.amount1);
    setStep(3);
    setActivity((items) => [
      { id: crypto.randomUUID(), text: `Fee adjusted to ${formatFee(nextFee)}`, ago: "just now" },
      ...items,
    ]);
  }

  const value = {
    amount0,
    amount1,
    weightWad,
    fee,
    params: balancedGrowth,
    paused,
    activity,
    step,
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
