"use client";

import { useEffect, useMemo, useState } from "react";
import type { Termin, Player, Team, LineupStore } from "../lib/store";
import { loadLineup, loadPlayers, loadSeason, loadTermine, saveLineup } from "../lib/store";

function isPast(t: Termin) {
  return new Date(`${t.datum}T${t.uhrzeit}:00`).getTime() < Date.now();
}
function formatDateDE(iso: string) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export default function AufstellungPage() {
  const [season, setSeason] = useState("");
  const [termine, setTermine] = useState<Termin[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lineup, setLineup] = useState<LineupStore>({});

  const [team, setTeam] = useState<Team>("1. Mannschaft");
  const [terminId, setTerminId] = useState<string>("");

  useEffect(() => {
    setSeason(loadSeason());
    setTermine(loadTermine());
    setPlayers(loadPlayers());
    setLineup(loadLineup());
  }, []);

  useEffect(() => {
    saveLineup(lineup);
  }, [lineup]);

  const spiele = useMemo(() => {
    return termine
      .filter((t) => t.saison === season)
      .filter((t) => t.team === team)
      .filter((t) => t.typ === "Spiel")
      .slice()
      .sort((a, b) => `${b.datum}T${b.uhrzeit}`.localeCompare(`${a.datum}T${a.uhrzeit}`));
  }, [termine, season, team]);

  useEffect(() => {
    if (!terminId && spiele.length) setTerminId(spiele[0].id);
  }, [terminId, spiele]);

  const termin = spiele.find((t) => t.id === terminId) ?? null;
  const teamPlayers = useMemo(() => players.filter((p) => p.team === team).slice().sort((a, b) => (parseInt(a.number || "9999", 10) - parseInt(b.number || "9999", 10)) || a.name.localeCompare(b.name)), [players, team]);

  const cur = lineup[terminId] ?? { starterIds: [], benchIds: [], note: "" };

  function toggleStarter(pid: string) {
    if (!terminId) return;
    setLineup((prev) => {
      const next = { ...prev };
      const c = next[terminId] ?? { starterIds: [], benchIds: [], note: "" };
      const starter = new Set(c.starterIds);
      const bench = new Set(c.benchIds);

      if (starter.has(pid)) starter.delete(pid);
      else {
        starter.add(pid);
        bench.delete(pid);
      }
      next[terminId] = { ...c, starterIds: Array.from(starter), benchIds: Array.from(bench) };
      return next;
    });
  }

  function toggleBench(pid: string) {
    if (!terminId) return;
    setLineup((prev) => {
      const next = { ...prev };
      const c = next[terminId] ?? { starterIds: [], benchIds: [], note: "" };
      const starter = new Set(c.starterIds);
      const bench = new Set(c.benchIds);

      if (bench.has(pid)) bench.delete(pid);
      else {
        bench.add(pid);
        starter.delete(pid);
      }
      next[terminId] = { ...c, starterIds: Array.from(starter), benchIds: Array.from(bench) };
      return next;
    });
  }

  const card: React.CSSProperties = { border: "2px solid #111", borderRadius: 18, padding: 18, background: "#fff", maxWidth: 980, boxShadow: "0 10px 30px rgba(0,0,0,0.06)" };
  const input: React.CSSProperties = { border: "2px solid #111", borderRadius: 12, padding: "10px 12px", fontSize: 16, background: "#fff", width: "100%" };
  const btn: React.CSSProperties = { border: "2px solid #111", borderRadius: 999, padding: "10px 14px", fontWeight: 950, background: "#fff" };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 44, margin: 0 }}>Aufstellung</h1>
      <p style={{ marginTop: 10, opacity: 0.9 }}>Startelf/Bank pro Spieltermin • Saison: <b>{season}</b></p>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Team</div>
        <select style={input} value={team} onChange={(e) => { setTeam(e.target.value as Team); setTerminId(""); }}>
          <option value="1. Mannschaft">1. Mannschaft</option>
          <option value="2. Mannschaft">2. Mannschaft</option>
        </select>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Spieltermin</div>
        {spiele.length === 0 ? (
          <div style={{ opacity: 0.85 }}>Keine Spiele in dieser Saison.</div>
        ) : (
          <select style={input} value={terminId} onChange={(e) => setTerminId(e.target.value)}>
            {spiele.map((t) => (
              <option key={t.id} value={t.id}>
                {formatDateDE(t.datum)} {t.uhrzeit} • {t.titel}
              </option>
            ))}
          </select>
        )}
        {termin && (
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Status: {isPast(termin) ? "Vergangenheit" : "Zukunft"}
          </div>
        )}
      </div>

      {!termin ? null : (
        <div style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 950 }}>Spieler auswählen</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div style={{ border: "2px solid #111", borderRadius: 16, padding: 12 }}>
              <div style={{ fontWeight: 950 }}>Startelf</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {teamPlayers.map((p) => {
                  const active = cur.starterIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      style={{ ...btn, background: active ? "#111" : "#fff", color: active ? "#fff" : "#111" }}
                      onClick={() => toggleStarter(p.id)}
                    >
                      {p.number ? `#${p.number} ` : ""}{p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ border: "2px solid #111", borderRadius: 16, padding: 12 }}>
              <div style={{ fontWeight: 950 }}>Bank</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {teamPlayers.map((p) => {
                  const active = cur.benchIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      style={{ ...btn, background: active ? "#111" : "#fff", color: active ? "#fff" : "#111" }}
                      onClick={() => toggleBench(p.id)}
                    >
                      {p.number ? `#${p.number} ` : ""}{p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 950, marginBottom: 6 }}>Interne Notiz</div>
            <textarea
              style={{ ...input, height: 90 }}
              value={cur.note ?? ""}
              onChange={(e) => setLineup((prev) => ({ ...prev, [terminId]: { ...cur, note: e.target.value } }))}
              placeholder="nur intern"
            />
          </div>
        </div>
      )}
    </main>
  );
}