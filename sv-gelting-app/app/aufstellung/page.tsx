"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Termin, Player, MatchStatsStore, LineupStore, MatchStatsEntry, LineupEntry } from "../lib/store";
import { loadTermine, loadPlayers, loadMatchStats, saveMatchStats, loadLineup, saveLineup } from "../lib/store";

function safeArr<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}
function safeObj<T extends object>(v: any): T {
  return v && typeof v === "object" ? (v as T) : ({} as T);
}

function formatDateDE(iso: string) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function isUpcoming(t: Termin) {
  const ts = new Date(`${t.datum}T${t.uhrzeit}:00`).getTime();
  return ts >= Date.now();
}

function ensureLineupEntry(e: any): LineupEntry {
  const obj = safeObj<LineupEntry>(e);
  return {
    starterIds: safeArr<string>((obj as any).starterIds),
    benchIds: safeArr<string>((obj as any).benchIds),
    note: typeof (obj as any).note === "string" ? (obj as any).note : "",
  };
}

function ensureStatsEntry(e: any): MatchStatsEntry {
  const obj = safeObj<MatchStatsEntry>(e);
  return {
    minutes: Number.isFinite((obj as any).minutes) ? Number((obj as any).minutes) : 0,
    goals: Number.isFinite((obj as any).goals) ? Number((obj as any).goals) : 0,
    assists: Number.isFinite((obj as any).assists) ? Number((obj as any).assists) : 0,
    note: typeof (obj as any).note === "string" ? (obj as any).note : "",
  };
}

export default function AufstellungPage() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStatsStore>({});
  const [lineup, setLineup] = useState<LineupStore>({});

  useEffect(() => {
    setTermine(safeArr<Termin>(loadTermine()));
    setPlayers(safeArr<Player>(loadPlayers()));
    setMatchStats(safeObj<MatchStatsStore>(loadMatchStats()));
    setLineup(safeObj<LineupStore>(loadLineup()));
  }, []);

  useEffect(() => {
    saveMatchStats(matchStats);
  }, [matchStats]);

  useEffect(() => {
    saveLineup(lineup);
  }, [lineup]);

  const upcoming = useMemo(() => {
    return safeArr<Termin>(termine)
      .filter((t) => t.typ === "Spiel")
      .sort((a, b) => `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`));
  }, [termine]);

  const defaultTerminId = upcoming.find(isUpcoming)?.id || upcoming[0]?.id || "";
  const [terminId, setTerminId] = useState<string>("");

  useEffect(() => {
    if (!terminId && defaultTerminId) setTerminId(defaultTerminId);
  }, [defaultTerminId, terminId]);

  const termin = useMemo(() => {
    return safeArr<Termin>(termine).find((t) => t.id === terminId) ?? null;
  }, [termine, terminId]);

  const teamPlayers = useMemo(() => {
    if (!termin) return [];
    return safeArr<Player>(players)
      .filter((p) => p.team === termin.team)
      .sort(
        (a, b) =>
          (parseInt(a.number || "9999", 10) - parseInt(b.number || "9999", 10)) ||
          a.name.localeCompare(b.name)
      );
  }, [players, termin]);

  const perStats = useMemo(() => {
    const ms = safeObj<MatchStatsStore>(matchStats);
    const per = ms[terminId] ?? {};
    return safeObj<Record<string, MatchStatsEntry>>(per);
  }, [matchStats, terminId]);

  const perLineup = useMemo(() => {
    const lu = safeObj<LineupStore>(lineup);
    return ensureLineupEntry(lu[terminId]);
  }, [lineup, terminId]);

  function toggleStarter(playerId: string) {
    setLineup((prev) => {
      const next = { ...safeObj<LineupStore>(prev) };
      const e = ensureLineupEntry(next[terminId]);
      const inStarters = e.starterIds.includes(playerId);
      const inBench = e.benchIds.includes(playerId);

      let starterIds = e.starterIds.slice();
      let benchIds = e.benchIds.slice();

      if (inStarters) {
        starterIds = starterIds.filter((x) => x !== playerId);
      } else {
        starterIds.push(playerId);
        if (inBench) benchIds = benchIds.filter((x) => x !== playerId);
      }

      next[terminId] = { ...e, starterIds, benchIds };
      return next;
    });
  }

  function toggleBench(playerId: string) {
    setLineup((prev) => {
      const next = { ...safeObj<LineupStore>(prev) };
      const e = ensureLineupEntry(next[terminId]);
      const inStarters = e.starterIds.includes(playerId);
      const inBench = e.benchIds.includes(playerId);

      let starterIds = e.starterIds.slice();
      let benchIds = e.benchIds.slice();

      if (inBench) {
        benchIds = benchIds.filter((x) => x !== playerId);
      } else {
        benchIds.push(playerId);
        if (inStarters) starterIds = starterIds.filter((x) => x !== playerId);
      }

      next[terminId] = { ...e, starterIds, benchIds };
      return next;
    });
  }

  function setStat(playerId: string, patch: Partial<MatchStatsEntry>) {
    setMatchStats((prev) => {
      const next = { ...safeObj<MatchStatsStore>(prev) };
      const per = safeObj<Record<string, MatchStatsEntry>>(next[terminId]);
      const curr = ensureStatsEntry(per[playerId]);
      per[playerId] = { ...curr, ...patch };
      next[terminId] = per;
      return next;
    });
  }

  const card: React.CSSProperties = { border: "2px solid #111", borderRadius: 18, padding: 18, background: "#fff", maxWidth: 1100, marginTop: 16 };
  const btn: React.CSSProperties = { border: "2px solid #111", borderRadius: 999, padding: "10px 14px", fontWeight: 900, background: "#fff", color: "#111" };
  const row: React.CSSProperties = { border: "2px solid #111", borderRadius: 16, padding: 12, background: "#fff" };
  const pill: React.CSSProperties = { border: "2px solid #111", borderRadius: 999, padding: "6px 10px", fontWeight: 900, background: "#fff" };
  const input: React.CSSProperties = { border: "2px solid #111", borderRadius: 12, padding: "8px 10px", width: 90 };

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <h1 style={{ fontSize: 44, margin: 0 }}>Aufstellung</h1>
        <Link href="/" style={{ ...btn, textDecoration: "none" }}>← Dashboard</Link>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontWeight: 900 }}>Spiel:</span>
        <select
          value={terminId}
          onChange={(e) => setTerminId(e.target.value)}
          style={{ ...pill, paddingRight: 18 }}
        >
          {upcoming.map((t) => (
            <option key={t.id} value={t.id}>
              {t.team} • {t.titel} • {formatDateDE(t.datum)} {t.uhrzeit}
            </option>
          ))}
        </select>

        {!termin ? (
          <span style={{ opacity: 0.75 }}>Kein Spiel ausgewählt.</span>
        ) : (
          <span style={{ opacity: 0.8 }}>
            <b>{termin.team}</b> • {termin.titel} • {formatDateDE(termin.datum)} {termin.uhrzeit}
          </span>
        )}
      </div>

      {!termin ? null : (
        <div style={card}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 950, fontSize: 20 }}>
              Startelf: <span style={{ opacity: 0.75 }}>{perLineup.starterIds.length}</span> • Bank:{" "}
              <span style={{ opacity: 0.75 }}>{perLineup.benchIds.length}</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={pill}>✅ Startelf tippen</span>
              <span style={pill}>🪑 Bank tippen</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {teamPlayers.map((p) => {
              const isS = perLineup.starterIds.includes(p.id);
              const isB = perLineup.benchIds.includes(p.id);
              const st = ensureStatsEntry(perStats[p.id]);

              return (
                <div key={p.id} style={row}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontWeight: 950, flex: 1 }}>
                      {p.number ? `#${p.number} ` : ""}
                      {p.name} <span style={{ opacity: 0.7 }}>({p.position})</span>
                    </div>

                    <button style={btn} onClick={() => toggleStarter(p.id)}>
                      {isS ? "✅ Startelf" : "Startelf"}
                    </button>
                    <button style={btn} onClick={() => toggleBench(p.id)}>
                      {isB ? "🪑 Bank" : "Bank"}
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
                    <div style={{ fontWeight: 900, opacity: 0.85 }}>Stats:</div>

                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      Min
                      <input
                        style={input}
                        inputMode="numeric"
                        value={String(st.minutes)}
                        onChange={(e) => setStat(p.id, { minutes: parseInt(e.target.value || "0", 10) || 0 })}
                      />
                    </label>

                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      Tore
                      <input
                        style={input}
                        inputMode="numeric"
                        value={String(st.goals)}
                        onChange={(e) => setStat(p.id, { goals: parseInt(e.target.value || "0", 10) || 0 })}
                      />
                    </label>

                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      Assists
                      <input
                        style={input}
                        inputMode="numeric"
                        value={String(st.assists)}
                        onChange={(e) => setStat(p.id, { assists: parseInt(e.target.value || "0", 10) || 0 })}
                      />
                    </label>

                    <div style={{ marginLeft: "auto", fontWeight: 900, opacity: 0.85 }}>
                      Status: {isS ? "✅ Startelf" : isB ? "🪑 Bank" : "⚪ offen"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, opacity: 0.7 }}>
            Tipp: Wenn du auf iPad mal „komische Null-Werte“ hattest → das ist jetzt abgesichert (keine map()-Crashes mehr).
          </div>
        </div>
      )}
    </main>
  );
}