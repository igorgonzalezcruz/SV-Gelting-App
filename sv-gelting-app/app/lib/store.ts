// sv-gelting-app/app/lib/store.ts
// Robust: safe JSON parse, Defaults, Legacy-Key-Fallbacks

export type Note = 1 | 2 | 3 | 4 | 5 | 6;

export type Termin = {
  id: string;
  datum: string;     // "YYYY-MM-DD"
  uhrzeit: string;   // "HH:MM"
  typ: string;       // "Training" | "Spiel" | ...
  titel: string;

  saison: string;    // z.B. "2025/26"
  team: string;      // z.B. "U17", "Herren", ...
};

export type Player = {
  id: string;
  name: string;
  team: string;
  number?: string; // optional
};

export type AttendanceStore = Record<string, Record<string, boolean>>;
// terminId -> playerId -> true/false

export type Ratings = {
  spielintelligenz: Note;
  kondition: Note;
  technisch: Note;
  verstaendnis: Note;
};

export type RatingsStore = Record<string, Record<string, Ratings>>;
// terminId -> playerId -> Ratings

export type MatchStats = {
  minutes: number;
  goals: number;
  assists: number;
};

export type MatchStatsStore = Record<string, Record<string, MatchStats>>;
// terminId -> playerId -> MatchStats

const LS_KEYS = {
  season: "season",
  termine: "termine",
  players: "players",
  attendance: "attendance",
  ratings: "ratings",
  matchStats: "matchStats",
} as const;

const LEGACY_PREFIXES = ["sv_", "SV_", "sv-"] as const;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return (v === null || v === undefined) ? fallback : (v as T);
  } catch {
    return fallback;
  }
}

function readLSRaw(key: string): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(key);
}

function readLS<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  // 1) normal key
  const direct = safeParse<T>(readLSRaw(key), fallback);
  const directHasData =
    (Array.isArray(direct) && direct.length > 0) ||
    (!Array.isArray(direct) && typeof direct === "object" && direct !== null && Object.keys(direct as any).length > 0) ||
    (typeof direct === "string" && (direct as any).length > 0);

  if (directHasData) return direct;

  // 2) legacy keys
  for (const p of LEGACY_PREFIXES) {
    const legacyKey = `${p}${key}`;
    const legacy = safeParse<T>(readLSRaw(legacyKey), fallback);

    const legacyHasData =
      (Array.isArray(legacy) && legacy.length > 0) ||
      (!Array.isArray(legacy) && typeof legacy === "object" && legacy !== null && Object.keys(legacy as any).length > 0) ||
      (typeof legacy === "string" && (legacy as any).length > 0);

    if (legacyHasData) return legacy;
  }

  return fallback;
}

function writeLS<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`localStorage write failed for ${key}`, e);
  }
}

function ensureArray<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function ensureObject<T extends object>(v: any): T {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as T) : ({} as T);
}

// ---------------- Season ----------------
export function loadSeason(): string {
  const s = readLS<string>(LS_KEYS.season, "");
  return typeof s === "string" ? s : "";
}
export function saveSeason(season: string) {
  writeLS(LS_KEYS.season, String(season ?? ""));
}

// ---------------- Termine ----------------
export function loadTermine(): Termin[] {
  const raw = readLS<any>(LS_KEYS.termine, []);
  const arr = ensureArray<any>(raw);

  return arr
    .filter((t) => t && typeof t === "object")
    .map((t) => ({
      id: String(t.id ?? ""),
      datum: String(t.datum ?? t.date ?? ""),
      uhrzeit: String(t.uhrzeit ?? t.time ?? ""),
      typ: String(t.typ ?? t.type ?? "Training"),
      titel: String(t.titel ?? t.title ?? ""),

      saison: String(t.saison ?? t.season ?? ""),
      team: String(t.team ?? ""),
    }))
    .filter((t) => t.id && t.datum && t.uhrzeit);
}

export function saveTermine(termine: Termin[]) {
  writeLS(LS_KEYS.termine, ensureArray<Termin>(termine));
}

// ---------------- Players ----------------
export function loadPlayers(): Player[] {
  const raw = readLS<any>(LS_KEYS.players, []);
  const arr = ensureArray<any>(raw);

  return arr
    .filter((p) => p && typeof p === "object")
    .map((p) => ({
      id: String(p.id ?? ""),
      name: String(p.name ?? ""),
      team: String(p.team ?? ""),
      number: p.number !== undefined && p.number !== null ? String(p.number) : undefined,
    }))
    .filter((p) => p.id && p.name);
}

export function savePlayers(players: Player[]) {
  writeLS(LS_KEYS.players, ensureArray<Player>(players));
}

// ---------------- Attendance ----------------
export function loadAttendance(): AttendanceStore {
  const raw = readLS<any>(LS_KEYS.attendance, {});
  const obj = ensureObject<Record<string, any>>(raw);

  const out: AttendanceStore = {};
  for (const [terminId, playersMap] of Object.entries(obj)) {
    const pm = ensureObject<Record<string, any>>(playersMap);
    out[String(terminId)] = {};
    for (const [playerId, val] of Object.entries(pm)) {
      out[String(terminId)][String(playerId)] = Boolean(val);
    }
  }
  return out;
}

export function saveAttendance(store: AttendanceStore) {
  writeLS(LS_KEYS.attendance, ensureObject<AttendanceStore>(store));
}

// ---------------- Ratings ----------------
export function loadRatings(): RatingsStore {
  const raw = readLS<any>(LS_KEYS.ratings, {});
  const obj = ensureObject<Record<string, any>>(raw);

  const clampNote = (v: any): Note => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 3;
    const r = Math.round(n);
    if (r <= 1) return 1;
    if (r >= 6) return 6;
    return r as Note;
  };

  const out: RatingsStore = {};
  for (const [terminId, playersMap] of Object.entries(obj)) {
    const pm = ensureObject<Record<string, any>>(playersMap);
    out[String(terminId)] = {};
    for (const [playerId, r] of Object.entries(pm)) {
      const rr = ensureObject<any>(r);
      out[String(terminId)][String(playerId)] = {
        spielintelligenz: clampNote(rr.spielintelligenz),
        kondition: clampNote(rr.kondition),
        technisch: clampNote(rr.technisch),
        verstaendnis: clampNote(rr.verstaendnis),
      };
    }
  }
  return out;
}

export function saveRatings(store: RatingsStore) {
  writeLS(LS_KEYS.ratings, ensureObject<RatingsStore>(store));
}

// ---------------- MatchStats ----------------
export function loadMatchStats(): MatchStatsStore {
  const raw = readLS<any>(LS_KEYS.matchStats, {});
  const obj = ensureObject<Record<string, any>>(raw);

  const num = (v: any, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const out: MatchStatsStore = {};
  for (const [terminId, playersMap] of Object.entries(obj)) {
    const pm = ensureObject<Record<string, any>>(playersMap);
    out[String(terminId)] = {};
    for (const [playerId, s] of Object.entries(pm)) {
      const ss = ensureObject<any>(s);
      out[String(terminId)][String(playerId)] = {
        minutes: Math.max(0, Math.min(200, Math.round(num(ss.minutes, 0)))),
        goals: Math.max(0, Math.round(num(ss.goals, 0))),
        assists: Math.max(0, Math.round(num(ss.assists, 0))),
      };
    }
  }
  return out;
}

export function saveMatchStats(store: MatchStatsStore) {
  writeLS(LS_KEYS.matchStats, ensureObject<MatchStatsStore>(store));
}