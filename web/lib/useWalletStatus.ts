import type { Address } from "viem";
import { useConnection } from "wagmi";
import { unichainSepolia } from "./chain";
import { useMounted } from "./useMounted";

export type WalletStatus = {
  address?: Address;
  connected: boolean;
  wrongChain: boolean;
  ready: boolean;
};

export function useWalletStatus(): WalletStatus {
  const mounted = useMounted();
  const { address, chainId, isConnected } = useConnection();
  const connected = mounted && isConnected && address !== undefined;
  const wrongChain = connected && chainId !== unichainSepolia.id;
  return { address: connected ? address : undefined, connected, wrongChain, ready: connected && !wrongChain };
}
