"use client";

import { useSearchParams } from "next/navigation";

// 👇 HIER kommt dein kompletter bisheriger Check-in Inhalt rein
export default function Inner() {
  const sp = useSearchParams();

  // Beispiel: terminId aus URL
  const terminId = sp.get("terminId") || "";

  return (
    <main style={{ padding: 24 }}>
      <h1>Check-in</h1>
      <div style={{ opacity: 0.7 }}>terminId: {terminId || "—"}</div>

      {/* ✅ ERSETZE ab hier mit deinem echten Check-in UI */}
    </main>
  );
}