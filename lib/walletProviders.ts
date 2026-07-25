export type WalletKind = "okx" | "metamask";

type Eip1193Provider = {
  request?: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  providers?: Eip1193Provider[];
};

type BrowserWalletWindow = Window &
  typeof globalThis & {
    ethereum?: Eip1193Provider;
    okxwallet?: Eip1193Provider | { ethereum?: Eip1193Provider };
    okxWallet?: Eip1193Provider | { ethereum?: Eip1193Provider };
  };

type Eip6963Event = Event & {
  detail?: {
    info?: {
      name?: string;
      rdns?: string;
    };
    provider?: Eip1193Provider;
  };
};

const announcedProviders: Eip1193Provider[] = [];
let eip6963Listening = false;

function walletWindow(rootWindow?: unknown) {
  return rootWindow as BrowserWalletWindow | undefined;
}

function providerFromPossibleWrapper(value: unknown) {
  const provider = value as Eip1193Provider | { ethereum?: Eip1193Provider } | undefined;
  if (!provider) return undefined;
  if ("ethereum" in provider && provider.ethereum) return provider.ethereum;
  return provider as Eip1193Provider;
}

function isOkxProvider(provider?: Eip1193Provider) {
  return Boolean(provider?.isOkxWallet || provider?.isOKExWallet);
}

function isMetaMaskProvider(provider?: Eip1193Provider) {
  return Boolean(provider?.isMetaMask && !isOkxProvider(provider));
}

function matchesKind(kind: WalletKind, provider?: Eip1193Provider) {
  return kind === "okx" ? isOkxProvider(provider) : isMetaMaskProvider(provider);
}

function eip6963LooksLike(kind: WalletKind, event: Eip6963Event) {
  const info = event.detail?.info;
  const label = `${info?.name || ""} ${info?.rdns || ""}`.toLowerCase();
  return kind === "okx" ? label.includes("okx") || label.includes("okex") : label.includes("metamask");
}

export function initEip6963ProviderDiscovery(rootWindow?: unknown) {
  const win = walletWindow(rootWindow ?? (typeof window !== "undefined" ? window : undefined));
  if (!win || eip6963Listening) return;
  eip6963Listening = true;
  win.addEventListener("eip6963:announceProvider", ((event: Eip6963Event) => {
    const provider = event.detail?.provider;
    if (provider && !announcedProviders.includes(provider)) announcedProviders.push(provider);
  }) as EventListener);
}

export function requestEip6963Providers(rootWindow?: unknown) {
  const win = walletWindow(rootWindow ?? (typeof window !== "undefined" ? window : undefined));
  if (!win) return;
  initEip6963ProviderDiscovery(win);
  win.dispatchEvent(new Event("eip6963:requestProvider"));
}

export async function refreshEip6963Providers(waitMs = 250, rootWindow?: unknown) {
  requestEip6963Providers(rootWindow);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}

export function findWalletProvider(kind: WalletKind, rootWindow?: unknown) {
  const win = walletWindow(rootWindow ?? (typeof window !== "undefined" ? window : undefined));
  if (!win) return undefined;

  if (kind === "okx") {
    const okxDirect = providerFromPossibleWrapper(win.okxwallet) || providerFromPossibleWrapper(win.okxWallet);
    if (okxDirect) return okxDirect;
  }

  const providers = (win.ethereum?.providers || []) as Eip1193Provider[];
  const providerFromArray = providers.find((provider) => matchesKind(kind, provider));
  if (providerFromArray) return providerFromArray;

  const announced = announcedProviders.find((provider) => matchesKind(kind, provider));
  if (announced) return announced;

  const announcedByInfo = announcedProviders.find((provider) => {
    return matchesKind(kind, provider);
  });
  if (announcedByInfo) return announcedByInfo;

  if (matchesKind(kind, win.ethereum)) return win.ethereum;

  return undefined;
}

export function isAnnouncedProviderForKind(kind: WalletKind, event: Eip6963Event) {
  const provider = event.detail?.provider;
  return Boolean(provider && (matchesKind(kind, provider) || eip6963LooksLike(kind, event)));
}
