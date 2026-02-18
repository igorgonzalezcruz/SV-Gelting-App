"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Player, Termin, RatingsStore, Ratings, TestsStore, TestType, TestEntry, MatchStatsStore } from "../../lib/store";
import {
  loadTermine,
  loadPlayers,
  loadRatings,
  loadTests,
  saveTests,
  classifyTest,
  kindStyle,
  loadSeason,
  loadMatchStats,
} from "../../lib/store";

function formatDateDE(iso: string) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
function isPast(t: Termin) {
  return new Date(`${t.datum}T${t.uhrzeit}:00`).getTime() < Date.now();
}
function avg(r: Ratings) {
  return (r.spielintelligenz + r.kondition + r.technisch + r.verstaendnis) / 4;
}

export default function PlayerStatsPage() {
  const params = useParams();
  const playerId = String((params as any)?.playerId || "");

  const [season, setSeason] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [termine, setTermine] = useState<Termin[]>([]);
  const [ratings, setRatings] = useState<RatingsStore>({});
  const [tests, setTests] = useState<TestsStore>({});
  const [matchStats, setMatchStats] = useState<MatchStatsStore>({});

  useEffect(() => {
    setSeason(loadSeason());
    setPlayers(loadPlayers());
    setTermine(loadTermine());
    setRatings(loadRatings());
    setTests(loadTests());
    setMatchStats(loadMatchStats());
  }, []);

  const player = players.find((p) => p.id === playerId) ?? null;

  const teamTermine = useMemo(() => {
    if (!player) return [];
    return termine
      .filter((t) => t.saison === season)
      .filter((t) => t.team === player.team)
      .slice()
      .sort((a, b) => `${b.datum}T${b.uhrzeit}`.localeCompare(`${a.datum}T${a.uhrzeit}`));
  }, [termine, player, season]);

  const pastGames = useMemo(
    () => teamTermine.filter((t) => t.typ === "Spiel" && isPast(t)),
    [teamTermine]
  );

  const testEntries = useMemo(() => {
    if (!player) return { cooper: [], shuttle: [] };
    const all = tests[player.id] ?? [];
    return {
      cooper: all.filter((e) => e.test === "cooper").sort((a, b) => `${b.dateISO}`.localeCompare(`${a.dateISO}`)),
      shuttle: all.filter((e) => e.test === "shuttle").sort((a, b) => `${b.dateISO}`.localeCompare(`${a.dateISO}`)),
    };
  }, [tests, player]);

  const matchSum = useMemo(() => {
    if (!player) return { minutes: 0, goals: 0, assists: 0 };
    let minutes = 0, goals = 0, assists = 0;
    for (const g of pastGames) {
      const e = matchStats[g.id]?.[player.id];
      if (!e) continue;
      minutes += e.minutes || 0;
      goals += e.goals || 0;
      assists += e.assists || 0;
    }
    return { minutes, goals, assists };
  }, [player, pastGames, matchStats]);

  // ✅ Shuttle Eingabe jetzt mit Trainer-Beschriftung
  function addTest(test: TestType) {
    if (!player) return;

    const text =
      test === "cooper"
        ? "Cooper Ergebnis (Meter)"
        : "Shuttle Run Ergebnis (Level/Bahn ODER Meter)\nBeispiel: 10/6 oder 1700";

    const vRaw = prompt(text, "");
    if (vRaw === null) return;

    let value = Number(vRaw);

    // 🔥 Level/Bahn erkannt (z.B. 10/6)
    if (test === "shuttle" && vRaw.includes("/")) {
      const [lvl, lane] = vRaw.split("/").map(Number);
      if (!isNaN(lvl) && !isNaN(lane)) {
        value = Math.round((lvl * 100 + lane * 20)); // einfache Trainer-Umrechnung
      }
    }

    if (!Number.isFinite(value)) return alert("Bitte gültigen Wert eingeben.");

    const dateISO = prompt("Datum (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
    if (!dateISO) return;

    const entry: TestEntry = { test, dateISO, value };
    const next: TestsStore = { ...tests };
    const list = (next[player.id] ?? []).slice();
    list.unshift(entry);
    next[player.id] = list;
    setTests(next);
    saveTests(next);
  }

  const card: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 18,
    padding: 18,
    background: "#fff",
    maxWidth: 980,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  };

  const btn: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 950,
    background: "#fff",
  };

  if (!player) {
    return (
      <main style={{ padding: 24 }}>
        Spieler nicht gefunden. <Link href="/stats">zurück</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 44 }}>
        {player.number ? `#${player.number} ` : ""}{player.name}
      </h1>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950 }}>Spiel Statistik</div>
        <div style={{ marginTop: 10 }}>
          ⏱ {matchSum.minutes} Min • ⚽ {matchSum.goals} Tore • 🎯 {matchSum.assists} Vorlagen
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950 }}>Tests</div>

        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <button style={btn} onClick={() => addTest("cooper")}>+ Cooper (Meter)</button>
          <button style={btn} onClick={() => addTest("shuttle")}>+ Shuttle (Level/Bahn oder Meter)</button>
        </div>

        <div style={{ marginTop: 14 }}>
          <b>Shuttle Run (Level/Bahn oder Meter)</b>

          {testEntries.shuttle.map((e, i) => {
            const c = classifyTest("shuttle", e.value);
            return (
              <div key={i} style={{ marginTop: 6 }}>
                {formatDateDE(e.dateISO)} —{" "}
                <span style={{ border: "2px solid", borderRadius: 999, padding: "2px 8px", ...kindStyle(c.kind) }}>
                  {e.value} • {c.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}