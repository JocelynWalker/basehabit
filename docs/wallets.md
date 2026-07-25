# Wallets

BaseHabit only shows three wallet choices:

- OKX Wallet
- MetaMask
- Coinbase Wallet

OKX and MetaMask use Wagmi injected connectors with a shared provider lookup helper. Coinbase uses Wagmi's `coinbaseWallet` connector.

The OKX and MetaMask buttons never intentionally fall back to an arbitrary `window.ethereum` provider.
