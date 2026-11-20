"use client";

import { useQuery } from "@tanstack/react-query";
import type { Hash, Hex } from "viem";
import { usePublicClient } from "wagmi";
import { swapEvent } from "@/lib/abi";
import { deployBlock, poolManagerAddress, unichainSepolia } from "@/lib/chain";

const LOOKBACK_BLOCKS = 50_000n;
const MAX_SWAPS = 60;
const blockTimes = new Map<bigint, number>();

export type SwapRecord = {
  id: string;
  txHash: Hash;
  timestamp: number;
  zeroForOne: boolean;
  amountIn: bigint;
  fee: number;
  sqrtPriceX96: bigint;
};

export type SwapHistory = {
  nowSeconds: number;
  swaps: SwapRecord[];
};

function startBlock(latest: bigint): bigint {
  if (deployBlock !== undefined) return deployBlock;
  return latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
}

export function useSwapHistory(poolId: Hex | undefined) {
  const client = usePublicClient({ chainId: unichainSepolia.id });
  return useQuery({
    queryKey: ["swaps", poolId],
    enabled: client !== undefined && poolId !== undefined,
    refetchInterval: 15_000,
    queryFn: async (): Promise<SwapHistory> => {
      if (!client || !poolId) throw new Error("Pool is not ready");
      const latest = await client.getBlock();
      const logs = await client.getLogs({
        address: poolManagerAddress,
        event: swapEvent,
        args: { id: poolId },
        fromBlock: startBlock(latest.number),
        toBlock: latest.number,
        strict: true,
      });
      const recent = logs.slice(-MAX_SWAPS);
      const missing = [...new Set(recent.map((log) => log.blockNumber))].filter((block) => !blockTimes.has(block));
      await Promise.all(
        missing.map(async (blockNumber) => {
          const block = await client.getBlock({ blockNumber });
          blockTimes.set(blockNumber, Number(block.timestamp));
        }),
      );
      const swaps = recent.map((log) => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        txHash: log.transactionHash,
        timestamp: blockTimes.get(log.blockNumber) ?? Number(latest.timestamp),
        zeroForOne: log.args.amount0 < 0n,
        amountIn: log.args.amount0 < 0n ? -log.args.amount0 : -log.args.amount1,
        fee: log.args.fee,
        sqrtPriceX96: log.args.sqrtPriceX96,
      }));
      return { nowSeconds: Number(latest.timestamp), swaps };
    },
  });
}
