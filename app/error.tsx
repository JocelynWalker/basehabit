"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="glass-card rounded-[24px] p-5">
        <p className="text-lg font-bold text-sage-700">BaseHabit needs a refresh.</p>
        <p className="mt-2 text-sm text-sage-500">{error.message || "A client error was caught safely."}</p>
        <button type="button" onClick={reset} className="mt-4 rounded-full bg-sage-700 px-5 py-3 text-sm font-bold text-white">
          Try again
        </button>
      </div>
    </main>
  );
}
