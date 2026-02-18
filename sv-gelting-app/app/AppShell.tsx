"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem("sv_user");
    if (!raw && pathname !== "/login") {
      window.location.href = "/login";
      return;
    }
    if (raw) setUser(JSON.parse(raw));
  }, [pathname]);

  function logout() {
    localStorage.removeItem("sv_user");
    window.location.href = "/login";
  }

  const btn: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 999,
    padding: "8px 12px",
    textDecoration: "none",
    color: "#111",
    fontWeight: 900,
    background: "#fff",
  };

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div>
      <header
        style={{
          borderBottom: "2px solid #111",
          padding: 12,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 900 }}>
          Hallo {user?.name || ""}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/" style={btn}>Dashboard</Link>
          <Link href="/termine" style={btn}>Termine</Link>
          <Link href="/check-in" style={btn}>Check in</Link>
          <Link href="/bewertung" style={btn}>Bewertung</Link>
          <Link href="/teams" style={btn}>Teams</Link>
          <Link href="/stats" style={btn}>Stats</Link>
          <Link href="/aufstellung" style={btn}>Aufstellung</Link>
          <Link href="/export" style={btn}>Export</Link>
          <button onClick={logout} style={btn}>Logout</button>
        </div>
      </header>

      <main style={{ padding: 16 }}>{children}</main>
    </div>
  );
}