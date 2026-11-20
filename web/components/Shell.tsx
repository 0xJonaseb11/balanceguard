"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChainNotice } from "@/components/ChainNotice";
import { WalletButton } from "@/components/WalletButton";
import { shortAddress } from "@/lib/chain";
import { useWalletStatus } from "@/lib/useWalletStatus";
import { useGuard } from "@/state/guard";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/strategies", label: "Strategies" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Pool Settings" },
  { href: "/activity", label: "Activity" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const wallet = useWalletStatus();
  const guard = useGuard();

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
          <div><span className={wallet.connected ? "dot" : "dot idle"} />{wallet.connected ? "Connected" : "Wallet idle"}</div>
          <div className="muted">{wallet.address ? shortAddress(wallet.address) : "Unichain Sepolia"}</div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="pill small">
            <span className={guard.mode === "chain" ? "dot" : "dot idle"} />
            {guard.mode === "chain" ? "Live pool" : "Scenario data"}
          </div>
          <div className="pill small"><span className="dot" />Unichain Sepolia</div>
          <WalletButton />
        </div>
        <ChainNotice />
        {children}
      </main>
    </div>
  );
}
