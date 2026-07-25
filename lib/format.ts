export function shortAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function toDisplayNumber(value: unknown) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return value.toString();
  return "0";
}

export function parseError(error: unknown) {
  if (!error) return "";
  const message = error instanceof Error ? error.message : String(error);
  if (/User rejected|User denied|rejected/i.test(message)) return "Transaction was cancelled by the user.";
  if (/Connector not connected|wallet/i.test(message)) return "Wallet connection failed. Please try again.";
  if (/chain|network/i.test(message)) return "Network error. Please switch to Base.";
  if (/execution reverted|revert/i.test(message)) return "Transaction failed or reverted.";
  return message.split("\n")[0] || "Something went wrong.";
}
