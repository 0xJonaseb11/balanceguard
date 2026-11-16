import { defineChain } from "viem";

export const unichainSepolia = defineChain({
  id: 1301,
  name: "Unichain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.unichain.org"] } },
  blockExplorers: { default: { name: "Uniscan", url: "https://sepolia.uniscan.xyz" } },
});

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
] as const;

export function hookAddress(): `0x${string}` | undefined {
  const value = process.env.NEXT_PUBLIC_HOOK_ADDRESS;
  if (!value || !value.startsWith("0x") || value.length !== 42) return undefined;
  return value as `0x${string}`;
}

export function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
