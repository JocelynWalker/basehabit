import assert from "node:assert/strict";
import { findWalletProvider, isAnnouncedProviderForKind, refreshEip6963Providers } from "../lib/walletProviders";
import { normalizeHabitRead, normalizeUserRead } from "../lib/normalize";

type FakeProvider = {
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
};

type FakeWindow = EventTarget & {
  ethereum?: FakeProvider & { providers?: FakeProvider[] };
  okxwallet?: FakeProvider | { ethereum?: FakeProvider };
  okxWallet?: FakeProvider | { ethereum?: FakeProvider };
};

function makeWindow(fields: Partial<FakeWindow> = {}) {
  const target = new EventTarget() as FakeWindow;
  Object.assign(target, fields);
  return target;
}

async function main() {
  const okx = { isOkxWallet: true };
  const okxLegacy = { isOKExWallet: true };
  const okxWrapped = { ethereum: okx };
  const metaMask = { isMetaMask: true };
  const okxMetaCompat = { isMetaMask: true, isOkxWallet: true };

assert.equal(findWalletProvider("okx", makeWindow({ okxwallet: okx })), okx, "detects window.okxwallet");
assert.equal(findWalletProvider("okx", makeWindow({ okxWallet: okxLegacy })), okxLegacy, "detects window.okxWallet");
assert.equal(findWalletProvider("okx", makeWindow({ okxwallet: okxWrapped })), okx, "detects window.okxwallet.ethereum");
assert.equal(findWalletProvider("okx", makeWindow({ okxWallet: okxWrapped })), okx, "detects window.okxWallet.ethereum");
assert.equal(findWalletProvider("okx", makeWindow({ ethereum: { providers: [metaMask, okxLegacy] } })), okxLegacy, "detects OKX in providers");
assert.equal(findWalletProvider("okx", makeWindow({ ethereum: okxLegacy })), okxLegacy, "detects OKX on ethereum");
assert.equal(findWalletProvider("metamask", makeWindow({ ethereum: { providers: [okxMetaCompat, metaMask] } })), metaMask, "MetaMask excludes OKX-compatible provider");
assert.equal(findWalletProvider("metamask", makeWindow({ ethereum: okxMetaCompat })), undefined, "MetaMask does not fallback to OKX");
assert.equal(findWalletProvider("okx", makeWindow({ ethereum: metaMask })), undefined, "OKX does not fallback to MetaMask");

const announcedOkx = new Event("eip6963:announceProvider") as Event & {
  detail?: { info?: { name?: string; rdns?: string }; provider?: FakeProvider };
};
announcedOkx.detail = { info: { name: "OKX Wallet", rdns: "com.okx.wallet" }, provider: okx };
assert.equal(isAnnouncedProviderForKind("okx", announcedOkx), true, "recognizes OKX EIP-6963 announce event");

const eip6963Window = makeWindow();
eip6963Window.addEventListener("eip6963:requestProvider", () => {
  eip6963Window.dispatchEvent(announcedOkx);
});
await refreshEip6963Providers(0, eip6963Window);
assert.equal(findWalletProvider("okx", eip6963Window), okx, "detects EIP-6963 announced OKX provider");

const habitArray = normalizeHabitRead(["0x0000000000000000000000000000000000000001", "Run", true, 1n, 2n]);
assert.equal(habitArray?.name, "Run", "normalizes habit tuple");
const habitObject = normalizeHabitRead({ creator: "0x0000000000000000000000000000000000000002", name: "Read", active: true, createdAt: "3", habitTotalCheckIns: "4" });
assert.equal(habitObject?.totalCheckIns, 4n, "normalizes habit object");
const userObject = normalizeUserRead({ created: "1", checkIns: 2n, points: 3, streak: "4", lastDay: "5", referrer: "0x0000000000000000000000000000000000000003" });
assert.equal(userObject.streak, 4n, "normalizes user object");

  console.log("wallet provider and read normalization tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
