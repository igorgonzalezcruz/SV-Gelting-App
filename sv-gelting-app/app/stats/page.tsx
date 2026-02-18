"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Team, Player, Termin, AttendanceStore, RatingsStore, Ratings, TestsStore, TestType, MatchStatsStore } from "../lib/store";
import { loadTermine, loadPlayers, loadAttendance, loadRatings, loadTests, loadSeason, loadMatchStats } from "../lib/store";

function avg(r: Ratings) {
  return (r.spielintelligenz + r.kondition + r.technisch + r.verstaendnis) / 4;
}
function formatDateDE(iso: string) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
function isPast(t: Termin) {
  return new Date(`${t.datum}T${t.uhrzeit}:00`).getTime() < Date.now();
}
function linePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export default function StatsPage() {
  const [season, setSeason] = useState("");
  const [termine, setTermine] = useState<Termin[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [att, setAtt] = useState<AttendanceStore>({});
  const [ratings, setRatings] = useState<RatingsStore>({});
  const [tests, setTests] = useState<TestsStore>({});
  const [matchStats, setMatchStats] = useState<MatchStatsStore>({});

  useEffect(() => {
    setSeason(loadSeason());
    setTermine(loadTermine());
    setPlayers(loadPlayers());
    setAtt(loadAttendance());
    setRatings(loadRatings());
    setTests(loadTests());
    setMatchStats(loadMatchStats());
  }, []);

  const teams: Team[] = ["1. Mannschaft", "2. Mannschaft"];

  const byTeam = useMemo(() => {
    const res: Record<Team, { trainings: Termin[]; spiele: Termin[]; players: Player[] }> = {
      "1. Mannschaft": { trainings: [], spiele: [], players: [] },
      "2. Mannschaft": { trainings: [], spiele: [], players: [] },
    };

    for (const t of termine) {
      if (t.saison !== season) continue;
      if (t.typ === "Training") res[t.team].trainings.push(t);
      else res[t.team].spiele.push(t);
    }
    for (const p of players) res[p.team].players.push(p);

    for (const team of teams) {
      res[team].trainings.sort((a, b) => `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`));
      res[team].spiele.sort((a, b) => `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`));
      res[team].players.sort(
        (a, b) =>
          (parseInt(a.number || "9999", 10) - parseInt(b.number || "9999", 10)) ||
          a.name.localeCompare(b.name)
      );
    }
    return res;
  }, [termine, players, season]);

  function trainingParticipation(team: Team, playerId: string) {
    const trainings = byTeam[team].trainings.filter(isPast);
    if (!trainings.length) return null;

    let present = 0;
    let counted = 0;

    for (const t of trainings) {
      const v = att[t.id]?.[playerId];
      if (typeof v === "boolean") {
        counted += 1;
        if (v === true) present += 1;
      }
    }
    if (!counted) return null;
    return present / counted;
  }

  function avgRatingFor(team: Team, playerId: string, typ: "Training" | "Spiel") {
    const list = (typ === "Training" ? byTeam[team].trainings : byTeam[team].spiele).filter(isPast);
    let sum = 0;
    let n = 0;
    for (const t of list) {
      const r = ratings[t.id]?.[playerId];
      if (r) {
        sum += avg(r);
        n += 1;
      }
    }
    return n ? sum / n : null;
  }

  function testSummary(team: Team, testType: TestType) {
    const plist = byTeam[team].players;
    let participants = 0;
    let improved = 0;
    let worse = 0;
    let stable = 0;

    for (const p of plist) {
      const entries = (tests[p.id] ?? [])
        .filter((e) => e.test === testType)
        .sort((a, b) => `${b.dateISO}`.localeCompare(`${a.dateISO}`));
      if (entries.length === 0) continue;
      participants += 1;
      if (entries.length >= 2) {
        const delta = entries[0].value - entries[1].value;
        if (delta > 0) improved += 1;
        else if (delta < 0) worse += 1;
        else stable += 1;
      }
    }

    return { participants, improved, worse, stable, total: plist.length };
  }

  // Beteiligung pro Training-Termin (Team)
  function teamParticipationSeries(team: Team) {
    const trainings = byTeam[team].trainings.filter(isPast).slice().sort((a, b) => `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`));
    const plist = byTeam[team].players;
    return trainings.map((t) => {
      const per = att[t.id] ?? {};
      const present = plist.filter((p) => per[p.id] === true).length;
      const total = plist.length || 1;
      return { termin: t, pct: present / total, present, total };
    });
  }

  // Rankings (nur Spiele)
  function teamMatchRanking(team: Team) {
    const spiele = byTeam[team].spiele.filter(isPast);
    const plist = byTeam[team].players;

    const agg: Record<string, { minutes: number; goals: number; assists: number }> = {};
    for (const p of plist) agg[p.id] = { minutes: 0, goals: 0, assists: 0 };

    for (const sp of spiele) {
      const per = matchStats[sp.id] ?? {};
      for (const pid of Object.keys(per)) {
        if (!agg[pid]) continue;
        agg[pid].minutes += per[pid].minutes || 0;
        agg[pid].goals += per[pid].goals || 0;
        agg[pid].assists += per[pid].assists || 0;
      }
    }

    const goals = plist.map((p) => ({ p, v: agg[p.id]?.goals ?? 0 })).sort((a, b) => b.v - a.v);
    const assists = plist.map((p) => ({ p, v: agg[p.id]?.assists ?? 0 })).sort((a, b) => b.v - a.v);
    const minutes = plist.map((p) => ({ p, v: agg[p.id]?.minutes ?? 0 })).sort((a, b) => b.v - a.v);

    return { goals, assists, minutes, games: spiele.length };
  }

  const HEATMAP_COLS = 12;
  function statusSymbol(v: any) {
    if (v === true) return "✓";
    if (v === false) return "✕";
    return "•";
  }

  const card: React.CSSProperties = { border: "2px solid #111", borderRadius: 18, padding: 18, background: "#fff", maxWidth: 980 };
  const row: React.CSSProperties = { border: "2px solid #111", borderRadius: 16, padding: 12, background: "#fff" };
  const pill: React.CSSProperties = { display: "inline-block", border: "2px solid #111", borderRadius: 999, padding: "6px 10px", fontWeight: 900, background: "#fff", marginLeft: 8 };
  const shadow: React.CSSProperties = { boxShadow: "0 10px 30px rgba(0,0,0,0.06)" };

  const css = `
    .heatWrap { overflow-x: auto; }
    table.heat { border-collapse: separate; border-spacing: 6px; min-width: 720px; }
    table.heat th, table.heat td { text-align: center; }
    .cell { border: 2px solid #111; border-radius: 10px; padding: 6px 8px; font-weight: 950; background: #fff; min-width: 34px; }
    .cellName { text-align: left; min-width: 170px; font-weight: 950; }
    .dim { opacity: 0.75; font-weight: 800; }
    @media (max-width: 420px) {
      .rank2 { grid-template-columns: 1fr !important; }
    }
  `;

  return (
    <main style={{ padding: 24 }}>
      <style>{css}</style>

      <h1 style={{ fontSize: 44, margin: 0 }}>Stats</h1>
      <p style={{ marginTop: 10, opacity: 0.9 }}>
        Saison: <b>{season}</b> • Beteiligung-Linie • Heatmap • Rankings Tore/Vorlagen/Minuten
      </p>

      <div style={{ marginTop: 10, ...card, ...shadow }}>
        <div style={{ fontWeight: 950 }}>Hinweis</div>
        <div style={{ marginTop: 8, opacity: 0.85 }}>
          Export/Backup findest du unter <b>/export</b> (Seite “Export”).
        </div>
      </div>

      <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
        {teams.map((team) => {
          const teamPlayers = byTeam[team].players;
          const cooper = testSummary(team, "cooper");
          const shuttle = testSummary(team, "shuttle");
          const series = teamParticipationSeries(team);

          const lastTrainings = byTeam[team].trainings
            .filter(isPast)
            .slice()
            .sort((a, b) => `${b.datum}T${b.uhrzeit}`.localeCompare(`${a.datum}T${a.uhrzeit}`))
            .slice(0, HEATMAP_COLS)
            .reverse();

          const ranking = teamMatchRanking(team);

          // SVG Linie
          const W = 820;
          const H = 160;
          const P = 18;
          const pts = series.map((s, i) => {
            const x = P + (series.length <= 1 ? 0 : (i * (W - 2 * P)) / (series.length - 1));
            const y = P + (1 - s.pct) * (H - 2 * P);
            return { x, y };
          });

          function playerName(p: Player) {
            return `${p.number ? `#${p.number} ` : ""}${p.name}`;
          }

          function TopList({ title, data }: { title: string; data: Array<{ p: Player; v: number }> }) {
            return (
              <div style={{ ...row, ...shadow }}>
                <div style={{ fontWeight: 950 }}>{title}</div>
                {data.length === 0 ? (
                  <div style={{ marginTop: 8, opacity: 0.85 }}>—</div>
                ) : (
                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    {data.slice(0, 5).map((x, idx) => (
                      <div key={x.p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                        <div style={{ fontWeight: 900, opacity: 0.95 }}>{idx + 1}. {playerName(x.p)}</div>
                        <div style={{ fontWeight: 950 }}>{x.v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <section key={team} style={{ ...card, ...shadow }}>
              <div style={{ fontWeight: 950, fontSize: 22 }}>
                {team} <span style={{ opacity: 0.7 }}>({teamPlayers.length})</span>
              </div>

              <div style={{ marginTop: 10, ...row, ...shadow }}>
                <div style={{ fontWeight: 950 }}>Tests – Teilnehmer & Trend</div>
                <div style={{ marginTop: 8 }}>
                  Cooper: <span style={pill}>{cooper.participants}/{cooper.total}</span>
                  <span style={{ marginLeft: 10, opacity: 0.85 }}>⬆ {cooper.improved} ⬇ {cooper.worse} → {cooper.stable}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  Shuttle: <span style={pill}>{shuttle.participants}/{shuttle.total}</span>
                  <span style={{ marginLeft: 10, opacity: 0.85 }}>⬆ {shuttle.improved} ⬇ {shuttle.worse} → {shuttle.stable}</span>
                </div>
              </div>

              {/* Beteiligung-Linie */}
              <div style={{ marginTop: 12, ...row, ...shadow }}>
                <div style={{ fontWeight: 950 }}>Beteiligung pro Training (Vergangenheit)</div>

                {series.length === 0 ? (
                  <div style={{ marginTop: 8, opacity: 0.85 }}>Keine vergangenen Trainings.</div>
                ) : (
                  <>
                    <div style={{ marginTop: 10, opacity: 0.85 }}>
                      Links = älter • rechts = neuer • basierend auf Check-in (✓)
                    </div>

                    <div style={{ marginTop: 10, overflowX: "auto" }}>
                      <svg width={W} height={H} style={{ display: "block" }}>
                        <rect x="1" y="1" width={W - 2} height={H - 2} fill="white" stroke="#111" strokeWidth="2" rx="16" />
                        {[0.25, 0.5, 0.75].map((p) => {
                          const y = P + (1 - p) * (H - 2 * P);
                          return (
                            <g key={p}>
                              <line x1={P} y1={y} x2={W - P} y2={y} stroke="#111" strokeWidth="1" opacity="0.2" />
                              <text x={6} y={y + 4} fontSize="12" fill="#111" opacity="0.6">{Math.round(p * 100)}%</text>
                            </g>
                          );
                        })}
                        <path d={linePath(pts)} fill="none" stroke="#111" strokeWidth="3" />
                        {series.map((s, i) => (
                          <circle key={s.termin.id} cx={pts[i].x} cy={pts[i].y} r="5" fill="#fff" stroke="#111" strokeWidth="2" />
                        ))}
                      </svg>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span style={pill}>
                        Letztes Training: <b>{Math.round(series[series.length - 1].pct * 100)}%</b>{" "}
                        <span style={{ opacity: 0.8 }}>({series[series.length - 1].present}/{series[series.length - 1].total})</span>
                      </span>
                      <span style={pill}>
                        Ø: <b>{Math.round((series.reduce((x, y) => x + y.pct, 0) / series.length) * 100)}%</b>
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Heatmap */}
              <div style={{ marginTop: 12, ...row, ...shadow }}>
                <div style={{ fontWeight: 950 }}>Heatmap Anwesenheit (letzte {HEATMAP_COLS} Trainings)</div>
                <div style={{ marginTop: 8, opacity: 0.85 }}>✓ = da • ✕ = nicht da • • = offen</div>

                {lastTrainings.length === 0 ? (
                  <div style={{ marginTop: 10, opacity: 0.85 }}>Noch keine vergangenen Trainings.</div>
                ) : (
                  <div className="heatWrap" style={{ marginTop: 10 }}>
                    <table className="heat">
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }} className="dim">Spieler</th>
                          {lastTrainings.map((t) => (
                            <th key={t.id} className="dim">{formatDateDE(t.datum).slice(0, 5)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teamPlayers.map((p) => (
                          <tr key={p.id}>
                            <td className="cell cellName">{p.number ? `#${p.number} ` : ""}{p.name}</td>
                            {lastTrainings.map((t) => {
                              const v = att[t.id]?.[p.id];
                              return <td key={t.id} className="cell">{statusSymbol(v)}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Rankings Tore/Vorlagen/Minuten */}
              <div style={{ marginTop: 12, ...row, ...shadow }}>
                <div style={{ fontWeight: 950 }}>Spiel-Rankings (Saison)</div>
                <div style={{ marginTop: 8, opacity: 0.85 }}>Spiele: <b>{ranking.games}</b></div>

                <div className="rank2" style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                  <TopList title="🥇 Tore" data={ranking.goals} />
                  <TopList title="🎯 Vorlagen" data={ranking.assists} />
                </div>
                <div style={{ marginTop: 10 }}>
                  <TopList title="⏱ Minuten" data={ranking.minutes} />
                </div>
              </div>

              <div style={{ marginTop: 12, fontWeight: 950 }}>Spielerprofile</div>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {teamPlayers.map((p) => {
                  const part = trainingParticipation(team, p.id);
                  const tr = avgRatingFor(team, p.id, "Training");
                  const sp = avgRatingFor(team, p.id, "Spiel");

                  return (
                    <Link
                      key={p.id}
                      href={`/stats/${encodeURIComponent(p.id)}`}
                      style={{ ...row, ...shadow, textDecoration: "none", color: "#111" }}
                    >
                      <div style={{ fontWeight: 950 }}>
                        {p.number ? `#${p.number} ` : ""}{p.name}{" "}
                        <span style={{ opacity: 0.7 }}>({p.position})</span>
                      </div>
                      <div style={{ marginTop: 6, opacity: 0.9 }}>
                        Training: Beteiligung <b>{part === null ? "—" : Math.round(part * 100) + "%"}</b> • Ø Note{" "}
                        <b>{tr === null ? "—" : tr.toFixed(2)}</b>
                      </div>
                      <div style={{ marginTop: 2, opacity: 0.9 }}>
                        Spiel: Ø Note <b>{sp === null ? "—" : sp.toFixed(2)}</b>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}