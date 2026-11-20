"use client";

import { useState } from "react";
import { useConnect, useConnectors, useDisconnect, useSwitchChain, type Connector } from "wagmi";
import { addressUrl, shortAddress, unichainSepolia } from "@/lib/chain";
import { useMounted } from "@/lib/useMounted";
import { useWalletStatus } from "@/lib/useWalletStatus";
import { walletErrorMessage } from "@/lib/walletError";

function walletChoices(connectors: readonly Connector[]): Connector[] {
  const discovered = connectors.filter((connector) => connector.id !== "injected");
  return discovered.length > 0 ? discovered : [...connectors];
}

export function WalletButton() {
  const mounted = useMounted();
  const wallet = useWalletStatus();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const [open, setOpen] = useState(false);
  const failure = connect.error ?? switchChain.error;

  if (!mounted) {
    return <button className="wallet-btn" type="button" disabled>Wallet</button>;
  }

  function toggleMenu() {
    connect.reset();
    switchChain.reset();
    setOpen((value) => !value);
  }

  function choose(connector: Connector) {
    setOpen(false);
    connect.mutate({ connector, chainId: unichainSepolia.id });
  }

  if (wallet.wrongChain) {
    return (
      <div className="wallet">
        <button
          className="wallet-btn warn"
          type="button"
          disabled={switchChain.isPending}
          onClick={() => switchChain.mutate({ chainId: unichainSepolia.id })}
        >
          {switchChain.isPending ? "Check your wallet" : "Switch to Unichain Sepolia"}
        </button>
        {failure ? <p className="wallet-error small">{walletErrorMessage(failure)}</p> : null}
      </div>
    );
  }

  const label = wallet.address
    ? shortAddress(wallet.address)
    : connect.isPending
      ? "Check your wallet"
      : "Connect wallet";

  return (
    <div className="wallet">
      <button className="wallet-btn ready" type="button" aria-expanded={open} onClick={toggleMenu}>
        {label}
      </button>
      {open ? (
        <div className="wallet-menu" role="menu">
          {wallet.address ? (
            <>
              <a role="menuitem" href={addressUrl(wallet.address)} target="_blank" rel="noreferrer">
                View on Uniscan
              </a>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  disconnect.mutate();
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            walletChoices(connectors).map((connector) => (
              <button role="menuitem" key={connector.uid} type="button" onClick={() => choose(connector)}>
                {connector.icon ? <img src={connector.icon} alt="" width={18} height={18} /> : null}
                {connector.id === "injected" ? "Browser wallet" : connector.name}
              </button>
            ))
          )}
        </div>
      ) : null}
      {failure && !open ? <p className="wallet-error small">{walletErrorMessage(failure)}</p> : null}
    </div>
  );
}
