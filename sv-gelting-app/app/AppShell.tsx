"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type User = { id: string; name: string };

const STORAGE_KEY = "svgelting.user";

function safeGetUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.name) return null;
    return { id: String(parsed.id), name: String(parsed.name) };
  } catch {
    return null;
  }
}

function safeLogout() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const isLogin = pathname === "/login";

  useEffect(() => {
    // Client only
    const u = safeGetUser();
    setUser(u);
    if (!u && !isLogin) router.replace("/login");
  }, [isLogin, router]);

  const greeting = useMemo(() => {
    if (!user) return "";
    return `Hallo ${user.name} 👋`;
  }, [user]);

  const top: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "#fff",
    borderBottom: "2px solid #111",
  };
  const wrap: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "12px 16px" };
  const pill: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 900,
    textDecoration: "none",
    color: "#111",
    background: "#fff",
  };

  if (!user && !isLogin) {
    // Verhindert „client-side exception“, falls irgendwas ohne User lädt
    return <main style={{ padding: 24 }}>Lade…</main>;
  }

  return (
    <>
      <header style={top}>
        <div style={wrap}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{ ...pill, background: "#111", color: "#fff" }}>
              SV Gelting
            </Link>

            {!isLogin ? (
              <>
                <Link href="/termine" style={pill}>Termine</Link>
                <Link href="/teams" style={pill}>Teams</Link>
                <Link href="/check-in" style={pill}>Check-in</Link>
                <Link href="/bewertung" style={pill}>Bewertung</Link>
                <Link href="/stats" style={pill}>Stats</Link>
                <Link href="/export" style={pill}>Export</Link>
                <Link href="/aufstellung" style={pill}>Aufstellung</Link>
              </>
            ) : null}

            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
              {user ? <div style={{ fontWeight: 900, opacity: 0.85 }}>{greeting}</div> : null}
              {user && !isLogin ? (
                <button
                  onClick={() => {
                    safeLogout();
                    router.replace("/login");
                  }}
                  style={{ ...pill, cursor: "pointer" }}
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {children}
    </>
  );
}