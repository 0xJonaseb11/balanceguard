import { WAD } from "./feeCurve";

const Q96 = 2n ** 96n;

export const START_AMOUNT0 = 521n * 10n ** 15n;
export const START_AMOUNT1 = 479n * 10n ** 15n;
export const PRICE_ONE = Q96;

export function weight0(amount0: bigint, amount1: bigint, sqrtPriceX96: bigint = PRICE_ONE): bigint {
  if (amount0 === 0n && amount1 === 0n) {
    throw new Error("Position is empty");
  }
  if (sqrtPriceX96 === 0n) {
    throw new Error("Price is zero");
  }
  let value0 = (amount0 * sqrtPriceX96) / Q96;
  value0 = (value0 * sqrtPriceX96) / Q96;
  const total = value0 + amount1;
  if (total === 0n) return 0n;
  return (value0 * WAD) / total;
}

export function formatPrice(sqrtPriceX96: bigint): string {
  const scale = 10n ** 4n;
  const scaled = (sqrtPriceX96 * sqrtPriceX96 * scale) / 2n ** 192n;
  const whole = scaled / scale;
  const frac = (scaled % scale).toString().padStart(4, "0");
  return `${whole.toString()}.${frac}`;
}

export function formatLiquidity(value: bigint): string {
  return value.toLocaleString("en-US");
}

export function applyTrade(amount0: bigint, amount1: bigint, zeroForOne: boolean, pointsWad: bigint) {
  const moved = zeroForOne ? (pointsWad > amount1 ? amount1 : pointsWad) : pointsWad > amount0 ? amount0 : pointsWad;
  return zeroForOne
    ? { amount0: amount0 + moved, amount1: amount1 - moved }
    : { amount0: amount0 - moved, amount1: amount1 + moved };
}
