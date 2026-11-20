import { quote, type FeeParams } from "./feeCurve";

export type ChartPoint = {
  position: number;
  weightWad: bigint;
  fee: number;
  label: string;
};

export type HistoryPoint = {
  secondsAgo: number;
  weightWad: bigint;
};

export const RANGES = [
  { label: "1h", seconds: 3_600, scenarioPoints: 4 },
  { label: "24h", seconds: 86_400, scenarioPoints: 12 },
  { label: "7d", seconds: 604_800, scenarioPoints: 18 },
  { label: "30d", seconds: 2_592_000, scenarioPoints: 24 },
] as const;

export type RangeOption = (typeof RANGES)[number];

const SCENARIO_SHAPE = [
  0.42, 0.45, 0.47, 0.46, 0.48, 0.47, 0.49, 0.5, 0.505, 0.51, 0.515, 0.518, 0.522, 0.519, 0.516, 0.52, 0.524, 0.521,
  0.518, 0.523, 0.527, 0.524, 0.52, 0.521,
];

export function formatAgo(seconds: number): string {
  if (seconds < 60) return "just now";
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

export function rangeLabels(range: RangeOption): string[] {
  return [4, 3, 2, 1].map((quarter) => formatAgo((range.seconds * quarter) / 4)).concat("Now");
}

function point(position: number, weightWad: bigint, label: string, params: FeeParams): ChartPoint {
  return { position, weightWad, fee: quote(weightWad, weightWad > params.targetWad, params), label };
}

export function scenarioSeries(liveWeightWad: bigint, range: RangeOption, params: FeeParams): ChartPoint[] {
  const shape = SCENARIO_SHAPE.slice(-range.scenarioPoints);
  const last = shape.length - 1;
  return shape.map((value, index) => {
    const secondsAgo = ((last - index) / last) * range.seconds;
    const weightWad = index === last ? liveWeightWad : BigInt(Math.round(value * 1e6)) * 10n ** 12n;
    return point(index / last, weightWad, index === last ? "Now" : formatAgo(secondsAgo), params);
  });
}

export function historySeries(
  history: HistoryPoint[],
  liveWeightWad: bigint,
  range: RangeOption,
  params: FeeParams,
): ChartPoint[] {
  const ordered = [...history].sort((left, right) => right.secondsAgo - left.secondsAgo);
  const before = ordered.filter((entry) => entry.secondsAgo > range.seconds).at(-1);
  const inside = ordered.filter((entry) => entry.secondsAgo <= range.seconds);
  const startWeight = before?.weightWad ?? (inside.length > 0 ? params.targetWad : liveWeightWad);
  const steps: ChartPoint[] = [point(0, startWeight, formatAgo(range.seconds), params)];
  let heldWeight = startWeight;
  for (const entry of inside) {
    const position = 1 - entry.secondsAgo / range.seconds;
    const label = formatAgo(entry.secondsAgo);
    steps.push(point(position, heldWeight, label, params), point(position, entry.weightWad, label, params));
    heldWeight = entry.weightWad;
  }
  steps.push(point(1, liveWeightWad, "Now", params));
  return steps;
}
