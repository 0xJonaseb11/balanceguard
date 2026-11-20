import { formatUnits } from "viem";
import { WAD } from "./feeCurve";

const Q96 = 2n ** 96n;

export const START_AMOUNT0 = 521n * 10n ** 15n;
export const START_AMOUNT1 = 479n * 10n ** 15n;
export const PRICE_ONE = Q96;

export function value0In1(amount0: bigint, sqrtPriceX96: bigint): bigint {
  const partial = (amount0 * sqrtPriceX96) / Q96;
  return (partial * sqrtPriceX96) / Q96;
}

export function weight0(amount0: bigint, amount1: bigint, sqrtPriceX96: bigint = PRICE_ONE): bigint {
  if (amount0 === 0n && amount1 === 0n) {
    throw new Error("Position is empty");
  }
  if (sqrtPriceX96 === 0n) {
    throw new Error("Price is zero");
  }
  const value0 = value0In1(amount0, sqrtPriceX96);
  const total = value0 + amount1;
  if (total === 0n) return 0n;
  return (value0 * WAD) / total;
}

export function positionAmounts(
  liquidity: bigint,
  sqrtPriceX96: bigint,
  sqrtLowerX96: bigint,
  sqrtUpperX96: bigint,
): { amount0: bigint; amount1: bigint } {
  if (sqrtLowerX96 >= sqrtUpperX96) throw new Error("Range is inverted");
  if (sqrtPriceX96 === 0n) throw new Error("Price is zero");
  if (liquidity === 0n) return { amount0: 0n, amount1: 0n };

  if (sqrtPriceX96 <= sqrtLowerX96) {
    return { amount0: amount0Delta(sqrtLowerX96, sqrtUpperX96, liquidity), amount1: 0n };
  }
  if (sqrtPriceX96 >= sqrtUpperX96) {
    return { amount0: 0n, amount1: amount1Delta(sqrtLowerX96, sqrtUpperX96, liquidity) };
  }
  return {
    amount0: amount0Delta(sqrtPriceX96, sqrtUpperX96, liquidity),
    amount1: amount1Delta(sqrtLowerX96, sqrtPriceX96, liquidity),
  };
}

function amount0Delta(sqrtLowX96: bigint, sqrtHighX96: bigint, liquidity: bigint): bigint {
  return ((liquidity << 96n) * (sqrtHighX96 - sqrtLowX96)) / sqrtHighX96 / sqrtLowX96;
}

function amount1Delta(sqrtLowX96: bigint, sqrtHighX96: bigint, liquidity: bigint): bigint {
  return (liquidity * (sqrtHighX96 - sqrtLowX96)) / Q96;
}

export function formatPrice(sqrtPriceX96: bigint): string {
  const scale = 10n ** 4n;
  const scaled = (sqrtPriceX96 * sqrtPriceX96 * scale) / 2n ** 192n;
  const whole = scaled / scale;
  const fraction = (scaled % scale).toString().padStart(4, "0");
  return `${whole.toString()}.${fraction}`;
}

export function formatToken(amount: bigint): string {
  return Number(formatUnits(amount, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function applyTrade(amount0: bigint, amount1: bigint, zeroForOne: boolean, pointsWad: bigint) {
  const moved = zeroForOne ? (pointsWad > amount1 ? amount1 : pointsWad) : pointsWad > amount0 ? amount0 : pointsWad;
  return zeroForOne
    ? { amount0: amount0 + moved, amount1: amount1 - moved }
    : { amount0: amount0 - moved, amount1: amount1 + moved };
}
