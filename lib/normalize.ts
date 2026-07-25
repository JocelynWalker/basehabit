import { zeroAddress } from "@/lib/wagmi";

type UnknownRecord = Record<string, unknown>;

export type NormalizedHabit = {
  creator: `0x${string}`;
  name: string;
  active: boolean;
  createdAt: bigint;
  totalCheckIns: bigint;
};

export type NormalizedUser = {
  created: bigint;
  checkIns: bigint;
  points: bigint;
  streak: bigint;
  lastDay: bigint;
  referrer: `0x${string}`;
};

export function safeBigInt(value: unknown, fallback = 0n) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return fallback;
}

export function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function safeBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function safeAddress(value: unknown, fallback: `0x${string}` = zeroAddress) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as `0x${string}`) : fallback;
}

function readAtOrKey(value: unknown, index: number, key: string) {
  if (Array.isArray(value)) return value[index];
  if (value && typeof value === "object") return (value as UnknownRecord)[key];
  return undefined;
}

export function normalizeHabitRead(value: unknown): NormalizedHabit | null {
  if (!value || typeof value !== "object") return null;
  return {
    creator: safeAddress(readAtOrKey(value, 0, "creator")),
    name: safeString(readAtOrKey(value, 1, "name")),
    active: safeBool(readAtOrKey(value, 2, "active")),
    createdAt: safeBigInt(readAtOrKey(value, 3, "createdAt")),
    totalCheckIns: safeBigInt(readAtOrKey(value, 4, "habitTotalCheckIns") ?? readAtOrKey(value, 4, "totalCheckIns"))
  };
}

export function normalizeUserRead(value: unknown): NormalizedUser {
  return {
    created: safeBigInt(readAtOrKey(value, 0, "created")),
    checkIns: safeBigInt(readAtOrKey(value, 1, "checkIns")),
    points: safeBigInt(readAtOrKey(value, 2, "points")),
    streak: safeBigInt(readAtOrKey(value, 3, "streak")),
    lastDay: safeBigInt(readAtOrKey(value, 4, "lastDay")),
    referrer: safeAddress(readAtOrKey(value, 5, "referrer"))
  };
}
