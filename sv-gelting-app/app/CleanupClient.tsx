"use client";

import { useEffect, useState } from "react";
import { autoBackupDaily, cleanupOrphans, syncPullOnce } from "./lib/store";

export default function CleanupClient({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<"off" | "ok" | "err">("off");

  useEffect(() => {
    let alive = true;

    async function init() {
      try {
        await syncPullOnce();
        if (!alive) return;
        cleanupOrphans({ cleanMissingPlayers: true });
        autoBackupDaily();
        setLive("ok");
      } catch {
        setLive("err");
      }
    }

    init();

    const t = setInterval(async () => {
      try {
        await syncPullOnce();
        if (!alive) return;
        setLive("ok");
      } catch {
        setLive("err");
      }
    }, 8000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 14,
          right: 14,
          border: "2px solid #111",
          borderRadius: 999,
          padding: "6px 10px",
          fontWeight: 900,
          background: "#fff",
          zIndex: 9999,
          fontSize: 12,
        }}
      >
        {live === "ok" && "🟢 Live verbunden"}
        {live === "err" && "🟡 Sync kurz gestört"}
        {live === "off" && "⚪ Verbinden…"}
      </div>

      {children}
    </>
  );
}