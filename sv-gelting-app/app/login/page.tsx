"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string };

const USERS: User[] = [
  { id: "wolfgang", name: "Wolfgang" },
  { id: "volker", name: "Volker" },
];

const STORAGE_KEY = "svgelting.user";

function safeSetUser(u: User) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    return true;
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>(USERS[0]?.id ?? "");
  const [error, setError] = useState<string>("");

  const user = useMemo(() => USERS.find((x) => x.id === userId) ?? null, [userId]);

  function onLogin() {
    setError("");
    if (!user) {
      setError("Bitte Nutzer wählen.");
      return;
    }
    const ok = safeSetUser(user);
    if (!ok) {
      setError("Speichern fehlgeschlagen (Browser Storage). Bitte Safari neu laden.");
      return;
    }
    router.replace("/");
  }

  const card: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 18,
    padding: 18,
    background: "#fff",
    maxWidth: 520,
    margin: "24px auto",
  };
  const btn: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 900,
    background: "#111",
    color: "#fff",
    width: "100%",
  };
  const select: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    fontSize: 16,
    background: "#fff",
  };

  return (
    <main style={{ padding: 24 }}>
      <div style={card}>
        <h1 style={{ margin: 0, fontSize: 34 }}>Login</h1>
        <div style={{ marginTop: 8, opacity: 0.75 }}>
          Bitte Nutzer auswählen (Datenbank ist gemeinsam).
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontWeight: 900 }}>Nutzer</label>
          <div style={{ marginTop: 8 }}>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} style={select}>
              {USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 12, color: "#111", background: "#fff", border: "2px solid #111", borderRadius: 12, padding: 10 }}>
            {error}
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
          <button onClick={onLogin} style={btn}>
            Anmelden
          </button>
        </div>
      </div>
    </main>
  );
}