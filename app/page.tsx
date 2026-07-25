"use client";

import { CalendarDays, Droplets, Leaf, Link2, Plus, Sprout, SunMedium } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { concatHex, encodeFunctionData, isAddress } from "viem";
import { useAccount, useReadContract, useReadContracts, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import { WalletButtons } from "@/components/WalletButtons";
import { baseHabitAbi } from "@/lib/baseHabitAbi";
import { parseError, shortAddress, toDisplayNumber } from "@/lib/format";
import { normalizeHabitRead, normalizeUserRead, safeBigInt } from "@/lib/normalize";
import { attributionStatus, attributionVersion, builderCode, chainId, contractAddress, dataSuffix, dataSuffixTail, hasContract, zeroAddress } from "@/lib/wagmi";

type Habit = {
  id: bigint;
  creator: `0x${string}`;
  name: string;
  active: boolean;
  createdAt: bigint;
  totalCheckIns: bigint;
};

export default function Home() {
  const { address, chainId: connectedChainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [habitName, setHabitName] = useState("");
  const [selectedHabitId, setSelectedHabitId] = useState<bigint | null>(null);
  const [error, setError] = useState("");
  const [successAction, setSuccessAction] = useState<"create" | "checkin" | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [referrer, setReferrer] = useState<`0x${string}`>(zeroAddress);

  const contract = hasContract ? contractAddress : undefined;

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("ref");
    setReferrer(param && isAddress(param) ? (param as `0x${string}`) : zeroAddress);
  }, []);

  const habitCountRead = useReadContract({
    address: contract,
    abi: baseHabitAbi,
    functionName: "habitCount",
    query: { enabled: Boolean(contract) }
  });

  const totalRead = useReadContract({
    address: contract,
    abi: baseHabitAbi,
    functionName: "totalCheckIns",
    query: { enabled: Boolean(contract) }
  });

  const userRead = useReadContract({
    address: contract,
    abi: baseHabitAbi,
    functionName: "getUser",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(contract && address) }
  });

  const habitCount = safeBigInt(habitCountRead.data);
  const habitIds = useMemo(() => {
    const count = Number(habitCount > 20n ? 20n : habitCount);
    return Array.from({ length: count }, (_, index) => habitCount - BigInt(index)).filter((id) => id > 0n);
  }, [habitCount]);

  const habitReads = useReadContracts({
    contracts: habitIds.map((id) => ({
      address: contract,
      abi: baseHabitAbi,
      functionName: "getHabit",
      args: [id]
    })),
    query: { enabled: Boolean(contract && habitIds.length) }
  });

  const userHabitCheckReads = useReadContracts({
    contracts: habitIds.map((id) => ({
      address: contract,
      abi: baseHabitAbi,
      functionName: "habitCheckInCount",
      args: [id, address || zeroAddress]
    })),
    query: { enabled: Boolean(contract && address && habitIds.length) }
  });

  const habits = useMemo<Habit[]>(() => {
    return (habitReads.data || [])
      .map((result, index) => {
        if (result.status !== "success") return null;
        const habit = normalizeHabitRead(result.result);
        return habit ? { id: habitIds[index], ...habit } : null;
      })
      .filter(Boolean) as Habit[];
  }, [habitIds, habitReads.data]);

  useEffect(() => {
    if (!selectedHabitId && habits.length) setSelectedHabitId(habits[0].id);
  }, [habits, selectedHabitId]);

  const selectedHabit = habits.find((habit) => habit.id === selectedHabitId) || habits[0];
  const user = useMemo(() => normalizeUserRead(userRead.data), [userRead.data]);
  const created = user.created;
  const checkIns = user.checkIns;
  const points = user.points;
  const streak = user.streak;
  const referralOf = user.referrer;
  const readFailed = habitCountRead.isError || totalRead.isError || userRead.isError || habitReads.isError;
  const wrongNetwork = isConnected && connectedChainId !== base.id;

  const { sendTransactionAsync, data: hash, isPending } = useSendTransaction();
  const receipt = useWaitForTransactionReceipt({ hash, query: { enabled: Boolean(hash) } });
  const txBusy = isPending || receipt.isLoading;

  useEffect(() => {
    if (receipt.isSuccess) {
      Promise.allSettled([habitCountRead.refetch(), totalRead.refetch(), userRead.refetch(), habitReads.refetch(), userHabitCheckReads.refetch()]).then((results) => {
        if (results.some((result) => result.status === "rejected")) setError("Contract refresh failed. The transaction may still be confirmed.");
      });
      setRecent((items) => [`${successAction === "create" ? "Habit planted" : "Garden watered"} just now`, ...items].slice(0, 5));
    }
  }, [receipt.isSuccess]);

  useEffect(() => {
    if (readFailed) setError("Contract read failed. Please check the address and network.");
  }, [readFailed]);

  const primaryLabel = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    if (txBusy) return selectedHabit ? "Checking In..." : "Creating Habit...";
    if (successAction === "checkin") return "Check In Again";
    if (!selectedHabit) return "Create Habit";
    return "Check In";
  }, [isConnected, selectedHabit, successAction, txBusy]);

  async function runPrimaryAction() {
    setError("");
    if (!isConnected) {
      setError("Choose OKX Wallet, MetaMask, or Coinbase Wallet above to connect.");
      return;
    }
    if (!contract) {
      setError("Contract address is missing. Add NEXT_PUBLIC_CONTRACT_ADDRESS and redeploy.");
      return;
    }
    if (wrongNetwork) {
      try {
        await switchChainAsync({ chainId: base.id });
      } catch {
        setError("Network error. Please switch to Base.");
        return;
      }
    }

    try {
      if (!selectedHabit) {
        await createHabitTx();
        return;
      }

      setSuccessAction("checkin");
      await sendAttributedTransaction({
        functionName: "checkIn",
        args: [selectedHabit.id, referrer]
      });
    } catch (actionError) {
      setError(parseError(actionError));
    }
  }

  async function createAnotherHabit() {
    setError("");
    if (!isConnected) {
      setError("Choose OKX Wallet, MetaMask, or Coinbase Wallet above to connect.");
      return;
    }
    if (!contract) {
      setError("Contract address is missing. Add NEXT_PUBLIC_CONTRACT_ADDRESS and redeploy.");
      return;
    }
    if (wrongNetwork) {
      try {
        await switchChainAsync({ chainId: base.id });
      } catch {
        setError("Network error. Please switch to Base.");
        return;
      }
    }
    try {
      await createHabitTx();
    } catch (actionError) {
      setError(parseError(actionError));
    }
  }

  async function createHabitTx() {
    const cleanName = habitName.trim();
    if (!cleanName || cleanName.length > 64) {
      setError("Habit name must be 1-64 characters.");
      return;
    }
    setSuccessAction("create");
    await sendAttributedTransaction({
      functionName: "createHabit",
      args: [cleanName, referrer]
    });
    setHabitName("");
  }

  async function sendAttributedTransaction(parameters: { functionName: "createHabit"; args: [string, `0x${string}`] } | { functionName: "checkIn"; args: [bigint, `0x${string}`] }) {
    const callData = encodeFunctionData({
      abi: baseHabitAbi,
      functionName: parameters.functionName,
      args: parameters.args
    });
    const data = concatHex([callData, dataSuffix]);
    await sendTransactionAsync({
      to: contract!,
      data,
      value: 0n
    });
  }

  const sevenDay = Array.from({ length: 7 }, (_, index) => index < Number(streak > 7n ? 7n : streak));
  const gardenCells = Array.from({ length: 30 }, (_, index) => index < Number(checkIns > 30n ? 30n : checkIns));
  const inviteLink = address && typeof window !== "undefined" ? `${window.location.origin}?ref=${address}` : "Connect to create your invite link";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-full bg-sage-700 text-white shadow-sm">
            <Sprout size={19} />
          </div>
          <div>
            <p className="text-lg font-bold text-sage-700">BaseHabit</p>
            <p className="text-xs font-medium text-sage-500">Small actions, visible progress.</p>
          </div>
        </div>
        <WalletButtons onError={setError} />
      </header>

      <section className="grid gap-5 py-5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="glass-card rounded-[28px] p-5 sm:p-7">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-700">Grow habits on Base.</p>
              <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-normal text-[#253724] sm:text-5xl">Water one quiet habit today.</h1>
            </div>
            <SunMedium className="mt-2 shrink-0 text-pollen" size={34} />
          </div>

          <div className="rounded-[22px] bg-white/72 p-4 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-sage-700" htmlFor="habitName">
              Habit name
            </label>
            <input
              id="habitName"
              value={habitName}
              maxLength={64}
              onChange={(event) => setHabitName(event.target.value)}
              placeholder={selectedHabit ? selectedHabit.name : "Morning walk, reading, workout..."}
              className="mb-3 w-full rounded-2xl border border-sage-100 bg-mist px-4 py-3 text-base outline-none transition focus:border-sage-300"
            />

            {habits.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {habits.map((habit, index) => (
                  <button
                    key={habit.id.toString()}
                    type="button"
                    onClick={() => setSelectedHabitId(habit.id)}
                    className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
                      selectedHabit?.id === habit.id ? "bg-sage-700 text-white" : "bg-sage-50 text-sage-700 hover:bg-sage-100"
                    }`}
                  >
                    {habit.name || `Habit ${index + 1}`}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={runPrimaryAction}
              disabled={txBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage-700 px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-sage-500 disabled:bg-sage-300"
            >
              {selectedHabit ? <Droplets size={18} /> : <Plus size={18} />}
              {primaryLabel}
            </button>

            {isConnected && selectedHabit && (
              <button type="button" onClick={createAnotherHabit} className="mt-3 w-full rounded-full bg-sage-50 px-4 py-3 text-sm font-bold text-sage-700 transition hover:bg-sage-100">
                Create another habit
              </button>
            )}
          </div>

          {(error || !hasContract || wrongNetwork) && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-[#fff8dd] px-4 py-3 text-sm font-medium text-[#725214]">
              {!hasContract ? "Contract address is missing. Add NEXT_PUBLIC_CONTRACT_ADDRESS before production use." : wrongNetwork ? "Network error. Please switch to Base." : error}
            </div>
          )}
        </div>

        <aside className="grid gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Current Streak" value={toDisplayNumber(streak)} icon={<Leaf size={18} />} />
            <Stat label="Total Check-ins" value={toDisplayNumber(checkIns)} icon={<CalendarDays size={18} />} />
            <Stat label="Growth Value" value={toDisplayNumber(points)} icon={<Sprout size={18} />} />
          </div>

          <div className="glass-card rounded-[24px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-sage-700">Contract</h2>
              <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-bold text-sage-700">{attributionStatus}</span>
            </div>
            <Info label="Contract address" value={hasContract ? shortAddress(contractAddress) : "Not configured"} />
            <Info label="Network" value="Base" />
            <Info label="Chain ID" value={String(chainId)} />
            <Info label="Onchain attribution" value={`${attributionStatus} · ...${dataSuffixTail}`} />
            <Info label="Attribution version" value={attributionVersion} />
            <Info label="Builder Code" value={builderCode} />
            <Info label="Referral" value={referralOf !== zeroAddress ? shortAddress(referralOf) : referrer !== zeroAddress ? `URL ${shortAddress(referrer)}` : "None"} />
          </div>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-card rounded-[24px] p-5">
          <h2 className="mb-4 text-lg font-bold text-sage-700">7-day streak</h2>
          <div className="flex justify-between gap-2">
            {sevenDay.map((active, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div className={`leaf h-8 w-6 ${active ? "bg-sage-500" : "bg-sage-100"}`} />
                <span className="text-xs font-semibold text-sage-500">{index + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[24px] p-5">
          <h2 className="mb-4 text-lg font-bold text-sage-700">Monthly habit garden</h2>
          <div className="grid grid-cols-10 gap-2">
            {gardenCells.map((active, index) => (
              <div key={index} className={`aspect-square rounded-lg ${active ? "bg-sage-500 shadow-sm" : "bg-white/70"}`}>
                {active && <div className="mx-auto mt-1 h-2 w-1.5 rounded-full bg-pollen" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="glass-card rounded-[24px] p-5">
          <h2 className="mb-3 text-lg font-bold text-sage-700">Recent Check-ins</h2>
          <div className="space-y-2">
            {(recent.length ? recent : ["No check-ins yet", "Plant a habit, then water it anytime"]).map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-2xl bg-white/68 px-4 py-3 text-sm font-medium text-sage-700">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[24px] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-sage-700">
            <Link2 size={18} /> Invite
          </h2>
          <p className="break-all rounded-2xl bg-white/68 px-4 py-3 text-sm font-medium text-sage-700">{inviteLink}</p>
          <p className="mt-3 text-sm text-sage-500">Referral is passed on the first habit creation or check-in. Self-referral is accepted by the UI and ignored by the contract rewards.</p>
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md px-4 pb-4">
        <div className="grid grid-cols-4 rounded-full bg-white/90 p-2 text-center text-xs font-bold text-sage-700 shadow-garden backdrop-blur">
          {["Today", "Garden", "Streak", "Invite"].map((item) => (
            <a key={item} href="#" className="rounded-full px-2 py-2 hover:bg-sage-50">
              {item}
            </a>
          ))}
        </div>
      </nav>
    </main>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card rounded-[22px] p-4">
      <div className="mb-3 text-sage-500">{icon}</div>
      <p className="text-2xl font-bold text-sage-700">{value}</p>
      <p className="mt-1 text-xs font-semibold text-sage-500">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-sage-100 py-3 text-sm first:border-t-0">
      <span className="font-semibold text-sage-500">{label}</span>
      <span className="min-w-0 break-all text-right font-bold text-sage-700">{value}</span>
    </div>
  );
}
