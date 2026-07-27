"use client";

// replaces the root layout when the root crashes, so it must render its own html/body
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100svh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>The app crashed</h1>
        <p style={{ maxWidth: "24rem", fontSize: "0.875rem", color: "#8a8f98" }}>
          A top-level error stopped the page from rendering. Reload to recover.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            cursor: "pointer",
            borderRadius: "0.4rem",
            background: "#10a37f",
            color: "#fff",
            padding: "0.5rem 1rem",
            border: "none",
            fontWeight: 600,
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
