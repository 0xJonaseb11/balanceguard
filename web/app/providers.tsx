"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { unichainSepolia } from "@/lib/chain";
import { GuardProvider } from "@/state/guard";

const config = createConfig({
  chains: [unichainSepolia],
  connectors: [injected()],
  transports: { [unichainSepolia.id]: http(unichainSepolia.rpcUrls.default.http[0]) },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <GuardProvider>{children}</GuardProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
