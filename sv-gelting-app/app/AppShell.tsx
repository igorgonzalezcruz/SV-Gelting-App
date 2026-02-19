"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type User = { name: string };

function readUser(): User | null {
  if (typeof window === "undefined") return null;

  const rawA = localStorage.getItem("svgelting_user"); // neuer/gewollter key
  const rawB = localStorage.getItem("sv_user");        // alter key

  const raw = rawA ?? rawB;
  if (!raw) return null;

  // raw kann JSON oder String sein
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.name === "string") {
      return { name: parsed.name };
    }
    // falls parsed ein String ist
    if (typeof parsed === "string" && parsed.trim()) return { name: parsed.trim() };
  } catch {
    // raw ist wahrscheinlich direkt ein String
    if (raw.trim()) return { name: raw.trim() };
  }

  return null;
}

function writeUser(u: User) {
  localStorage.setItem("svgelting_user", u.name); // wir speichern ab jetzt immer einheitlich als String
  // optional alte Keys bereinigen:
  localStorage.removeItem("sv_user");
}

function clearUser() {
  localStorage.removeItem("svgelting_user");
  localStorage.removeItem("sv_user");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = readUser();
    setUser(u);

    // Login-Seite darf immer durch
    if (pathname === "/login") return;

    // Wenn nicht eingeloggt -> Login
    if (!u) {
      window.location.href = "/login";
      return;
    }

    // Wenn User aus altem Format kam -> vereinheitlichen
    writeUser(u);
  }, [pathname]);

  function logout() {
    clearUser();
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
        <div style={{ fontWeight: 900 }}>Hallo {user?.name || ""}</div>

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