import { defineChain, isAddress, type Address, type Hash } from "viem";
import { unichainSepolia as unichainSepoliaBase } from "viem/chains";

const rpcOverride = process.env.NEXT_PUBLIC_RPC_URL;

export const unichainSepolia = rpcOverride
  ? defineChain({ ...unichainSepoliaBase, rpcUrls: { default: { http: [rpcOverride] } } })
  : unichainSepoliaBase;

export const poolManagerAddress: Address = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";

export const zeroAddress: Address = "0x0000000000000000000000000000000000000000";

function readAddress(value: string | undefined): Address | undefined {
  if (!value || !isAddress(value)) return undefined;
  return value;
}

function readBlock(value: string | undefined): bigint | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  return BigInt(value);
}

export const hookAddress = readAddress(process.env.NEXT_PUBLIC_HOOK_ADDRESS);

export const routerAddress = readAddress(process.env.NEXT_PUBLIC_ROUTER_ADDRESS);

export const deployBlock = readBlock(process.env.NEXT_PUBLIC_DEPLOY_BLOCK);

export function addressUrl(address: Address): string {
  return `${unichainSepolia.blockExplorers.default.url}/address/${address}`;
}

export function txUrl(hash: Hash): string {
  return `${unichainSepolia.blockExplorers.default.url}/tx/${hash}`;
}

export function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
