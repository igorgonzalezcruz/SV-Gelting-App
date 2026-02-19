"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceStore, MatchStatsStore, Player, RatingsStore, Termin, TestsStore } from "../lib/store";
import { loadAttendance, loadMatchStats, loadPlayers, loadRatings, loadTermine, loadTests } from "../lib/store";
import { SparkLine } from "../components/Charts";
import { getCooperSeriesNewestFirst, getPlayerRatingSeriesNewestFirst, isPast } from "../lib/insights";

function formatDateDE(iso: string) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export default function StatsPage() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [att, setAtt] = useState<AttendanceStore>({});
  const [ratings, setRatings] = useState<RatingsStore>({});
  const [tests, setTests] = useState<TestsStore>({});
  const [matchStats, setMatchStats] = useState<MatchStatsStore>({});

  useEffect(() => {
    setTermine(loadTermine() ?? []);
    setPlayers(loadPlayers() ?? []);
    setAtt(loadAttendance() ?? {});
    setRatings(loadRatings() ?? {});
    setTests(loadTests() ?? {});
    setMatchStats(loadMatchStats() ?? {});
  }, []);

  const team = "1. Mannschaft" as const;

  const pastNewestFirst = useMemo(() => {
    const teamTermine = termine.filter((t) => t.team === team);
    return teamTermine.filter(isPast).sort((a, b) => (b.datum + b.uhrzeit).localeCompare(a.datum + a.uhrzeit));
  }, [termine]);

  const teamPlayers = useMemo(() => players.filter((p) => p.team === team), [players]);

  // Team Attendance pro Termin (nur Termine mit irgendeinem Check-In)
  const teamAttendanceSeriesNewestFirst = useMemo(() => {
    const out: number[] = [];
    for (const t of pastNewestFirst) {
      const per = att[t.id];
      if (!per) continue;
      const vals = Object.values(per);
      const counted = vals.filter((v) => v === true || v === false).length;
      if (!counted) continue;
      const present = vals.filter((v) => v === true).length;
      out.push(present / counted);
    }
    return out;
  }, [pastNewestFirst, att]);

  const top = useMemo(() => {
    return teamPlayers
      .map((p) => {
        const train = getPlayerRatingSeriesNewestFirst(p.id, pastNewestFirst, ratings, "Training");
        const spiel = getPlayerRatingSeriesNewestFirst(p.id, pastNewestFirst, ratings, "Spiel");
        const cooper = getCooperSeriesNewestFirst(p.id, tests, "cooper");
        const shuttle = getCooperSeriesNewestFirst(p.id, tests, "shuttle");

        // Goals+Assists letzte 5 Spiele
        let ga = 0;
        let mins = 0;
        let games = 0;
        for (const t of pastNewestFirst) {
          if (t.typ !== "Spiel") continue;
          const ms = matchStats[t.id]?.[p.id];
          if (!ms) continue;
          ga += (ms.goals || 0) + (ms.assists || 0);
          mins += ms.minutes || 0;
          games += 1;
          if (games >= 5) break;
        }

        return { p, train, spiel, cooper, shuttle, ga, mins };
      })
      .sort((a, b) => (b.ga - a.ga) || (b.mins - a.mins))
      .slice(0, 12);
  }, [teamPlayers, pastNewestFirst, ratings, tests, matchStats]);

  const shell: React.CSSProperties = { padding: 18, maxWidth: 1100, margin: "0 auto" };
  const h1: React.CSSProperties = { fontSize: 44, margin: "8px 0 14px", fontWeight: 950, letterSpacing: -1 };
  const card: React.CSSProperties = { border: "2px solid #111", borderRadius: 18, padding: 14, background: "#fff" };
  const grid: React.CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" };
  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "2px solid #111",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 900,
    textDecoration: "none",
    color: "#111",
    background: "#fff",
  };

  return (
    <main style={shell}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <div style={{ opacity: 0.7, fontWeight: 900 }}>{team}</div>
          <h1 style={h1}>Stats</h1>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/" style={pill}>Dashboard</Link>
          <Link href="/termine" style={pill}>Termine</Link>
        </div>
      </div>

      <div style={grid}>
        <section style={card}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Team-Trend: Anwesenheit</div>
          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <SparkLine values={teamAttendanceSeriesNewestFirst.map((x) => Math.round(x * 100))} />
            <div style={{ fontWeight: 900, opacity: 0.85 }}>
              Basis: vergangene Termine mit Check-ins
              <div style={{ marginTop: 6, opacity: 0.8 }}>
                (Linie zeigt % Anwesenheit pro Termin)
              </div>
            </div>
          </div>
        </section>

        <section style={card}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Top-Impact (letzte 5 Spiele)</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {top.map((x) => (
              <div key={x.p.id} style={{ border: "2px solid #111", borderRadius: 16, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 950 }}>
                    {x.p.number ? `#${x.p.number} ` : ""}{x.p.name}
                    <span style={{ opacity: 0.7 }}> • {x.p.position}</span>
                  </div>
                  <Link href={`/stats/${encodeURIComponent(x.p.id)}`} style={pill}>Profil</Link>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>G+A: <span style={{ fontWeight: 950 }}>{x.ga}</span></div>
                    <div style={{ fontWeight: 900 }}>Min: <span style={{ fontWeight: 950 }}>{x.mins}</span></div>
                    <div style={{ fontWeight: 900 }}>Cooper: <span style={{ fontWeight: 950 }}>{x.cooper[0] ?? "—"}</span></div>
                    <div style={{ fontWeight: 900 }}>Shuttle: <span style={{ fontWeight: 950 }}>{x.shuttle[0] ?? "—"}</span></div>
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Training-Noten</div>
                      <SparkLine values={x.train} invert />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Spiel-Noten</div>
                      <SparkLine values={x.spiel} invert />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, opacity: 0.75, fontWeight: 900 }}>
            Tipp: Im Spielerprofil kannst du Details + Tests + Verlauf ansehen.
          </div>
        </section>

        <section style={card}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Letzte Termine</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {pastNewestFirst.slice(0, 10).map((t) => (
              <div key={t.id} style={{ border: "2px solid #111", borderRadius: 16, padding: 10 }}>
                <div style={{ fontWeight: 950 }}>{t.typ}: {t.titel}</div>
                <div style={{ opacity: 0.85, marginTop: 4 }}>{formatDateDE(t.datum)} • {t.uhrzeit}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href={`/check-in?termin=${encodeURIComponent(t.id)}`} style={pill}>Check-in</Link>
                  <Link href="/bewertung" style={pill}>Bewertung</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}