import type {
  AttendanceStore,
  MatchStatsStore,
  Player,
  RatingsStore,
  Termin,
  TestsStore,
  TestType,
} from "./store";

export type Insight = {
  level: "good" | "warn" | "info";
  title: string;
  detail: string;
};

function tsOfTermin(t: Termin) {
  const d = `${t.datum}T${t.uhrzeit || "00:00"}:00`;
  return new Date(d).getTime();
}
export function isPast(t: Termin) {
  return tsOfTermin(t) < Date.now();
}
export function isUpcoming(t: Termin) {
  return tsOfTermin(t) >= Date.now();
}

export function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function ratingAvg(r: { spielintelligenz: number; kondition: number; technisch: number; verstaendnis: number }) {
  return (r.spielintelligenz + r.kondition + r.technisch + r.verstaendnis) / 4;
}

export function trendLabel(seriesNewestFirst: number[]) {
  if (seriesNewestFirst.length < 6) return null;
  const last3 = seriesNewestFirst.slice(0, 3);
  const prev = seriesNewestFirst.slice(3);
  const a = avg(last3);
  const b = avg(prev);
  const delta = a - b;

  // Note: kleiner = besser (1 sehr gut)
  if (delta < -0.05) return { kind: "better" as const, label: "⬇ besser", delta };
  if (delta > 0.05) return { kind: "worse" as const, label: "⬆ schlechter", delta };
  return { kind: "stable" as const, label: "→ stabil", delta };
}

export function attendanceRateForPlayer(
  playerId: string,
  teamTerminePast: Termin[],
  attendance: AttendanceStore
) {
  if (!teamTerminePast.length) return null;
  let present = 0;
  let counted = 0;
  for (const t of teamTerminePast) {
    const per = attendance[t.id];
    if (!per) continue;
    const v = per[playerId];
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

export function getPlayerRatingSeriesNewestFirst(
  playerId: string,
  terminePastSortedNewestFirst: Termin[],
  ratings: RatingsStore,
  typ: "Training" | "Spiel"
) {
  const out: number[] = [];
  for (const t of terminePastSortedNewestFirst) {
    if (t.typ !== typ) continue;
    const r = ratings[t.id]?.[playerId];
    if (!r) continue;
    out.push(ratingAvg(r));
  }
  return out;
}

export function getCooperSeriesNewestFirst(playerId: string, tests: TestsStore, test: TestType) {
  const a = tests[playerId] || [];
  return a
    .filter((x) => x.test === test)
    .slice()
    .sort((x, y) => String(y.dateISO).localeCompare(String(x.dateISO)))
    .map((x) => x.value);
}

export function getMatchSeriesNewestFirst(
  playerId: string,
  terminePastSortedNewestFirst: Termin[],
  matchStats: MatchStatsStore
) {
  // Nur Spiele zählen, wenn dort Stats eingetragen sind
  const out = [];
  for (const t of terminePastSortedNewestFirst) {
    if (t.typ !== "Spiel") continue;
    const ms = matchStats[t.id]?.[playerId];
    if (!ms) continue;
    out.push({ terminId: t.id, minutes: ms.minutes || 0, goals: ms.goals || 0, assists: ms.assists || 0 });
  }
  return out;
}

export function buildInsights(params: {
  team: "1. Mannschaft" | "2. Mannschaft";
  termine: Termin[];
  players: Player[];
  attendance: AttendanceStore;
  ratings: RatingsStore;
  tests: TestsStore;
  matchStats: MatchStatsStore;
}) {
  const { team, termine, players, attendance, ratings, tests, matchStats } = params;

  const teamPlayers = players.filter((p) => p.team === team);
  const teamTermine = termine.filter((t) => t.team === team);
  const past = teamTermine.filter(isPast).sort((a, b) => tsOfTermin(b) - tsOfTermin(a));
  const upcoming = teamTermine.filter(isUpcoming).sort((a, b) => tsOfTermin(a) - tsOfTermin(b));

  const rates = teamPlayers
    .map((p) => attendanceRateForPlayer(p.id, past, attendance))
    .filter((x): x is number => typeof x === "number");

  const teamAvgAttendance = rates.length ? avg(rates) : null;

  const insights: Insight[] = [];

  if (teamAvgAttendance !== null) {
    const low = teamPlayers
      .map((p) => ({ p, r: attendanceRateForPlayer(p.id, past, attendance) }))
      .filter((x) => x.r !== null)
      .sort((a, b) => (a.r ?? 0) - (b.r ?? 0))
      .slice(0, 3);

    for (const x of low) {
      const diff = (x.r ?? 0) - teamAvgAttendance;
      if (diff < -0.12) {
        insights.push({
          level: "warn",
          title: "Trainingsbeteiligung unter Team-Schnitt",
          detail: `${x.p.name}: ${Math.round((x.r ?? 0) * 100)}% (Team: ${Math.round(teamAvgAttendance * 100)}%)`,
        });
      }
    }

    insights.push({
      level: "info",
      title: "Team-Schnitt Trainingsbeteiligung",
      detail: `${Math.round(teamAvgAttendance * 100)}% (aus erfassten Terminen)`,
    });
  } else {
    insights.push({
      level: "info",
      title: "Noch keine belastbare Trainingsbeteiligung",
      detail: "Erst Check-ins bei mehreren Terminen setzen, dann kommen Trends automatisch.",
    });
  }

  // Rating-Trends (Training/Spiel)
  for (const p of teamPlayers) {
    const tr = getPlayerRatingSeriesNewestFirst(p.id, past, ratings, "Training");
    const sr = getPlayerRatingSeriesNewestFirst(p.id, past, ratings, "Spiel");

    const tTrend = trendLabel(tr);
    const sTrend = trendLabel(sr);

    if (tTrend && tTrend.kind === "worse") {
      insights.push({
        level: "warn",
        title: "Leistungstrend Training schlechter",
        detail: `${p.name}: ${tTrend.label}`,
      });
    }
    if (sTrend && sTrend.kind === "worse") {
      insights.push({
        level: "warn",
        title: "Leistungstrend Spiel schlechter",
        detail: `${p.name}: ${sTrend.label}`,
      });
    }
  }

  // Fitness-Trend (Cooper + Shuttle)
  for (const p of teamPlayers) {
    const cooper = getCooperSeriesNewestFirst(p.id, tests, "cooper");
    if (cooper.length >= 2) {
      const delta = cooper[0] - cooper[1];
      if (delta >= 100) {
        insights.push({
          level: "good",
          title: "Cooper verbessert",
          detail: `${p.name}: +${delta}m (letzte 2 Tests)`,
        });
      } else if (delta <= -100) {
        insights.push({
          level: "warn",
          title: "Cooper verschlechtert",
          detail: `${p.name}: ${delta}m (letzte 2 Tests)`,
        });
      }
    }

    const shuttle = getCooperSeriesNewestFirst(p.id, tests, "shuttle");
    if (shuttle.length >= 2) {
      const delta = shuttle[0] - shuttle[1];
      if (delta >= 80) {
        insights.push({
          level: "good",
          title: "Shuttle verbessert",
          detail: `${p.name}: +${delta} (letzte 2 Tests)`,
        });
      } else if (delta <= -80) {
        insights.push({
          level: "warn",
          title: "Shuttle verschlechtert",
          detail: `${p.name}: ${delta} (letzte 2 Tests)`,
        });
      }
    }
  }

  // Spiel-Impact (Minuten/Tore/Assists)
  for (const p of teamPlayers) {
    const games = getMatchSeriesNewestFirst(p.id, past, matchStats);
    if (games.length >= 3) {
      const last3 = games.slice(0, 3);
      const g = last3.reduce((s, x) => s + x.goals, 0);
      const a = last3.reduce((s, x) => s + x.assists, 0);
      const m = last3.reduce((s, x) => s + x.minutes, 0);
      if (g + a >= 3) {
        insights.push({
          level: "good",
          title: "Offensiv-Impact (letzte 3 Spiele)",
          detail: `${p.name}: ${g} Tore, ${a} Assists, ${m} Minuten`,
        });
      }
    }
  }

  // Nächster Termin Hinweis
  if (upcoming[0]) {
    insights.push({
      level: "info",
      title: "Nächster Termin",
      detail: `${upcoming[0].titel} • ${upcoming[0].datum} ${upcoming[0].uhrzeit}`,
    });
  }

  // Limit damit Dashboard nicht explodiert
  return insights.slice(0, 10);
}