"use client";

import { createContext, useContext, type ReactNode } from "react";
import { hookAddress, txUrl } from "@/lib/chain";
import { balancedGrowth, formatFee, quote, type FeeParams } from "@/lib/feeCurve";
import { formatToken, positionAmounts, value0In1, weight0 } from "@/lib/inventory";
import { formatAgo, historySeries, scenarioSeries, type ChartPoint, type RangeOption } from "@/lib/series";
import { sqrtPriceAtTick } from "@/lib/tickMath";
import { walletErrorMessage } from "@/lib/walletError";
import { useWalletStatus } from "@/lib/useWalletStatus";
import { useChainPool, type ChainPool } from "./useChainPool";
import { useScenario, type ActivityItem, type ScenarioStep } from "./useScenario";
import { useSwapHistory, type SwapHistory } from "./useSwapHistory";

export type { ActivityItem } from "./useScenario";

export type PositionView = {
  amount0: bigint;
  amount1: bigint;
  valueIn1: bigint;
  symbol0: string;
  symbol1: string;
};

export type ScenarioControls = {
  step: ScenarioStep;
  runSimulation: (zeroForOne: boolean) => void;
  setPaused: (paused: boolean) => void;
};

export type GuardView = {
  mode: "scenario" | "chain";
  ready: boolean;
  error?: string;
  weightWad: bigint;
  fee: number;
  quotes: { zeroForOne: number; oneForZero: number };
  params: FeeParams;
  paused: boolean;
  position?: PositionView;
  activity: ActivityItem[];
  series: (range: RangeOption) => ChartPoint[];
  pool?: ChainPool;
  isOwner: boolean;
  scenario?: ScenarioControls;
  refresh: () => Promise<void>;
};

const GuardContext = createContext<GuardView | null>(null);

const CHAIN_SYMBOL0 = "token0";
const CHAIN_SYMBOL1 = "token1";
const HISTORY_LIQUIDITY = 10n ** 18n;

function worseningFee(weightWad: bigint, params: FeeParams): number {
  return quote(weightWad, weightWad > params.targetWad, params);
}

function positionView(pool: ChainPool): PositionView | undefined {
  if (pool.sqrtPriceX96 === 0n) return undefined;
  return {
    amount0: pool.amount0,
    amount1: pool.amount1,
    valueIn1: value0In1(pool.amount0, pool.sqrtPriceX96) + pool.amount1,
    symbol0: pool.token0?.symbol ?? CHAIN_SYMBOL0,
    symbol1: pool.token1?.symbol ?? CHAIN_SYMBOL1,
  };
}

function weightAtPrice(sqrtPriceX96: bigint, pool: ChainPool): bigint {
  const held = positionAmounts(
    HISTORY_LIQUIDITY,
    sqrtPriceX96,
    sqrtPriceAtTick(pool.tickLower),
    sqrtPriceAtTick(pool.tickUpper),
  );
  return weight0(held.amount0, held.amount1, sqrtPriceX96);
}

function chainActivity(history: SwapHistory | undefined, pool: ChainPool | undefined): ActivityItem[] {
  if (!history) return [];
  return [...history.swaps].reverse().map((swap) => {
    const tokenIn = swap.zeroForOne ? pool?.token0?.symbol ?? CHAIN_SYMBOL0 : pool?.token1?.symbol ?? CHAIN_SYMBOL1;
    return {
      id: swap.id,
      text: `Sold ${formatToken(swap.amountIn)} ${tokenIn} at ${formatFee(swap.fee)}`,
      ago: formatAgo(history.nowSeconds - swap.timestamp),
      href: txUrl(swap.txHash),
    };
  });
}

function useChainView(): GuardView {
  const wallet = useWalletStatus();
  const chain = useChainPool(wallet.address);
  const history = useSwapHistory(chain.pool?.poolId);
  const pool = chain.pool;
  const params = pool?.params ?? balancedGrowth;
  const weightWad = pool?.weightWad ?? params.targetWad;
  const paused = pool?.paused ?? false;
  const worseningQuote = weightWad > params.targetWad ? pool?.quotes.zeroForOne : pool?.quotes.oneForZero;
  const failure = chain.error ?? history.error ?? undefined;

  async function refresh(): Promise<void> {
    await Promise.all([chain.refetch(), history.refetch()]);
  }

  function series(range: RangeOption): ChartPoint[] {
    if (!pool || !history.data) return historySeries([], weightWad, range, params);
    const points = history.data.swaps.map((swap) => ({
      secondsAgo: history.data.nowSeconds - swap.timestamp,
      weightWad: weightAtPrice(swap.sqrtPriceX96, pool),
    }));
    return historySeries(points, weightWad, range, params);
  }

  return {
    mode: "chain",
    ready: pool !== undefined,
    error: failure ? walletErrorMessage(failure) : undefined,
    weightWad,
    fee: worseningQuote ?? params.baseFee,
    quotes: pool?.quotes ?? { zeroForOne: params.baseFee, oneForZero: params.baseFee },
    params,
    paused,
    position: pool ? positionView(pool) : undefined,
    activity: chainActivity(history.data, pool),
    series,
    pool,
    isOwner: Boolean(pool && wallet.address && wallet.address.toLowerCase() === pool.owner.toLowerCase()),
    refresh,
  };
}

function useScenarioView(): GuardView {
  const scenario = useScenario();
  const params = balancedGrowth;
  const weightWad = scenario.weightWad;
  const live = worseningFee(weightWad, params);
  const fee = scenario.paused ? params.baseFee : live;

  return {
    mode: "scenario",
    ready: true,
    weightWad,
    fee,
    quotes: {
      zeroForOne: scenario.paused ? params.baseFee : quote(weightWad, true, params),
      oneForZero: scenario.paused ? params.baseFee : quote(weightWad, false, params),
    },
    params,
    paused: scenario.paused,
    activity: scenario.activity,
    series: (range) => scenarioSeries(weightWad, range, params),
    isOwner: false,
    scenario: { step: scenario.step, runSimulation: scenario.runSimulation, setPaused: scenario.setPaused },
    refresh: async () => {},
  };
}

function ChainGuard({ children }: { children: ReactNode }) {
  return <GuardContext.Provider value={useChainView()}>{children}</GuardContext.Provider>;
}

function ScenarioGuard({ children }: { children: ReactNode }) {
  return <GuardContext.Provider value={useScenarioView()}>{children}</GuardContext.Provider>;
}

export function GuardProvider({ children }: { children: ReactNode }) {
  if (hookAddress) return <ChainGuard>{children}</ChainGuard>;
  return <ScenarioGuard>{children}</ScenarioGuard>;
}

export function useGuard(): GuardView {
  const value = useContext(GuardContext);
  if (!value) {
    throw new Error("Guard state is missing");
  }
  return value;
}
