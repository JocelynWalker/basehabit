import { Attribution } from "ox/erc8021";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { base } from "wagmi/chains";
import { findWalletProvider, initEip6963ProviderDiscovery, requestEip6963Providers } from "@/lib/walletProviders";

export const attributionVersion = "v2";
const envBuilderCode = process.env.NEXT_PUBLIC_BUILDER_CODE?.trim();
const envChainId = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
const envContractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();
const envDataSuffix = process.env.NEXT_PUBLIC_DATA_SUFFIX?.trim();

export const builderCode = envBuilderCode || "bc_739htmhw";
export const chainId = Number(envChainId || 8453);
export const contractAddress = (envContractAddress || "0x96843Ae3aa313700e8339dFc8b2E7fAC75dB8160") as `0x${string}`;
export const zeroAddress = "0x0000000000000000000000000000000000000000" as const;
export const dataSuffix = (envDataSuffix ||
  Attribution.toDataSuffix({
    codes: [builderCode]
  })) as `0x${string}`;

export const okxConnector = injected({
  target() {
    return {
      id: "okx",
      name: "OKX Wallet",
      provider(rootWindow) {
        initEip6963ProviderDiscovery(rootWindow);
        requestEip6963Providers(rootWindow);
        return findWalletProvider("okx", rootWindow);
      }
    };
  }
});

export const metaMaskConnector = injected({
  target() {
    return {
      id: "metaMask",
      name: "MetaMask",
      provider(rootWindow) {
        initEip6963ProviderDiscovery(rootWindow);
        requestEip6963Providers(rootWindow);
        return findWalletProvider("metamask", rootWindow);
      }
    };
  }
});

export const coinbaseConnector = coinbaseWallet({
  appName: "BaseHabit",
  preference: { options: "eoaOnly" }
});

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [okxConnector, metaMaskConnector, coinbaseConnector],
  storage: createStorage({
    storage: cookieStorage
  }),
  transports: {
    [base.id]: http()
  },
  ssr: true
});

export const hasContract = /^0x[a-fA-F0-9]{40}$/.test(contractAddress);
export const attributionStatus = dataSuffix !== "0x" ? `suffix enabled · ${attributionVersion}` : `missing suffix · ${attributionVersion}`;
export const dataSuffixTail = dataSuffix.length > 10 ? dataSuffix.slice(-10) : dataSuffix;
