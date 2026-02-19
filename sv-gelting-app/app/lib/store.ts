// sv-gelting-app/app/lib/store.ts
export type Note = 1 | 2 | 3 | 4 | 5 | 6;

export type Termin = {
  id: string;
  datum: string;     // "YYYY-MM-DD"
  uhrzeit: string;   // "HH:MM"
  typ: string;       // "Training" | "Spiel" | ...
  titel: string;
  saison: string;
  team: string;
};

export type Player = {
  id: string;
  name: string;
  team: string;
  number?: string;
};

export type AttendanceStore = Record<string, Record<string, boolean>>;
export type Ratings = { spielintelligenz: Note; kondition: Note; technisch: Note; verstaendnis: Note; };
export type RatingsStore = Record<string, Record<string, Ratings>>;
export type MatchStats = { minutes: number; goals: number; assists: number; };
export type MatchStatsStore = Record<string, Record<string, MatchStats>>;

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

function safeParse(raw: string | null) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function writeLS(key: string, value: any) {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function readCandidates(keys: string[]) {
  if (!isBrowser()) return [];
  const out: { key: string; value: any }[] = [];
  for (const k of keys) {
    const v = safeParse(window.localStorage.getItem(k));
    if (v !== null && v !== undefined) out.push({ key: k, value: v });
  }
  return out;
}

/** scan *all* localStorage keys and return parsed JSON values */
function scanAllStorage() {
  if (!isBrowser()) return [];
  const out: { key: string; value: any }[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    const v = safeParse(window.localStorage.getItem(k));
    if (v !== null && v !== undefined) out.push({ key: k, value: v });
  }
  return out;
}

function normalizePlayers(v: any): Player[] {
  if (!Array.isArray(v)) return [];
  const arr = v
    .filter((p) => p && typeof p === "object")
    .map((p) => ({
      id: String(p.id ?? p.playerId ?? ""),
      name: String(p.name ?? p.vorname ?? p.nachname ?? ""),
      team: String(p.team ?? p.mannschaft ?? ""),
      number: p.number !== undefined && p.number !== null ? String(p.number) : undefined,
    }))
    .filter((p) => p.id && p.name);
  return arr;
}

function normalizeTermine(v: any): Termin[] {
  if (!Array.isArray(v)) return [];
  const arr = v
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
  return arr;
}

function normalizeAttendance(v: any): AttendanceStore {
  const out: AttendanceStore = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [terminId, map] of Object.entries(v)) {
    if (!map || typeof map !== "object" || Array.isArray(map)) continue;
    out[String(terminId)] = {};
    for (const [playerId, val] of Object.entries(map)) {
      out[String(terminId)][String(playerId)] = Boolean(val);
    }
  }
  return out;
}

function clampNote(v: any): Note {
  const n = Number(v);
  if (!Number.isFinite(n)) return 3;
  const r = Math.round(n);
  if (r <= 1) return 1;
  if (r >= 6) return 6;
  return r as Note;
}

function normalizeRatings(v: any): RatingsStore {
  const out: RatingsStore = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [terminId, map] of Object.entries(v)) {
    if (!map || typeof map !== "object" || Array.isArray(map)) continue;
    out[String(terminId)] = {};
    for (const [playerId, r] of Object.entries(map)) {
      if (!r || typeof r !== "object") continue;
      out[String(terminId)][String(playerId)] = {
        spielintelligenz: clampNote((r as any).spielintelligenz),
        kondition: clampNote((r as any).kondition),
        technisch: clampNote((r as any).technisch),
        verstaendnis: clampNote((r as any).verstaendnis),
      };
    }
  }
  return out;
}

function normalizeMatchStats(v: any): MatchStatsStore {
  const out: MatchStatsStore = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  const num = (x: any, fb = 0) => (Number.isFinite(Number(x)) ? Number(x) : fb);
  for (const [terminId, map] of Object.entries(v)) {
    if (!map || typeof map !== "object" || Array.isArray(map)) continue;
    out[String(terminId)] = {};
    for (const [playerId, s] of Object.entries(map)) {
      if (!s || typeof s !== "object") continue;
      out[String(terminId)][String(playerId)] = {
        minutes: Math.max(0, Math.min(200, Math.round(num((s as any).minutes, 0)))),
        goals: Math.max(0, Math.round(num((s as any).goals, 0))),
        assists: Math.max(0, Math.round(num((s as any).assists, 0))),
      };
    }
  }
  return out;
}

/**
 * PRAGMATISCH:
 * - erst Standard-Keys + Legacy-Prefixe probieren
 * - wenn leer: localStorage scannen und "bestes Match" nehmen
 * - danach in Standard-Key zurückspeichern (self-healing)
 */
function smartLoadArray<T>(key: string, normalize: (v: any) => T[]) {
  if (!isBrowser()) return [];
  const keys = [key, ...LEGACY_PREFIXES.map((p) => `${p}${key}`)];
  const direct = readCandidates(keys);
  for (const c of direct) {
    const arr = normalize(c.value);
    if (arr.length) {
      // heal: store under the canonical key
      writeLS(key, arr);
      return arr;
    }
  }

  // scan everything for likely candidates
  const all = scanAllStorage();
  let best: T[] = [];
  for (const { key: k, value } of all) {
    const arr = normalize(value);
    if (arr.length > best.length) best = arr;
  }
  if (best.length) writeLS(key, best);
  return best;
}

function smartLoadObject<T>(key: string, normalize: (v: any) => T) {
  if (!isBrowser()) return normalize({});
  const keys = [key, ...LEGACY_PREFIXES.map((p) => `${p}${key}`)];
  const direct = readCandidates(keys);
  for (const c of direct) {
    const obj = normalize(c.value);
    const has = obj && typeof obj === "object" && Object.keys(obj as any).length > 0;
    if (has) {
      writeLS(key, obj);
      return obj;
    }
  }

  const all = scanAllStorage();
  let best: any = null;
  let bestSize = 0;
  for (const { value } of all) {
    const obj = normalize(value);
    const size = obj && typeof obj === "object" ? Object.keys(obj as any).length : 0;
    if (size > bestSize) {
      bestSize = size;
      best = obj;
    }
  }
  if (best && bestSize) writeLS(key, best);
  return (best ?? normalize({})) as T;
}

// -------- Season --------
export function loadSeason(): string {
  if (!isBrowser()) return "";
  const keys = [LS_KEYS.season, ...LEGACY_PREFIXES.map((p) => `${p}${LS_KEYS.season}`)];
  for (const k of keys) {
    const v = safeParse(window.localStorage.getItem(k));
    if (typeof v === "string" && v.trim()) {
      writeLS(LS_KEYS.season, v);
      return v;
    }
  }
  return "";
}
export function saveSeason(season: string) {
  writeLS(LS_KEYS.season, String(season ?? ""));
}

// -------- Termine --------
export function loadTermine(): Termin[] {
  return smartLoadArray<Termin>(LS_KEYS.termine, normalizeTermine);
}
export function saveTermine(termine: Termin[]) {
  writeLS(LS_KEYS.termine, Array.isArray(termine) ? termine : []);
}

// -------- Players --------
export function loadPlayers(): Player[] {
  return smartLoadArray<Player>(LS_KEYS.players, normalizePlayers);
}
export function savePlayers(players: Player[]) {
  writeLS(LS_KEYS.players, Array.isArray(players) ? players : []);
}

// -------- Attendance --------
export function loadAttendance(): AttendanceStore {
  return smartLoadObject<AttendanceStore>(LS_KEYS.attendance, normalizeAttendance);
}
export function saveAttendance(store: AttendanceStore) {
  writeLS(LS_KEYS.attendance, store ?? {});
}

// -------- Ratings --------
export function loadRatings(): RatingsStore {
  return smartLoadObject<RatingsStore>(LS_KEYS.ratings, normalizeRatings);
}
export function saveRatings(store: RatingsStore) {
  writeLS(LS_KEYS.ratings, store ?? {});
}

// -------- MatchStats --------
export function loadMatchStats(): MatchStatsStore {
  return smartLoadObject<MatchStatsStore>(LS_KEYS.matchStats, normalizeMatchStats);
}
export function saveMatchStats(store: MatchStatsStore) {
  writeLS(LS_KEYS.matchStats, store ?? {});
}