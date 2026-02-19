"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 34, margin: 0 }}>Fehler</h1>

      <div
        style={{
          marginTop: 14,
          border: "2px solid #111",
          borderRadius: 16,
          padding: 14,
          background: "#fff",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <b>Message</b>
        {"\n"}
        {error?.message || "Unbekannter Fehler"}
        {"\n\n"}
        <b>Stack</b>
        {"\n"}
        {error?.stack || "—"}
      </div>

      <button
        onClick={() => reset()}
        style={{
          marginTop: 14,
          border: "2px solid #111",
          borderRadius: 999,
          padding: "10px 14px",
          fontWeight: 900,
          background: "#111",
          color: "#fff",
        }}
      >
        Neu laden
      </button>
    </main>
  );
}