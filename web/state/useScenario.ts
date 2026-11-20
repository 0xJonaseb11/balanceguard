"use client";

import { useState } from "react";
import { balancedGrowth, formatFee, quote } from "@/lib/feeCurve";
import { START_AMOUNT0, START_AMOUNT1, applyTrade, weight0 } from "@/lib/inventory";

const TRADE_POINTS = 20n * 10n ** 15n;

export type ActivityItem = {
  id: string;
  text: string;
  ago: string;
  href?: string;
};

export type ScenarioStep = 0 | 1 | 2 | 3;

export function useScenario() {
  const [amount0, setAmount0] = useState(START_AMOUNT0);
  const [amount1, setAmount1] = useState(START_AMOUNT1);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState<ScenarioStep>(0);
  const [activity, setActivity] = useState<ActivityItem[]>([
    { id: "fee", text: "Fee adjusted to 0.40%", ago: "2m ago" },
    { id: "strategy", text: "Strategy updated", ago: "10m ago" },
    { id: "liquidity", text: "Liquidity added: $25,000", ago: "15m ago" },
  ]);
  const weightWad = weight0(amount0, amount1);

  function runSimulation(zeroForOne: boolean) {
    const next = applyTrade(amount0, amount1, zeroForOne, TRADE_POINTS);
    const nextWeight = weight0(next.amount0, next.amount1);
    const nextFee = quote(nextWeight, nextWeight > balancedGrowth.targetWad, balancedGrowth);
    setAmount0(next.amount0);
    setAmount1(next.amount1);
    setStep(3);
    setActivity((items) => [
      { id: crypto.randomUUID(), text: `Fee adjusted to ${formatFee(nextFee)}`, ago: "just now" },
      ...items,
    ]);
  }

  return { weightWad, paused, setPaused, step, activity, runSimulation };
}
