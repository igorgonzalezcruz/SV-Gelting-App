"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceStore, Player, Termin } from "../lib/store";
import { loadAttendance, loadPlayers, loadTermine, saveAttendance } from "../lib/store";

function formatDateDE(iso: string) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export default function CheckInClient() {
  const params = useSearchParams();
  const terminFromUrl = params.get("termin") || "";

  const [hydrated, setHydrated] = useState(false);
  const [termine, setTermine] = useState<Termin[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attStore, setAttStore] = useState<AttendanceStore>({});

  // ✅ nur im Browser laden
  useEffect(() => {
    setTermine(loadTermine() ?? []);
    setPlayers(loadPlayers() ?? []);
    setAttStore(loadAttendance() ?? {});
    setHydrated(true);
  }, []);

  // ✅ nur speichern, wenn initial geladen wurde
  useEffect(() => {
    if (!hydrated) return;
    saveAttendance(attStore ?? {});
  }, [attStore, hydrated]);

  const terminId = terminFromUrl || termine[0]?.id || "";
  const termin = termine.find((t) => t.id === terminId) ?? null;

  const teamPlayers = useMemo(() => {
    if (!termin) return [];
    return players
      .filter((p) => p.team === termin.team)
      .sort(
        (a, b) =>
          (parseInt(a.number || "9999", 10) - parseInt(b.number || "9999", 10)) ||
          a.name.localeCompare(b.name)
      );
  }, [players, termin]);

  const perTermin = termin ? (attStore[termin.id] ?? {}) : {};
  const presentCount = teamPlayers.filter((p) => perTermin[p.id] === true).length;

  function setAtt(playerId: string, value: boolean) {
    if (!termin) return;
    setAttStore((prev) => {
      const next = { ...prev };
      const per = { ...(next[termin.id] ?? {}) };
      per[playerId] = value;
      next[termin.id] = per;
      return next;
    });
  }

  function clearAtt(playerId: string) {
    if (!termin) return;
    setAttStore((prev) => {
      const next = { ...prev };
      const per = { ...(next[termin.id] ?? {}) };
      delete per[playerId];
      next[termin.id] = per;
      return next;
    });
  }

  const card: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 18,
    padding: 18,
    background: "#fff",
    maxWidth: 900,
    marginTop: 16,
  };
  const btn: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 900,
    background: "#fff",
    color: "#111",
  };
  const row: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 16,
    padding: 12,
    background: "#fff",
  };

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <h1 style={{ fontSize: 44, margin: 0 }}>Check in</h1>
        <Link
          href="/termine"
          style={{
            border: "2px solid #111",
            borderRadius: 999,
            padding: "10px 14px",
            fontWeight: 900,
            textDecoration: "none",
            color: "#111",
            background: "#fff",
          }}
        >
          ← Zu den Terminen
        </Link>
      </div>

      {termin ? (
        <div style={{ marginTop: 10, opacity: 0.9 }}>
          <b>{termin.team}</b> • {termin.typ} • {termin.titel} • {formatDateDE(termin.datum)} {termin.uhrzeit}
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>Kein Termin ausgewählt / gefunden.</div>
      )}

      {!termin ? null : (
        <div style={card}>
          <div style={{ fontWeight: 950, fontSize: 20 }}>
            Anwesenheit:{" "}
            <span style={{ opacity: 0.75 }}>
              {presentCount} / {teamPlayers.length}
            </span>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {teamPlayers.map((p) => {
              const v = perTermin[p.id];
              return (
                <div key={p.id} style={row}>
                  <div style={{ fontWeight: 950 }}>
                    {p.number ? `#${p.number} ` : ""}
                    {p.name} <span style={{ opacity: 0.7 }}>({p.position})</span>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                    <button style={btn} onClick={() => setAtt(p.id, true)}>
                      ✅ war da
                    </button>
                    <button style={btn} onClick={() => setAtt(p.id, false)}>
                      ❌ nicht da
                    </button>
                    <button style={btn} onClick={() => clearAtt(p.id)}>
                      ⟲ offen
                    </button>

                    <div style={{ marginLeft: "auto", fontWeight: 900, opacity: 0.85, paddingTop: 10 }}>
                      Status: {v === true ? "✅ da" : v === false ? "❌ nicht da" : "⚪ offen"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}