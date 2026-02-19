// sv-gelting-app/app/lib/store.ts
// Robuster LocalStorage-Store: nie null zurückgeben, JSON sicher parsen,
// immer Default-Strukturen liefern, damit kein ".map" auf null passiert.

export type Termin = {
  id: string;
  date?: string;          // "YYYY-MM-DD" optional
  title?: string;
  description?: string;
};

export type Player = {
  id: string;
  name: string;
};

export type AttendanceStore = Record<string, Record<string, boolean>>;
// terminId -> playerId -> true/false

export type RatingStore = Record<string, Record<string, number>>;
// terminId -> playerId -> 1..5 (oder 0..10 je nach UI)

const LS_KEYS = {
  termine: "termine",
  players: "players",
  attendance: "attendance",
  ratings: "ratings",
} as const;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const val = JSON.parse(raw);
    // wenn JSON zwar parsebar aber null/undefined ist → fallback
    if (val === null || val === undefined) return fallback;
    return val as T;
  } catch {
    return fallback;
  }
}

function readLS<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  return safeParse<T>(window.localStorage.getItem(key), fallback);
}

function writeLS<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Safari/iPad kann hier zicken (Quota/Private Mode).
    // Wir lassen es nicht crashen.
    console.warn(`localStorage write failed for ${key}`, e);
  }
}

function ensureArray<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function ensureObject<T extends object>(v: any): T {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as T) : ({} as T);
}

// ----- Termine -----
export function loadTermine(): Termin[] {
  const raw = readLS<any>(LS_KEYS.termine, []);
  const arr = ensureArray<Termin>(raw);
  return arr
    .filter((t) => t && typeof t === "object")
    .map((t: any) => ({
      id: String(t.id ?? ""),
      date: t.date ? String(t.date) : undefined,
      title: t.title ? String(t.title) : undefined,
      description: t.description ? String(t.description) : undefined,
    }))
    .filter((t) => t.id.length > 0);
}

export function saveTermine(termine: Termin[]) {
  writeLS(LS_KEYS.termine, ensureArray<Termin>(termine));
}

// ----- Players -----
export function loadPlayers(): Player[] {
  const raw = readLS<any>(LS_KEYS.players, []);
  const arr = ensureArray<Player>(raw);
  return arr
    .filter((p) => p && typeof p === "object")
    .map((p: any) => ({
      id: String(p.id ?? ""),
      name: String(p.name ?? ""),
    }))
    .filter((p) => p.id.length > 0 && p.name.length > 0);
}

export function savePlayers(players: Player[]) {
  writeLS(LS_KEYS.players, ensureArray<Player>(players));
}

// ----- Attendance -----
export function loadAttendance(): AttendanceStore {
  const raw = readLS<any>(LS_KEYS.attendance, {});
  const obj = ensureObject<AttendanceStore>(raw);

  // Normalisieren: strings + bool
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

// ----- Ratings -----
export function loadRatings(): RatingStore {
  const raw = readLS<any>(LS_KEYS.ratings, {});
  const obj = ensureObject<RatingStore>(raw);

  const out: RatingStore = {};
  for (const [terminId, playersMap] of Object.entries(obj)) {
    const pm = ensureObject<Record<string, any>>(playersMap);
    out[String(terminId)] = {};
    for (const [playerId, val] of Object.entries(pm)) {
      const n = Number(val);
      out[String(terminId)][String(playerId)] = Number.isFinite(n) ? n : 0;
    }
  }
  return out;
}

export function saveRatings(store: RatingStore) {
  writeLS(LS_KEYS.ratings, ensureObject<RatingStore>(store));
}