"use client";

import { LogOut, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortAddress } from "@/lib/format";
import { findWalletProvider, refreshEip6963Providers } from "@/lib/walletProviders";

type WalletButtonsProps = {
  onError(message: string): void;
};

export function WalletButtons({ onError }: WalletButtonsProps) {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const detectedRef = useRef({ okx: false, metamask: false, coinbase: true });
  const [, forceDetectionRender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      await refreshEip6963Providers(250);
      if (cancelled) return;
      detectedRef.current = {
        okx: Boolean(findWalletProvider("okx")),
        metamask: Boolean(findWalletProvider("metamask")),
        coinbase: true
      };
      forceDetectionRender((value) => value + 1);
    }
    detect().catch(() => {
      if (!cancelled) onError("Wallet detection failed.");
    });
    return () => {
      cancelled = true;
    };
  }, [onError]);

  async function connectWallet(label: string, connectorIndex: number, kind?: "okx" | "metamask") {
    if (kind) {
      await refreshEip6963Providers(250);
      if (!findWalletProvider(kind)) {
        onError(`${label} not detected.`);
        return;
      }
    }
    const connector = connectors[connectorIndex];
    if (!connector) {
      onError(`${label} not detected.`);
      return;
    }
    try {
      await connectAsync({ connector });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onError(message.includes("Provider") || message.includes("not found") ? `${label} not detected.` : `${label} connection failed.`);
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-white/70 px-3 py-2 text-sm font-medium text-sage-700">{shortAddress(address)}</div>
        <button
          type="button"
          onClick={() => disconnect()}
          className="grid size-10 place-items-center rounded-full bg-sage-700 text-white transition hover:bg-sage-500"
          aria-label="Disconnect"
          title="Disconnect"
        >
          <LogOut size={17} />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => connectWallet("OKX Wallet", 0, "okx")}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-white/75 px-4 py-2.5 text-sm font-semibold text-sage-700 shadow-sm transition hover:bg-white"
      >
        <Wallet size={16} /> OKX Wallet
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => connectWallet("MetaMask", 1, "metamask")}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-white/75 px-4 py-2.5 text-sm font-semibold text-sage-700 shadow-sm transition hover:bg-white"
      >
        <Wallet size={16} /> MetaMask
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => connectWallet("Coinbase Wallet", 2)}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-white/75 px-4 py-2.5 text-sm font-semibold text-sage-700 shadow-sm transition hover:bg-white"
      >
        <Wallet size={16} /> Coinbase Wallet
      </button>
    </div>
  );
}
