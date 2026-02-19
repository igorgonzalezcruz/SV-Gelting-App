"use client";

import { useState } from "react";

const USERS = [
  { username: "wolfgang", password: "wolfgang123", name: "Wolfgang" },
  { username: "volker", password: "volker123", name: "Volker" },
];

export default function LoginPage() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  function login() {
    const user = u.trim().toLowerCase();
    const pass = p;

    const found = USERS.find((x) => x.username === user && x.password === pass);

    if (!found) {
      setErr("Falscher Login");
      return;
    }

    // ✅ EINHEITLICH: wir speichern ab jetzt nur den Anzeigenamen als String
    localStorage.setItem("svgelting_user", found.name);

    // ✅ Altlasten entfernen
    localStorage.removeItem("sv_user");

    window.location.href = "/";
  }

  const box: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 18,
    padding: 20,
    maxWidth: 420,
    margin: "60px auto",
    background: "#fff",
  };

  const input: React.CSSProperties = {
    width: "100%",
    marginTop: 10,
    border: "2px solid #111",
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
  };

  const btn: React.CSSProperties = {
    marginTop: 14,
    border: "2px solid #111",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 900,
    background: "#111",
    color: "#fff",
    width: "100%",
  };

  return (
    <main style={{ padding: 24 }}>
      <div style={box}>
        <h1 style={{ marginTop: 0 }}>Trainer Login</h1>

        <input
          placeholder="Benutzer (wolfgang / volker)"
          value={u}
          onChange={(e) => setU(e.target.value)}
          style={input}
          autoCapitalize="none"
          autoCorrect="off"
        />

        <input
          type="password"
          placeholder="Passwort"
          value={p}
          onChange={(e) => setP(e.target.value)}
          style={input}
        />

        <button onClick={login} style={btn}>
          Login
        </button>

        {err && <div style={{ marginTop: 10, fontWeight: 900 }}>{err}</div>}
      </div>
    </main>
  );
}