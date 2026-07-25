"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f8f1", color: "#263428" }}>
          <section style={{ maxWidth: 420, borderRadius: 24, background: "rgba(255,255,255,0.78)", padding: 24 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>BaseHabit needs a refresh.</h1>
            <p style={{ lineHeight: 1.5 }}>A client error was caught safely.</p>
            <button type="button" onClick={reset} style={{ border: 0, borderRadius: 999, background: "#3f5f39", color: "white", padding: "12px 18px", fontWeight: 700 }}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
