// app/lib/store.ts
import type { CSSProperties } from "react";

/** ✅ Google Sync Konfiguration (ZENTRAL) */
export const GOOGLE_SYNC_URL =
  "https://script.google.com/macros/s/AKfycbyTyzhquiy17zljr23naWvecOy0Pnqo3fbkCSp5Tb2pQDsPWsEIGEO9bxO76xzgtdYLeA/exec";
export const GOOGLE_SYNC_TOKEN = "SV-2026-SECRET310587"; // <-- MUSS gleich wie Apps Script TOKEN sein

// ---------------- Types ----------------
export type Team = "1. Mannschaft" | "2. Mannschaft";
export type TerminTyp = "Training" | "Spiel";
export type Note = 1 | 2 | 3 | 4 | 5 | 6;

export type Termin = {
  id: string;
  team: Team;
  typ: TerminTyp;
  titel: string;
  datum: string; // YYYY-MM-DD
  uhrzeit: string; // HH:mm
  ort?: string;
  saison: string;
  internNotiz?: string;
};

export type Player = {
  id: string;
  team: Team;
  name: string;
  number?: string;
  position: string;
  internalNote?: string;
};

export type AttendanceStore = Record<string, Record<string, boolean>>;
export type Ratings = {
  spielintelligenz: Note;
  kondition: Note;
  technisch: Note;
  verstaendnis: Note;
  note?: string;
};
export type RatingsStore = Record<string, Record<string, Ratings>>;

export type TestType = "cooper" | "shuttle";
export type TestEntry = { test: TestType; dateISO: string; value: number; note?: string };
export type TestsStore = Record<string, TestEntry[]>;

export type MatchStatsEntry = { minutes: number; goals: number; assists: number; note?: string };
export type MatchStatsStore = Record<string, Record<string, MatchStatsEntry>>;

export type LineupEntry = { starterIds: string[]; benchIds: string[]; note?: string };
export type LineupStore = Record<string, LineupEntry>;

export type BackupSnapshot = {
  id: string;
  createdAtISO: string;
  season: string;
  payload: {
    termine: Termin[];
    players: Player[];
    attendance: AttendanceStore;
    ratings: RatingsStore;
    tests: TestsStore;
    matchStats: MatchStatsStore;
    lineup: LineupStore;
  };
};

// ---------------- Keys ----------------
export const KEYS = {
  termine: "svgelting_termine_v1",
  players: "svgelting_players_v1",
  attendance: "svgelting_attendance_v1",
  ratings: "svgelting_ratings_v1",
  tests: "svgelting_tests_v1",
  matchStats: "svgelting_matchstats_v1",
  lineup: "svgelting_lineup_v1",
  season: "svgelting_current_season_v1",
  backups: "svgelting_backups_v1",
  lastAutoBackup: "svgelting_last_autobackup_v1",
  checkinLegacy: "svgelting_checkin_legacy_v1",

  // sync meta
  syncLastPulled: "svgelting_sync_last_pulled_v1",
  syncDirty: "svgelting_sync_dirty_v1",
};

// ---------------- Helpers ----------------
function safeParse<T>(s: string | null, fallback: T): T {
  try {
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeParse<T>(localStorage.getItem(key), fallback);
}

function getDirty(): Record<string, number> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, number>>(localStorage.getItem(KEYS.syncDirty), {});
}
function setDirty(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.syncDirty, JSON.stringify(map));
}
function markDirty(key: string) {
  const d = getDirty();
  d[key] = Date.now();
  setDirty(d);
}
function clearDirty(keys: string[]) {
  const d = getDirty();
  for (const k of keys) delete d[k];
  setDirty(d);
}
function getLastPulled(): string | null {
  if (typeof window === "undefined") return null;
  return safeParse<string | null>(localStorage.getItem(KEYS.syncLastPulled), null);
}
function setLastPulled(iso: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.syncLastPulled, JSON.stringify(iso));
}

// ✅ zentraler Save: markiert dirty + scheduled push
export function saveJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  markDirty(key);
  scheduleSyncPush();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function currentSeasonDefault() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const startYear = m >= 7 ? y : y - 1;
  return `${startYear}/${String(startYear + 1).slice(2)}`;
}

export function loadSeason(): string {
  const s = loadJSON<string | null>(KEYS.season, null);
  if (s) return s;
  const def = currentSeasonDefault();
  saveSeason(def);
  return def;
}
export function saveSeason(season: string) {
  saveJSON(KEYS.season, season);
}

// ---------------- Domain loads/saves ----------------
export const SEED_TERMINE: Termin[] = [];

export function loadTermine(): Termin[] {
  const v = loadJSON<Termin[]>(KEYS.termine, SEED_TERMINE);
  const season = loadSeason();
  return v.map((t) => ({ ...t, saison: (t as any).saison ?? season }));
}
export function saveTermine(v: Termin[]) {
  saveJSON(KEYS.termine, v);
}
export function createTermin(partial: Omit<Termin, "id">) {
  const all = loadTermine();
  const t: Termin = { id: uid("termin"), ...partial };
  all.push(t);
  saveTermine(all);
  return t;
}

export function loadPlayers(): Player[] {
  return loadJSON<Player[]>(KEYS.players, []);
}
export function savePlayers(v: Player[]) {
  saveJSON(KEYS.players, v);
}

export function loadAttendance(): AttendanceStore {
  return loadJSON<AttendanceStore>(KEYS.attendance, {});
}
export function saveAttendance(v: AttendanceStore) {
  saveJSON(KEYS.attendance, v);
}

export function loadRatings(): RatingsStore {
  return loadJSON<RatingsStore>(KEYS.ratings, {});
}
export function saveRatings(v: RatingsStore) {
  saveJSON(KEYS.ratings, v);
}

export function loadTests(): TestsStore {
  return loadJSON<TestsStore>(KEYS.tests, {});
}
export function saveTests(v: TestsStore) {
  saveJSON(KEYS.tests, v);
}

export function loadMatchStats(): MatchStatsStore {
  return loadJSON<MatchStatsStore>(KEYS.matchStats, {});
}
export function saveMatchStats(v: MatchStatsStore) {
  saveJSON(KEYS.matchStats, v);
}

export function loadLineup(): LineupStore {
  return loadJSON<LineupStore>(KEYS.lineup, {});
}
export function saveLineup(v: LineupStore) {
  saveJSON(KEYS.lineup, v);
}

// ---------------- Test Matrix ----------------
export type TestKind = "sehrgut" | "standard" | "mittel" | "schlecht";
export const COOPER_RULES = { sehrgut_min: 3001, standard_min: 2801, mittel_min: 2601 } as const;
export const SHUTTLE_RULES = { sehrgut_min: 2580, standard_min: 1700, mittel_min: 1060 } as const;

export function classifyTest(test: TestType, value: number): { kind: TestKind; label: string } {
  if (test === "cooper") {
    if (value >= COOPER_RULES.sehrgut_min) return { kind: "sehrgut", label: "Sehr gut" };
    if (value >= COOPER_RULES.standard_min) return { kind: "standard", label: "Standard" };
    if (value >= COOPER_RULES.mittel_min) return { kind: "mittel", label: "Mittel" };
    return { kind: "schlecht", label: "Schlecht" };
  }
  if (value >= SHUTTLE_RULES.sehrgut_min) return { kind: "sehrgut", label: "Sehr gut" };
  if (value >= SHUTTLE_RULES.standard_min) return { kind: "standard", label: "Standard" };
  if (value >= SHUTTLE_RULES.mittel_min) return { kind: "mittel", label: "Mittel" };
  return { kind: "schlecht", label: "Schlecht" };
}
export function kindStyle(kind: TestKind): CSSProperties {
  if (kind === "sehrgut") return { color: "#0a0", borderColor: "#0a0" };
  return { color: "#111", borderColor: "#111" };
}

// ---------------- Cascade delete + cleanup ----------------
export function deleteTerminCascade(terminId: string) {
  saveTermine(loadTermine().filter((t) => t.id !== terminId));

  const att = loadAttendance();
  if (att[terminId]) { delete att[terminId]; saveAttendance(att); }

  const rat = loadRatings();
  if (rat[terminId]) { delete rat[terminId]; saveRatings(rat); }

  const ms = loadMatchStats();
  if (ms[terminId]) { delete ms[terminId]; saveMatchStats(ms); }

  const lu = loadLineup();
  if (lu[terminId]) { delete lu[terminId]; saveLineup(lu); }

  const legacy = loadJSON<Record<string, any>>(KEYS.checkinLegacy, {});
  if (legacy[terminId]) { delete legacy[terminId]; saveJSON(KEYS.checkinLegacy, legacy); }
}

export function cleanupOrphans(options?: { cleanMissingPlayers?: boolean }) {
  const cleanMissingPlayers = options?.cleanMissingPlayers ?? true;

  const termine = loadTermine();
  const validTerminIds = new Set(termine.map((t) => t.id));
  const players = loadPlayers();
  const validPlayerIds = new Set(players.map((p) => p.id));

  const terminStores = [KEYS.attendance, KEYS.ratings, KEYS.checkinLegacy, KEYS.matchStats, KEYS.lineup];

  for (const key of terminStores) {
    const obj = loadJSON<Record<string, any>>(key, {});
    let changed = false;

    for (const terminId of Object.keys(obj)) {
      if (!validTerminIds.has(terminId)) { delete obj[terminId]; changed = true; continue; }
      if (key === KEYS.lineup) continue;

      if (cleanMissingPlayers && obj[terminId] && typeof obj[terminId] === "object") {
        for (const playerId of Object.keys(obj[terminId])) {
          if (!validPlayerIds.has(playerId)) { delete obj[terminId][playerId]; changed = true; }
        }
      }
    }
    if (changed) saveJSON(key, obj);
  }

  if (cleanMissingPlayers) {
    const t = loadTests();
    let changed = false;
    for (const playerId of Object.keys(t)) {
      if (!validPlayerIds.has(playerId)) { delete t[playerId]; changed = true; }
    }
    if (changed) saveTests(t);
  }
}

// ---------------- Backups ----------------
export function makeSnapshot(season: string): BackupSnapshot {
  return {
    id: uid("backup"),
    createdAtISO: new Date().toISOString(),
    season,
    payload: {
      termine: loadTermine(),
      players: loadPlayers(),
      attendance: loadAttendance(),
      ratings: loadRatings(),
      tests: loadTests(),
      matchStats: loadMatchStats(),
      lineup: loadLineup(),
    },
  };
}
export function loadBackups(): BackupSnapshot[] {
  return loadJSON<BackupSnapshot[]>(KEYS.backups, []);
}
export function saveBackups(v: BackupSnapshot[]) {
  saveJSON(KEYS.backups, v);
}
export function autoBackupDaily() {
  const last = loadJSON<string | null>(KEYS.lastAutoBackup, null);
  const now = Date.now();
  const lastTs = last ? new Date(last).getTime() : 0;
  const dayMs = 24 * 60 * 60 * 1000;

  if (!lastTs || now - lastTs >= dayMs) {
    const season = loadSeason();
    const snap = makeSnapshot(season);
    const all = loadBackups();
    all.unshift(snap);
    saveBackups(all.slice(0, 14));
    saveJSON(KEYS.lastAutoBackup, new Date().toISOString());
  }
}
export function restoreSnapshot(snap: BackupSnapshot) {
  saveTermine(snap.payload.termine);
  savePlayers(snap.payload.players);
  saveAttendance(snap.payload.attendance);
  saveRatings(snap.payload.ratings);
  saveTests(snap.payload.tests);
  saveMatchStats(snap.payload.matchStats);
  saveLineup(snap.payload.lineup);
}

// ======================================================
// ✅ PRO SYNC (Konfliktsicher): GET + SET(base) + MERGE
// ======================================================
type RemoteState = {
  ok: boolean;
  updatedAtISO?: string;
  data?: Record<string, any>;
  conflict?: boolean;
  error?: string;
};

const SYNC_KEYS = [
  KEYS.termine,
  KEYS.players,
  KEYS.attendance,
  KEYS.ratings,
  KEYS.tests,
  KEYS.matchStats,
  KEYS.lineup,
  KEYS.season,
  KEYS.backups,
  KEYS.lastAutoBackup,
];

function collectLocalState(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of SYNC_KEYS) out[k] = safeParse(localStorage.getItem(k), null);
  return out;
}
function applyRemoteState(remote: Record<string, any>) {
  for (const k of SYNC_KEYS) {
    if (k in remote) localStorage.setItem(k, JSON.stringify(remote[k]));
  }
}

async function safeJson(r: Response) {
  const txt = await r.text();
  try {
    return JSON.parse(txt);
  } catch {
    // falls Google mal HTML liefert
    return { ok: false, error: "non_json", raw: txt.slice(0, 160) };
  }
}

async function remoteGet(): Promise<RemoteState> {
  // cache busting
  const url =
    `${GOOGLE_SYNC_URL}?op=get&token=${encodeURIComponent(GOOGLE_SYNC_TOKEN)}&t=${Date.now()}`;

  const r = await fetch(url, {
    method: "GET",
    cache: "no-store",
    redirect: "follow",
  });

  const j = (await safeJson(r)) as RemoteState;
  if (!j.ok && !j.error) (j as any).error = `http_${r.status}`;
  return j;
}

async function remoteSet(data: Record<string, any>, baseUpdatedAtISO: string | null): Promise<RemoteState> {
  const url =
    `${GOOGLE_SYNC_URL}?token=${encodeURIComponent(GOOGLE_SYNC_TOKEN)}&t=${Date.now()}`;

  const payload = {
    op: "set",
    baseUpdatedAtISO: baseUpdatedAtISO || "",
    data,
  };

  const r = await fetch(url, {
    method: "POST",
    cache: "no-store",
    redirect: "follow",
    headers: { "content-type": "text/plain;charset=utf-8" }, // wichtig für Apps Script
    body: JSON.stringify(payload),
  });

  const j = (await safeJson(r)) as RemoteState;
  if (!j.ok && !j.error) (j as any).error = `http_${r.status}`;
  return j;
}

// ---- Merge helpers ----
function mergeByIdArray<T extends { id: string }>(remoteArr: T[] | null, localArr: T[] | null): T[] {
  const r = Array.isArray(remoteArr) ? remoteArr : [];
  const l = Array.isArray(localArr) ? localArr : [];
  const map = new Map<string, T>();
  for (const x of r) map.set(x.id, x);
  for (const x of l) map.set(x.id, x); // local gewinnt bei gleicher id
  return Array.from(map.values());
}
function mergeRecord(remoteObj: any, localObj: any) {
  const r = (remoteObj && typeof remoteObj === "object") ? remoteObj : {};
  const l = (localObj && typeof localObj === "object") ? localObj : {};
  return { ...r, ...l };
}
function mergeTwoLevel(remoteObj: any, localObj: any) {
  const out: any = {};
  const r = (remoteObj && typeof remoteObj === "object") ? remoteObj : {};
  const l = (localObj && typeof localObj === "object") ? localObj : {};
  const keys = new Set([...Object.keys(r), ...Object.keys(l)]);
  for (const k of keys) out[k] = mergeRecord(r[k], l[k]);
  return out;
}
function mergeTests(remoteObj: any, localObj: any) {
  const r = (remoteObj && typeof remoteObj === "object") ? remoteObj : {};
  const l = (localObj && typeof localObj === "object") ? localObj : {};
  const out: any = {};
  const pids = new Set([...Object.keys(r), ...Object.keys(l)]);

  for (const pid of pids) {
    const ra = Array.isArray(r[pid]) ? r[pid] : [];
    const la = Array.isArray(l[pid]) ? l[pid] : [];
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const e of [...ra, ...la]) {
      const key = `${e.test}|${e.dateISO}|${e.value}|${e.note || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(e);
    }
    merged.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
    out[pid] = merged;
  }
  return out;
}

function mergeState(remote: Record<string, any>, local: Record<string, any>, dirtyKeys: string[]): Record<string, any> {
  const out = { ...remote };
  for (const k of dirtyKeys) {
    const rv = remote[k];
    const lv = local[k];

    if (k === KEYS.termine || k === KEYS.players) {
      out[k] = mergeByIdArray(rv, lv);
      continue;
    }
    if (k === KEYS.attendance || k === KEYS.ratings || k === KEYS.matchStats) {
      out[k] = mergeTwoLevel(rv, lv);
      continue;
    }
    if (k === KEYS.tests) {
      out[k] = mergeTests(rv, lv);
      continue;
    }
    out[k] = (lv !== undefined && lv !== null) ? lv : rv;
  }
  return out;
}

let pushTimer: any = null;
let pulling = false;
let pushing = false;

/** Pull: remote -> local. Bei leerem remote: initial push. */
export async function syncPullOnce() {
  if (typeof window === "undefined") return;
  if (pulling) return;
  pulling = true;

  try {
    const res = await remoteGet();
    if (!res.ok) return;

    const remoteUpdated = res.updatedAtISO || null;
    const remoteData = res.data || {};
    const isEmpty = !remoteData || Object.keys(remoteData).length === 0;

    if (isEmpty) {
      // remote leer -> initial push lokaler Stand
      await syncPushNow(true);
      return;
    }

    applyRemoteState(remoteData);
    if (remoteUpdated) setLastPulled(remoteUpdated);
  } finally {
    pulling = false;
  }
}

/** Debounced push */
function scheduleSyncPush() {
  if (typeof window === "undefined") return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { syncPushNow(false).catch(() => null); }, 900);
}

/** Push: local(dirty) -> remote, konflikt-sicher + merge + retry */
export async function syncPushNow(forceAll: boolean) {
  if (typeof window === "undefined") return;
  if (pushing) return;
  pushing = true;

  try {
    const dirtyMap = getDirty();
    const dirtyKeys = forceAll ? SYNC_KEYS.slice() : Object.keys(dirtyMap);
    if (!dirtyKeys.length) return;

    const base = getLastPulled();
    const localState = collectLocalState();

    const r1 = await remoteSet(localState, base);

    if (r1.ok && r1.updatedAtISO) {
      setLastPulled(r1.updatedAtISO);
      clearDirty(dirtyKeys);
      return;
    }

    if (r1.conflict) {
      const remote = await remoteGet();
      if (!remote.ok) return;

      const merged = mergeState(remote.data || {}, localState, dirtyKeys);
      applyRemoteState(merged);

      const r2 = await remoteSet(merged, remote.updatedAtISO || null);
      if (r2.ok && r2.updatedAtISO) {
        setLastPulled(r2.updatedAtISO);
        clearDirty(dirtyKeys);
      }
    }
  } finally {
    pushing = false;
  }
}