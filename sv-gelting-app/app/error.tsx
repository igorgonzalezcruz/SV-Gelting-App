"use client";

import { useEffect } from "react";

export default function Error({
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
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Fehler</h1>
      <div style={{ marginTop: 12, border: "2px solid #111", borderRadius: 12, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 900 }}>Message</div>
        <div style={{ marginTop: 6 }}>{error.message}</div>
        {error.digest ? (
          <>
            <div style={{ fontWeight: 900, marginTop: 10 }}>Digest</div>
            <div>{error.digest}</div>
          </>
        ) : null}
      </div>

      <button
        onClick={() => reset()}
        style={{ marginTop: 14, border: "2px solid #111", borderRadius: 999, padding: "10px 14px", fontWeight: 900, background: "#111", color: "#fff" }}
      >
        Neu laden
      </button>
    </main>
  );
}