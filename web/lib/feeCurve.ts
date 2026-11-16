export const WAD = 10n ** 18n;

export type FeeParams = {
  targetWad: bigint;
  minFee: number;
  baseFee: number;
  maxFee: number;
  slope: bigint;
};

export const balancedGrowth: FeeParams = {
  targetWad: WAD / 2n,
  minFee: 500,
  baseFee: 3000,
  maxFee: 5000,
  slope: 23810n,
};

export function quote(weight0Wad: bigint, zeroForOne: boolean, params: FeeParams = balancedGrowth): number {
  if (weight0Wad > WAD) {
    throw new Error("Weight is above one");
  }
  const pressure = weight0Wad > params.targetWad ? weight0Wad - params.targetWad : params.targetWad - weight0Wad;
  const adjustment = (params.slope * pressure) / WAD;
  const worsens = zeroForOne === weight0Wad > params.targetWad;
  const base = BigInt(params.baseFee);
  let fee = worsens ? base + adjustment : adjustment >= base ? 0n : base - adjustment;
  if (fee < BigInt(params.minFee)) fee = BigInt(params.minFee);
  if (fee > BigInt(params.maxFee)) fee = BigInt(params.maxFee);
  return Number(fee);
}

export function formatFee(fee: number): string {
  return `${(fee / 10_000).toFixed(2)}%`;
}

export function formatFeeDelta(fee: number, baseFee: number): string {
  const delta = (fee - baseFee) / 10_000;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}%`;
}

export function formatWeight(weightWad: bigint): string {
  return `${(Number(weightWad) / 1e18 * 100).toFixed(1)}%`;
}

export function riskLabel(weightWad: bigint, params: FeeParams = balancedGrowth): "Low" | "Medium" | "High" {
  const distance = weightWad > params.targetWad ? weightWad - params.targetWad : params.targetWad - weightWad;
  const band = (5n * WAD) / 100n;
  if (distance <= band) return "Low";
  const worsening = weightWad > params.targetWad;
  const fee = quote(weightWad, worsening, params);
  if (fee >= params.maxFee) return "High";
  return "Medium";
}
