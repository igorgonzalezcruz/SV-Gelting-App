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
    const found = USERS.find(
      (x) => x.username.toLowerCase() === u.toLowerCase() && x.password === p
    );

    if (!found) {
      setErr("Falscher Login");
      return;
    }

    localStorage.setItem("sv_user", JSON.stringify(found));
    window.location.href = "/";
  }

  const box: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 18,
    padding: 20,
    maxWidth: 420,
    margin: "60px auto",
  };

  return (
    <main style={{ padding: 24 }}>
      <div style={box}>
        <h1>Trainer Login</h1>

        <input
          placeholder="Benutzer"
          value={u}
          onChange={(e) => setU(e.target.value)}
          style={{ width: "100%", marginTop: 10 }}
        />

        <input
          type="password"
          placeholder="Passwort"
          value={p}
          onChange={(e) => setP(e.target.value)}
          style={{ width: "100%", marginTop: 10 }}
        />

        <button onClick={login} style={{ marginTop: 14 }}>
          Login
        </button>

        {err && <div style={{ marginTop: 10 }}>{err}</div>}
      </div>
    </main>
  );
}