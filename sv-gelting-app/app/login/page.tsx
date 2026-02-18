"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveUser, type User } from "../lib/auth";

const USERS: User[] = [
  { id: "wolfgang", name: "Wolfgang" },
  { id: "volker", name: "Volker" },
];

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>(USERS[0]?.id ?? "");
  const [error, setError] = useState<string>("");

  const user = useMemo(() => USERS.find((u) => u.id === userId) ?? null, [userId]);

  function onLogin() {
    setError("");
    if (!user) return setError("Bitte Nutzer wählen.");
    const ok = saveUser(user);
    if (!ok) return setError("Login fehlgeschlagen: Safari speichert nichts (evtl. privater Tab).");
    router.replace("/");
  }

  const page: React.CSSProperties = { padding: 24 };
  const card: React.CSSProperties = {
    maxWidth: 520,
    margin: "24px auto",
    border: "2px solid #111",
    borderRadius: 22,
    padding: 18,
    background: "#fff",
  };
  const pill: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 900,
    background: "#fff",
    color: "#111",
    width: "100%",
  };
  const btn: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 999,
    padding: "12px 14px",
    fontWeight: 950,
    background: "#111",
    color: "#fff",
    width: "100%",
  };

  return (
    <main style={page}>
      <div style={card}>
        <h1 style={{ margin: 0, fontSize: 34 }}>Login</h1>
        <div style={{ marginTop: 8, opacity: 0.75 }}>
          Wolfgang & Volker arbeiten auf derselben Datenbank.
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Nutzer</div>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} style={pill}>
            {USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div style={{ marginTop: 12, border: "2px solid #111", borderRadius: 14, padding: 12, fontWeight: 900 }}>
            {error}
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
          <button onClick={onLogin} style={btn}>
            Anmelden
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>
          iPad Tipp: Safari nicht im privaten Modus verwenden.
        </div>
      </div>
    </main>
  );
}