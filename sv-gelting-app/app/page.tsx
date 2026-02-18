"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  Team,
  Termin,
  Player,
  AttendanceStore,
  RatingsStore,
  Ratings,
  TestsStore,
  TestEntry,
  TestType,
} from "./lib/store";
import {
  loadTermine,
  loadPlayers,
  loadAttendance,
  loadRatings,
  loadTests,
  classifyTest,
  kindStyle,
} from "./lib/store";

function formatDateDE(iso: string) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function avgRating(r: Ratings) {
  return (r.spielintelligenz + r.kondition + r.technisch + r.verstaendnis) / 4;
}

function isUpcoming(t: Termin) {
  const ts = new Date(`${t.datum}T${t.uhrzeit}:00`).getTime();
  return ts >= Date.now();
}
function isPast(t: Termin) {
  const ts = new Date(`${t.datum}T${t.uhrzeit}:00`).getTime();
  return ts < Date.now();
}

type Trend = { delta: number; label: string; kind: "better" | "worse" | "stable" };

function trendForNotes(seriesNewestFirst: number[]) {
  if (seriesNewestFirst.length < 6) return null;
  const last3 = seriesNewestFirst.slice(0, 3);
  const prev = seriesNewestFirst.slice(3);
  const a = last3.reduce((x, y) => x + y, 0) / last3.length;
  const b = prev.reduce((x, y) => x + y, 0) / prev.length;
  const delta = a - b;

  if (delta < -0.05) return { delta, label: "⬇ besser", kind: "better" } as Trend;
  if (delta > 0.05) return { delta, label: "⬆ schlechter", kind: "worse" } as Trend;
  return { delta, label: "→ stabil", kind: "stable" } as Trend;
}

function fmtPct(x: number | null) {
  if (x === null) return "—";
  return `${Math.round(x * 100)}%`;
}

export default function DashboardPage() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [att, setAtt] = useState<AttendanceStore>({});
  const [ratings, setRatings] = useState<RatingsStore>({});
  const [tests, setTests] = useState<TestsStore>({});

  useEffect(() => {
    setTermine(loadTermine());
    setPlayers(loadPlayers());
    setAtt(loadAttendance());
    setRatings(loadRatings());
    setTests(loadTests());
  }, []);

  // Dashboard nur 1. Mannschaft
  const teams: Team[] = ["1. Mannschaft"];

  const byTeam = useMemo(() => {
    const res: Record<
      Team,
      { trainings: Termin[]; spiele: Termin[]; termine: Termin[]; players: Player[] }
    > = {
      "1. Mannschaft": { trainings: [], spiele: [], termine: [], players: [] },
      "2. Mannschaft": { trainings: [], spiele: [], termine: [], players: [] },
    };

    for (const t of termine) {
      res[t.team].termine.push(t);
      if (t.typ === "Training") res[t.team].trainings.push(t);
      else res[t.team].spiele.push(t);
    }
    for (const p of players) res[p.team].players.push(p);

    for (const team of (["1. Mannschaft", "2. Mannschaft"] as Team[])) {
      res[team].termine.sort((a, b) =>
        `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`)
      );
      res[team].trainings.sort((a, b) =>
        `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`)
      );
      res[team].spiele.sort((a, b) =>
        `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`)
      );
      res[team].players.sort(
        (a, b) =>
          (parseInt(a.number || "9999", 10) - parseInt(b.number || "9999", 10)) ||
          a.name.localeCompare(b.name)
      );
    }
    return res;
  }, [termine, players]);

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

  function teamAvgParticipation(team: Team) {
    const plist = byTeam[team].players;
    const vals: number[] = [];
    for (const p of plist) {
      const v = trainingParticipation(team, p.id);
      if (v !== null) vals.push(v);
    }
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function avgByTyp(team: Team, typ: "Training" | "Spiel") {
    const list =
      typ === "Training" ? byTeam[team].trainings.filter(isPast) : byTeam[team].spiele.filter(isPast);

    let sum = 0;
    let n = 0;

    for (const t of list) {
      const per = ratings[t.id];
      if (!per) continue;
      for (const p of byTeam[team].players) {
        const r = per[p.id];
        if (r) {
          sum += avgRating(r);
          n += 1;
        }
      }
    }
    return n ? sum / n : null;
  }

  function seriesPlayerAvgNotes(team: Team, playerId: string, typ: "Training" | "Spiel") {
    const list = (typ === "Training" ? byTeam[team].trainings : byTeam[team].spiele)
      .filter(isPast)
      .slice()
      .sort((a, b) => `${b.datum}T${b.uhrzeit}`.localeCompare(`${a.datum}T${a.uhrzeit}`));

    const vals: number[] = [];
    for (const t of list) {
      const r = ratings[t.id]?.[playerId];
      if (r) vals.push(avgRating(r));
    }
    return vals; // newest first
  }

  function nextTermin(team: Team) {
    const upcoming = byTeam[team].termine
      .filter(isUpcoming)
      .slice()
      .sort((a, b) => `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`));
    return upcoming[0] ?? null;
  }

  function playerTestEntries(playerId: string, test: TestType) {
    return (tests[playerId] ?? [])
      .filter((e) => e.test === test)
      .slice()
      .sort((a, b) => `${b.dateISO}`.localeCompare(`${a.dateISO}`));
  }

  function teamTestSnapshot(team: Team, test: TestType) {
    const plist = byTeam[team].players;
    const lastVals: Array<{ p: Player; last: TestEntry; prev?: TestEntry }> = [];

    for (const p of plist) {
      const e = playerTestEntries(p.id, test);
      if (e.length >= 1) lastVals.push({ p, last: e[0], prev: e[1] });
    }

    lastVals.sort((a, b) => (b.last.value ?? 0) - (a.last.value ?? 0));
    const improved = lastVals.filter((x) => x.prev && x.last.value > x.prev.value).length;
    const worse = lastVals.filter((x) => x.prev && x.last.value < x.prev.value).length;
    const stable = lastVals.filter((x) => x.prev && x.last.value === x.prev.value).length;

    return { lastVals, improved, worse, stable, participants: lastVals.length, total: plist.length };
  }

  const ai = useMemo(() => {
    const out: Array<{
      title: string;
      items: Array<{ headline: string; detail: string; level: "info" | "warn" | "good" }>;
    }> = [];

    for (const team of teams) {
      const plist = byTeam[team].players;
      const trainingsPast = byTeam[team].trainings.filter(isPast);
      const spielePast = byTeam[team].spiele.filter(isPast);

      const teamAvg = teamAvgParticipation(team);

      const under =
        teamAvg === null
          ? []
          : plist
              .map((p) => ({ p, v: trainingParticipation(team, p.id) }))
              .filter((x) => x.v !== null && x.v < teamAvg)
              .sort((a, b) => (a.v ?? 0) - (b.v ?? 0))
              .slice(0, 6);

      const trendPlayers = plist
        .map((p) => {
          const series = seriesPlayerAvgNotes(team, p.id, "Training");
          const tr = trendForNotes(series);
          return tr ? { p, tr } : null;
        })
        .filter(Boolean) as Array<{ p: Player; tr: Trend }>;

      const improving = trendPlayers
        .filter((x) => x.tr.kind === "better")
        .sort((a, b) => a.tr.delta - b.tr.delta)
        .slice(0, 4);

      const worsening = trendPlayers
        .filter((x) => x.tr.kind === "worse")
        .sort((a, b) => b.tr.delta - a.tr.delta)
        .slice(0, 4);

      const cooper = teamTestSnapshot(team, "cooper");
      const shuttle = teamTestSnapshot(team, "shuttle");
      const next = nextTermin(team);

      const items: Array<{ headline: string; detail: string; level: "info" | "warn" | "good" }> = [];

      items.push({
        headline: "Datenstatus",
        detail: `Vergangene Trainings: ${trainingsPast.length}, Spiele: ${spielePast.length}, Spieler: ${plist.length}`,
        level: "info",
      });

      if (next) {
        items.push({
          headline: "Nächster Termin",
          detail: `${next.typ} • ${next.titel} • ${formatDateDE(next.datum)} ${next.uhrzeit}${next.ort ? ` • ${next.ort}` : ""}`,
          level: "info",
        });
      }

      if (teamAvg === null) {
        items.push({
          headline: "Trainingsbeteiligung",
          detail: "Noch keine erfassten Anwesenheiten (Check-in).",
          level: "warn",
        });
      } else {
        items.push({
          headline: "Trainingsbeteiligung",
          detail: `Team-Ø: ${Math.round(teamAvg * 100)}% • Unter Ø: ${under.length}`,
          level: under.length >= Math.max(2, Math.round(plist.length * 0.25)) ? "warn" : "info",
        });

        for (const x of under.slice(0, 3)) {
          items.push({
            headline: "Unter Team-Ø",
            detail: `${x.p.number ? `#${x.p.number} ` : ""}${x.p.name} • ${Math.round((x.v ?? 0) * 100)}%`,
            level: "warn",
          });
        }
      }

      if (improving.length) {
        items.push({
          headline: "Form (Training) – positiv",
          detail: improving.map((x) => `${x.p.number ? `#${x.p.number} ` : ""}${x.p.name} (${x.tr.label})`).join(" • "),
          level: "good",
        });
      }
      if (worsening.length) {
        items.push({
          headline: "Form (Training) – negativ",
          detail: worsening.map((x) => `${x.p.number ? `#${x.p.number} ` : ""}${x.p.name} (${x.tr.label})`).join(" • "),
          level: "warn",
        });
      }

      items.push({
        headline: "Cooper",
        detail: `Teilnehmer: ${cooper.participants}/${cooper.total} • ⬆ ${cooper.improved} ⬇ ${cooper.worse} → ${cooper.stable}`,
        level: cooper.participants === 0 ? "warn" : "info",
      });
      items.push({
        headline: "Shuttle Run",
        detail: `Teilnehmer: ${shuttle.participants}/${shuttle.total} • ⬆ ${shuttle.improved} ⬇ ${shuttle.worse} → ${shuttle.stable}`,
        level: shuttle.participants === 0 ? "warn" : "info",
      });

      out.push({ title: `🤖 Trainer Analyse – ${team}`, items });
    }

    return out;
  }, [teams, byTeam, att, ratings, tests]);

  // ✅ Dashboard Tiles inkl. Aufstellung + Export
  const tiles = [
    { href: "/termine", title: "Termine", hint: "Planen, importieren, löschen" },
    { href: "/check-in", title: "Check in", hint: "Anwesenheit pro Termin" },
    { href: "/bewertung", title: "Bewertung", hint: "Spieler → Termin → Noten" },
    { href: "/teams", title: "Teams", hint: "Spieler verwalten" },
    { href: "/stats", title: "Stats", hint: "Profile, Trends, Tests" },
    { href: "/aufstellung", title: "Aufstellung", hint: "Startelf/Bank pro Spiel" },
    { href: "/export", title: "Export", hint: "Backups + Excel/CSV" },
  ];

  const styles = {
    title: { fontSize: 40, margin: 0, fontWeight: 950 } as React.CSSProperties,
    sub: { marginTop: 8, opacity: 0.85 } as React.CSSProperties,
    shadow: { boxShadow: "0 10px 30px rgba(0,0,0,0.06)" } as React.CSSProperties,

    grid: {
      display: "grid",
      gap: 12,
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      marginTop: 18,
    } as React.CSSProperties,

    tile: {
      border: "2px solid #111",
      borderRadius: 22,
      background: "#fff",
      padding: 16,
      textDecoration: "none",
      color: "#111",
      display: "block",
      minHeight: 112,
      transition: "transform 120ms ease, box-shadow 120ms ease",
    } as React.CSSProperties,

    tileTitle: { fontSize: 18, fontWeight: 950 } as React.CSSProperties,
    tileHint: { marginTop: 6, opacity: 0.85, fontSize: 14 } as React.CSSProperties,
    big: { fontSize: 28, fontWeight: 950, marginTop: 10 } as React.CSSProperties,

    section: {
      border: "2px solid #111",
      borderRadius: 22,
      background: "#fff",
      padding: 16,
      marginTop: 14,
    } as React.CSSProperties,

    pill: {
      display: "inline-block",
      border: "2px solid #111",
      borderRadius: 999,
      padding: "6px 10px",
      fontWeight: 900,
      background: "#fff",
    } as React.CSSProperties,

    row: {
      border: "2px solid #111",
      borderRadius: 18,
      padding: 12,
      background: "#fff",
    } as React.CSSProperties,

    mono: { fontVariantNumeric: "tabular-nums" as const },

    aiItem: (_level: "info" | "warn" | "good") =>
      ({
        border: "2px solid #111",
        borderRadius: 16,
        padding: 12,
        background: "#fff",
      } as React.CSSProperties),

    aiBadge: (_level: "info" | "warn" | "good") =>
      ({
        display: "inline-block",
        border: "2px solid #111",
        borderRadius: 999,
        padding: "4px 10px",
        fontWeight: 950,
        background: "#fff",
        marginLeft: 8,
      } as React.CSSProperties),
  };

  const css = `
    @media (max-width: 420px) {
      .dashGrid { grid-template-columns: 1fr !important; }
    }
    a.tile:hover { box-shadow: 0 14px 36px rgba(0,0,0,0.09); }
    a.tile:active { transform: scale(0.99); }
  `;

  return (
    <main>
      <style>{css}</style>

      <div style={{ paddingTop: 6 }}>
        <h1 style={styles.title}>SV Gelting</h1>
        <div style={styles.sub}>Dashboard • Startscreen • iPhone-optimiert</div>

        <div className="dashGrid" style={styles.grid}>
          {tiles.map((t) => (
            <Link key={t.href} href={t.href} style={{ ...styles.tile, ...styles.shadow }} className="tile">
              <div style={styles.tileTitle}>{t.title}</div>
              <div style={styles.tileHint}>{t.hint}</div>
              <div style={styles.big}>→</div>
            </Link>
          ))}

          <div style={{ ...styles.tile, ...styles.shadow }}>
            <div style={styles.tileTitle}>Nächster Termin</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {teams.map((team) => {
                const n = byTeam[team].termine.filter(isUpcoming).sort((a, b) => `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`))[0] ?? null;
                return (
                  <div key={team} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>{team}</div>
                    <div style={{ opacity: 0.9, ...styles.mono }}>
                      {n ? `${formatDateDE(n.datum)} ${n.uhrzeit}` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
              (Dashboard zeigt nur 1. Mannschaft)
            </div>
          </div>
        </div>

        {teams.map((team) => {
          const teamPlayers = byTeam[team].players.length;
          const next = byTeam[team].termine.filter(isUpcoming).sort((a, b) => `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`))[0] ?? null;

          const avgPart = teamAvgParticipation(team);
          const avgTraining = avgByTyp(team, "Training");
          const avgSpiel = avgByTyp(team, "Spiel");

          const plist = byTeam[team].players;

          const cooperLast = plist
            .map((p) => {
              const e = playerTestEntries(p.id, "cooper");
              if (!e.length) return null;
              return { p, last: e[0].value };
            })
            .filter(Boolean) as Array<{ p: Player; last: number }>;
          cooperLast.sort((a, b) => b.last - a.last);

          const name = (p: Player) => `${p.number ? `#${p.number} ` : ""}${p.name}`;

          return (
            <section key={team} style={{ ...styles.section, ...styles.shadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 950, fontSize: 20 }}>{team}</div>
                <div style={{ opacity: 0.85 }}>
                  Spieler: <b>{teamPlayers}</b>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={{ ...styles.row, ...styles.shadow }}>
                  <div style={{ fontWeight: 950 }}>Nächster Termin</div>
                  <div style={{ marginTop: 6, opacity: 0.9 }}>
                    {next ? (
                      <>
                        <b>{next.typ}</b> • {next.titel} •{" "}
                        <span style={styles.mono}>
                          {formatDateDE(next.datum)} {next.uhrzeit}
                        </span>{" "}
                        • {next.ort || "—"}
                      </>
                    ) : (
                      <span style={{ opacity: 0.85 }}>Kein zukünftiger Termin.</span>
                    )}
                  </div>
                </div>

                <div style={{ ...styles.row, ...styles.shadow }}>
                  <div style={{ fontWeight: 950 }}>Teamwerte</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={styles.pill}>
                      Ø Trainingsbeteiligung: <span style={styles.mono}>{fmtPct(avgPart)}</span>
                    </span>
                    <span style={styles.pill}>
                      Ø Note Training: <span style={styles.mono}>{avgTraining === null ? "—" : avgTraining.toFixed(2)}</span>
                    </span>
                    <span style={styles.pill}>
                      Ø Note Spiel: <span style={styles.mono}>{avgSpiel === null ? "—" : avgSpiel.toFixed(2)}</span>
                    </span>
                  </div>
                </div>

                <div style={{ ...styles.row, ...styles.shadow }}>
                  <div style={{ fontWeight: 950, fontSize: 18 }}>Cooper Best (letzter)</div>
                  {cooperLast.length === 0 ? (
                    <div style={{ marginTop: 8, opacity: 0.85 }}>—</div>
                  ) : (
                    <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                      {cooperLast.slice(0, 5).map((x, idx) => {
                        const c = classifyTest("cooper", x.last);
                        return (
                          <div key={x.p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                            <div style={{ fontWeight: 900 }}>{idx + 1}. {name(x.p)}</div>
                            <span style={{ border: "2px solid", borderRadius: 999, padding: "2px 8px", fontWeight: 950, ...kindStyle(c.kind) }}>
                              {x.last} • {c.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ ...styles.row, ...styles.shadow }}>
                  <div style={{ fontWeight: 950, fontSize: 18 }}>🤖 Trainer Analyse</div>

                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {ai.find((x) => x.title.includes(team))!.items.map((it, idx) => (
                      <div key={idx} style={styles.aiItem(it.level)}>
                        <div style={{ fontWeight: 950 }}>
                          {it.headline}
                          <span style={styles.aiBadge(it.level)}>
                            {it.level === "good" ? "GOOD" : it.level === "warn" ? "WARN" : "INFO"}
                          </span>
                        </div>
                        <div style={{ marginTop: 6, opacity: 0.9 }}>{it.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}