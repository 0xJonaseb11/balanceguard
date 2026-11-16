"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { shortAddress, unichainSepolia } from "@/lib/chain";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/strategies", label: "Strategies" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Pool Settings" },
  { href: "/activity", label: "Activity" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onWallet = () => {
    if (!mounted) return;
    if (isConnected && chainId !== unichainSepolia.id) {
      switchChain({ chainId: unichainSepolia.id });
      return;
    }
    if (isConnected) {
      disconnect();
      return;
    }
    const injected = connectors[0];
    if (injected) connect({ connector: injected });
  };

  const walletLabel = !mounted
    ? "Wallet"
    : isConnected && chainId !== unichainSepolia.id
      ? "Switch network"
      : isConnected && address
        ? shortAddress(address)
        : "Connect wallet";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">balance<span>guard</span></div>
        <nav className="nav">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={active ? "active" : undefined}>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot small">
          <div><span className="dot" />{mounted && isConnected ? "Connected" : "Wallet idle"}</div>
          <div className="muted">{mounted && address ? shortAddress(address) : "Unichain Sepolia"}</div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="pill small"><span className="dot" />Unichain Sepolia</div>
          <button className="wallet-btn ready" type="button" onClick={onWallet}>{walletLabel}</button>
        </div>
        {children}
      </main>
    </div>
  );
}
