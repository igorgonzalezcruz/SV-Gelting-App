"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceStore, MatchStatsStore, Player, RatingsStore, Termin, TestsStore } from "./lib/store";
import { loadAttendance, loadMatchStats, loadPlayers, loadRatings, loadTermine, loadTests } from "./lib/store";
import { buildInsights, getCooperSeriesNewestFirst, getPlayerRatingSeriesNewestFirst, isPast, isUpcoming } from "./lib/insights";
import { BarMini, SparkLine } from "./components/Charts";

function formatDateDE(iso: string) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export default function DashboardPage() {
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

  // Dashboard: nur 1. Mannschaft (wie du wolltest)
  const team = "1. Mannschaft" as const;

  const teamPlayers = useMemo(() => players.filter((p) => p.team === team), [players]);
  const teamTermine = useMemo(() => termine.filter((t) => t.team === team), [termine]);

  const upcoming = useMemo(
    () => teamTermine.filter(isUpcoming).sort((a, b) => (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit)).slice(0, 6),
    [teamTermine]
  );

  const pastNewestFirst = useMemo(
    () => teamTermine.filter(isPast).sort((a, b) => (b.datum + b.uhrzeit).localeCompare(a.datum + a.uhrzeit)),
    [teamTermine]
  );

  const insights = useMemo(
    () =>
      buildInsights({
        team,
        termine,
        players,
        attendance: att,
        ratings,
        tests,
        matchStats,
      }),
    [team, termine, players, att, ratings, tests, matchStats]
  );

  // Ranking: Trainingsbeteiligung + Note (Training/Spiel) + Fitness
  const ranking = useMemo(() => {
    // attendance rate
    const past = pastNewestFirst;
    function rate(pid: string) {
      let present = 0;
      let counted = 0;
      for (const t of past) {
        const per = att[t.id];
        if (!per) continue;
        const v = per[pid];
        if (v === true) {
          present += 1;
          counted += 1;
        } else if (v === false) {
          counted += 1;
        }
      }
      if (!counted) return null;
      return present / counted;
    }

    return teamPlayers
      .map((p) => {
        const r = rate(p.id);
        const tr = getPlayerRatingSeriesNewestFirst(p.id, pastNewestFirst, ratings, "Training");
        const sr = getPlayerRatingSeriesNewestFirst(p.id, pastNewestFirst, ratings, "Spiel");
        const cooper = getCooperSeriesNewestFirst(p.id, tests, "cooper");
        const shuttle = getCooperSeriesNewestFirst(p.id, tests, "shuttle");
        return {
          p,
          att: r,
          trainNote: tr[0] ?? null,
          spielNote: sr[0] ?? null,
          cooper: cooper[0] ?? null,
          shuttle: shuttle[0] ?? null,
          trainSeries: tr,
          spielSeries: sr,
        };
      })
      .sort((a, b) => (b.att ?? -1) - (a.att ?? -1))
      .slice(0, 8);
  }, [teamPlayers, pastNewestFirst, att, ratings, tests]);

  const shell: React.CSSProperties = { padding: 18, maxWidth: 1100, margin: "0 auto" };
  const h1: React.CSSProperties = { fontSize: 44, margin: "8px 0 14px", fontWeight: 950, letterSpacing: -1 };
  const grid: React.CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" };
  const card: React.CSSProperties = { border: "2px solid #111", borderRadius: 18, padding: 14, background: "#fff" };
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

  function badge(level: "good" | "warn" | "info") {
    if (level === "good") return { border: "2px solid #111", borderRadius: 999, padding: "4px 10px", fontWeight: 950, background: "#111", color: "#fff" };
    if (level === "warn") return { border: "2px solid #111", borderRadius: 999, padding: "4px 10px", fontWeight: 950, background: "#fff", color: "#111" };
    return { border: "2px solid #111", borderRadius: 999, padding: "4px 10px", fontWeight: 950, background: "#fff", color: "#111", opacity: 0.85 };
  }

  return (
    <main style={shell}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ opacity: 0.7, fontWeight: 900 }}>{team}</div>
          <h1 style={h1}>Dashboard</h1>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/termine" style={pill}>Termine</Link>
          <Link href="/teams" style={pill}>Teams</Link>
          <Link href="/check-in" style={pill}>Check-in</Link>
          <Link href="/bewertung" style={pill}>Bewertung</Link>
          <Link href="/stats" style={pill}>Stats</Link>
          <Link href="/aufstellung" style={pill}>Aufstellung</Link>
          <Link href="/export" style={pill}>Export</Link>
        </div>
      </div>

      <div style={grid}>
        <section style={card}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Trainer-Analyse</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {insights.length ? (
              insights.map((x, idx) => (
                <div key={idx} style={{ border: "2px solid #111", borderRadius: 16, padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={badge(x.level)}>{x.level === "good" ? "TOP" : x.level === "warn" ? "ACHTUNG" : "INFO"}</span>
                    <div style={{ fontWeight: 950 }}>{x.title}</div>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>{x.detail}</div>
                </div>
              ))
            ) : (
              <div style={{ opacity: 0.75 }}>Noch keine Daten für Analyse.</div>
            )}
          </div>
        </section>

        <section style={card}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Nächste Termine</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {upcoming.length ? (
              upcoming.map((t) => (
                <div key={t.id} style={{ border: "2px solid #111", borderRadius: 16, padding: 10 }}>
                  <div style={{ fontWeight: 950 }}>{t.typ}: {t.titel}</div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>
                    {formatDateDE(t.datum)} • {t.uhrzeit} • {t.ort || "—"}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href={`/check-in?termin=${encodeURIComponent(t.id)}`} style={pill}>Check-in</Link>
                    <Link href="/termine" style={pill}>Öffnen</Link>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ opacity: 0.75 }}>Keine kommenden Termine.</div>
            )}
          </div>
        </section>

        <section style={card}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Ranking (Team)</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {ranking.map((x) => (
              <div key={x.p.id} style={{ border: "2px solid #111", borderRadius: 16, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 950 }}>
                    {x.p.number ? `#${x.p.number} ` : ""}{x.p.name}
                    <span style={{ opacity: 0.7 }}> • {x.p.position}</span>
                  </div>
                  <Link href={`/stats/${encodeURIComponent(x.p.id)}`} style={pill}>Profil</Link>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Trainingsbeteiligung</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <BarMini value={Math.round((x.att ?? 0) * 100)} max={100} />
                      <div style={{ fontWeight: 950 }}>{x.att === null ? "—" : `${Math.round((x.att ?? 0) * 100)}%`}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Training-Noten</div>
                      <SparkLine values={x.trainSeries} invert />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Spiel-Noten</div>
                      <SparkLine values={x.spielSeries} invert />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>Cooper: <span style={{ fontWeight: 950 }}>{x.cooper ?? "—"}</span></div>
                    <div style={{ fontWeight: 900 }}>Shuttle: <span style={{ fontWeight: 950 }}>{x.shuttle ?? "—"}</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, opacity: 0.7, fontWeight: 900 }}>
            Tipp: Ranking basiert auf Check-ins + Noten + Tests.
          </div>
        </section>
      </div>
    </main>
  );
}