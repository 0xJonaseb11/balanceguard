import { defineChain } from "viem";

export const unichainSepolia = defineChain({
  id: 1301,
  name: "Unichain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.unichain.org"] } },
  blockExplorers: { default: { name: "Uniscan", url: "https://sepolia.uniscan.xyz" } },
});

export const stateViewAddress = "0xc199f1072a74d4e905aba1a84d9a45e2546b6222" as const;

export const zeroAddress = "0x0000000000000000000000000000000000000000" as const;

export const hookAbi = [
  {
    type: "function",
    name: "quoteFee",
    stateMutability: "view",
    inputs: [{ name: "zeroForOne", type: "bool" }],
    outputs: [
      { name: "fee", type: "uint24" },
      { name: "weight0Wad", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "strategy",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "targetWad", type: "uint256" },
      { name: "minFee", type: "uint24" },
      { name: "baseFee", type: "uint24" },
      { name: "maxFee", type: "uint24" },
      { name: "slope", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "poolId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "setPaused",
    stateMutability: "nonpayable",
    inputs: [{ name: "nextPaused", type: "bool" }],
    outputs: [],
  },
] as const;

export const stateViewAbi = [
  {
    type: "function",
    name: "getSlot0",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
    ],
  },
  {
    type: "function",
    name: "getLiquidity",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "liquidity", type: "uint128" }],
  },
] as const;

export function hookAddress(): `0x${string}` | undefined {
  const value = process.env.NEXT_PUBLIC_HOOK_ADDRESS;
  if (!value || !value.startsWith("0x") || value.length !== 42) return undefined;
  return value as `0x${string}`;
}

export function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
