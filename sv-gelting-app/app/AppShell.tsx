"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearUser, loadUser, type User } from "./lib/auth";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/termine", label: "Termine" },
  { href: "/teams", label: "Teams" },
  { href: "/check-in", label: "Check-in" },
  { href: "/bewertung", label: "Bewertung" },
  { href: "/stats", label: "Stats" },
  { href: "/export", label: "Export" },
  { href: "/aufstellung", label: "Aufstellung" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const u = loadUser();
    setUser(u);
    setChecked(true);

    // Nur schützen, wenn wir wirklich geprüft haben UND nicht auf /login sind
    if (!u && !isLogin) router.replace("/login");
  }, [isLogin, router]);

  const greeting = useMemo(() => (user ? `Hallo ${user.name}` : ""), [user]);

  const shell: React.CSSProperties = { minHeight: "100vh", background: "#fff", color: "#111" };
  const header: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "#fff",
    borderBottom: "2px solid #111",
  };
  const wrap: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "12px 16px" };
  const row: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };

  const pillBase: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 900,
    textDecoration: "none",
    color: "#111",
    background: "#fff",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  // Während wir noch prüfen, nichts “kaputt” rendern
  if (!checked && !isLogin) {
    return (
      <div style={shell}>
        <main style={{ padding: 24 }}>Lade…</main>
      </div>
    );
  }

  // Wenn kein User und nicht login: kurz “weiterleiten” anzeigen (verhindert Client-Crash)
  if (!user && !isLogin) {
    return (
      <div style={shell}>
        <main style={{ padding: 24 }}>Weiterleitung zum Login…</main>
      </div>
    );
  }

  return (
    <div style={shell}>
      <header style={header}>
        <div style={wrap}>
          <div style={row}>
            <Link href="/" style={{ ...pillBase, background: "#111", color: "#fff" }}>
              SV Gelting
            </Link>

            {!isLogin ? (
              <>
                {NAV.map((n) => {
                  const active = pathname === n.href;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      style={{
                        ...pillBase,
                        background: active ? "#111" : "#fff",
                        color: active ? "#fff" : "#111",
                      }}
                    >
                      {n.label}
                    </Link>
                  );
                })}
              </>
            ) : null}

            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
              {user ? (
                <span style={{ fontWeight: 900, opacity: 0.9, padding: "6px 10px", borderRadius: 999, border: "2px solid #111" }}>
                  {greeting}
                </span>
              ) : null}

              {user && !isLogin ? (
                <button
                  onClick={() => {
                    clearUser();
                    router.replace("/login");
                  }}
                  style={{ ...pillBase, cursor: "pointer" }}
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</div>
    </div>
  );
}