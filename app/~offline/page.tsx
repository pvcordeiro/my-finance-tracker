"use client";

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
        background: "var(--background)",
        color: "var(--foreground)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Signal bars — pure CSS, no external icons needed */}
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: "5px",
            height: "36px",
            marginBottom: "0.5rem",
          }}
        >
          {[12, 18, 24, 30].map((h, i) => (
            <div
              key={i}
              style={{
                width: "8px",
                height: `${h}px`,
                borderRadius: "2px",
                background:
                  i === 0
                    ? "oklch(0.6 0.01 0 / 0.9)"
                    : "oklch(0.6 0.01 0 / 0.2)",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h1
            style={{
              fontSize: "clamp(1.25rem, 4vw, 1.5rem)",
              fontWeight: 600,
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            You&rsquo;re offline
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              margin: 0,
              color: "oklch(from var(--foreground) l c h / 0.55)",
            }}
          >
            This page isn&rsquo;t available without a connection. If you&rsquo;ve
            used the app before, go back — your cached data is still there.
          </p>
        </div>

        <button
          onClick={() => window.history.back()}
          style={{
            marginTop: "0.5rem",
            padding: "0.625rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            fontFamily: "inherit",
            borderRadius: "6px",
            border: "1px solid oklch(from var(--foreground) l c h / 0.15)",
            background: "transparent",
            color: "var(--foreground)",
            cursor: "pointer",
            transition: "background 150ms ease, border-color 150ms ease",
            alignSelf: "center",
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(from var(--foreground) l c h / 0.06)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
        >
          Go back
        </button>
      </div>
    </div>
  );
}
