"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type Team = "1. Mannschaft" | "2. Mannschaft";
type Position =
  | "Tor"
  | "Abwehr"
  | "Mittelfeld"
  | "Sturm"
  | "Trainer"
  | "Sonstiges";

type Player = {
  id: string; // Team-Instanz-ID (wichtig: separat zählen)
  team: Team;
  name: string;
  number: string;
  position: Position;
  noteInternal: string; // nur intern
  createdAt: number;
};

const STORAGE_PLAYERS = "sv_gelting_players_profiles_v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function pick(obj: any, keys: string[]) {
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  for (const [k, v] of Object.entries(obj)) {
    const nk = norm(k);
    if (keys.some((x) => nk === norm(x))) return v;
  }
  return "";
}

function toTeam(x: any): Team {
  const s = String(x ?? "").toLowerCase();
  return s.includes("2") ? "2. Mannschaft" : "1. Mannschaft";
}

function toPosition(x: any): Position {
  const s = String(x ?? "").trim().toLowerCase();
  if (s.includes("tor")) return "Tor";
  if (s.includes("abwehr") || s.includes("def")) return "Abwehr";
  if (s.includes("mittel")) return "Mittelfeld";
  if (s.includes("sturm") || s.includes("ang")) return "Sturm";
  if (s.includes("trainer")) return "Trainer";
  return "Sonstiges";
}

function sortPlayers(a: Player, b: Player) {
  const na = parseInt(a.number || "9999", 10);
  const nb = parseInt(b.number || "9999", 10);
  if (na !== nb) return na - nb;
  return a.name.localeCompare(b.name);
}

export default function TeamsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [importMsg, setImportMsg] = useState("");

  // Formular
  const [team, setTeam] = useState<Team>("1. Mannschaft");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [position, setPosition] = useState<Position>("Mittelfeld");
  const [noteInternal, setNoteInternal] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PLAYERS);
      if (raw) setPlayers(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PLAYERS, JSON.stringify(players));
    } catch {}
  }, [players]);

  const team1 = useMemo(
    () => players.filter((p) => p.team === "1. Mannschaft").sort(sortPlayers),
    [players]
  );
  const team2 = useMemo(
    () => players.filter((p) => p.team === "2. Mannschaft").sort(sortPlayers),
    [players]
  );

  function addPlayer() {
    const n = name.trim();
    if (!n) {
      alert("Bitte Name eingeben.");
      return;
    }
    const p: Player = {
      id: uid(),
      team,
      name: n,
      number: number.trim(),
      position,
      noteInternal: noteInternal.trim(),
      createdAt: Date.now(),
    };
    setPlayers((prev) => [p, ...prev]);
    setName("");
    setNumber("");
    setPosition("Mittelfeld");
    setNoteInternal("");
  }

  function removePlayer(id: string) {
    if (!confirm("Spieler wirklich löschen?")) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  function movePlayer(id: string, toTeam: Team) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, team: toTeam } : p)));
  }

  function duplicateToOtherTeam(p: Player) {
    const other: Team = p.team === "1. Mannschaft" ? "2. Mannschaft" : "1. Mannschaft";
    const copy: Player = { ...p, id: uid(), team: other, createdAt: Date.now() };
    setPlayers((prev) => [copy, ...prev]);
  }

  function updatePlayer(id: string, patch: Partial<Player>) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function importPlayers(file: File) {
    setImportMsg("Import läuft…");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];

      const imported: Player[] = [];

      for (const r of rows) {
        const teamRaw = pick(r, ["team", "mannschaft", "teamname", "team name"]);
        const nameRaw = pick(r, ["name", "spieler", "player"]);
        const numberRaw = pick(r, ["nummer", "nr", "number"]);
        const posRaw = pick(r, ["position", "pos"]);
        const noteRaw = pick(r, ["interne notiz", "notiz", "noteinternal", "intern"]);

        const nameVal = String(nameRaw ?? "").trim();
        if (!nameVal) continue;

        imported.push({
          id: uid(), // neue ID => separat zählen
          team: toTeam(teamRaw),
          name: nameVal,
          number: String(numberRaw ?? "").trim(),
          position: toPosition(posRaw),
          noteInternal: String(noteRaw ?? "").trim(),
          createdAt: Date.now(),
        });
      }

      if (!imported.length) {
        setImportMsg("Kein gültiger Spieler gefunden. Bitte Header prüfen.");
        return;
      }

      setPlayers((prev) => [...imported, ...prev]);
      setImportMsg(`✅ Importiert: ${imported.length} Spieler`);
    } catch (e: any) {
      setImportMsg(`❌ Import Fehler: ${String(e?.message ?? e)}`);
    }
  }

  function exportJsonBackup() {
    const blob = new Blob([JSON.stringify(players, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spieler-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const card: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 18,
    padding: 18,
    background: "#fff",
    maxWidth: 900,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "2px solid #111",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 16,
    background: "#fff",
    color: "#111",
  };

  const btn: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 900,
    background: "#fff",
    color: "#111",
  };

  const primaryBtn: React.CSSProperties = {
    ...btn,
    background: "#111",
    color: "#fff",
  };

  const smallBtn: React.CSSProperties = {
    ...btn,
    padding: "8px 12px",
    fontWeight: 800,
  };

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 44, margin: 0 }}>Teams</h1>
      <p style={{ marginTop: 10, opacity: 0.9 }}>
        Spieler mit Profil. <b>Duplizieren</b> erzeugt eine zweite Instanz (separate Statistik).
      </p>

      {/* Import */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontWeight: 950, fontSize: 20 }}>Spieler Excel Import</div>
        <div style={{ marginTop: 6, opacity: 0.85 }}>
          Spalten (Header): <b>team</b>, <b>name</b>, <b>nummer</b>, <b>position</b>, <b>interne notiz</b>
        </div>

        <input
          type="file"
          accept=".xlsx,.xls"
          style={{ marginTop: 10 }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importPlayers(f);
            e.currentTarget.value = "";
          }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button style={smallBtn} onClick={exportJsonBackup}>
            Backup (JSON) herunterladen
          </button>
        </div>

        {importMsg && <div style={{ marginTop: 10, fontWeight: 900 }}>{importMsg}</div>}
      </div>

      {/* Manuell */}
      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950, fontSize: 20 }}>Spieler hinzufügen</div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={team} onChange={(e) => setTeam(e.target.value as Team)} style={inputStyle}>
              <option>1. Mannschaft</option>
              <option>2. Mannschaft</option>
            </select>

            <select value={position} onChange={(e) => setPosition(e.target.value as Position)} style={inputStyle}>
              <option>Tor</option>
              <option>Abwehr</option>
              <option>Mittelfeld</option>
              <option>Sturm</option>
              <option>Trainer</option>
              <option>Sonstiges</option>
            </select>
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            style={inputStyle}
          />

          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Nummer (optional)"
            style={inputStyle}
            inputMode="numeric"
          />

          <textarea
            value={noteInternal}
            onChange={(e) => setNoteInternal(e.target.value)}
            placeholder="Interne Notiz (nur du)"
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
          />

          <button style={primaryBtn} onClick={addPlayer}>
            + Speichern
          </button>
        </div>
      </div>

      {/* Listen */}
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <TeamBlock
          title="1. Mannschaft"
          players={team1}
          onDelete={removePlayer}
          onMove={movePlayer}
          onDuplicate={duplicateToOtherTeam}
          onUpdate={updatePlayer}
          btn={btn}
          inputStyle={inputStyle}
        />

        <TeamBlock
          title="2. Mannschaft"
          players={team2}
          onDelete={removePlayer}
          onMove={movePlayer}
          onDuplicate={duplicateToOtherTeam}
          onUpdate={updatePlayer}
          btn={btn}
          inputStyle={inputStyle}
        />
      </div>
    </main>
  );
}

function TeamBlock({
  title,
  players,
  onDelete,
  onMove,
  onDuplicate,
  onUpdate,
  btn,
  inputStyle,
}: {
  title: Team;
  players: Player[];
  onDelete: (id: string) => void;
  onMove: (id: string, toTeam: Team) => void;
  onDuplicate: (p: Player) => void;
  onUpdate: (id: string, patch: Partial<Player>) => void;
  btn: React.CSSProperties;
  inputStyle: React.CSSProperties;
}) {
  const other: Team = title === "1. Mannschaft" ? "2. Mannschaft" : "1. Mannschaft";

  const card: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 18,
    padding: 18,
    background: "#fff",
  };

  const playerCard: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 18,
    padding: 14,
    background: "#fff",
  };

  const dangerBtn: React.CSSProperties = {
    ...btn,
    whiteSpace: "nowrap",
  };

  return (
    <section style={card}>
      <div style={{ fontWeight: 950, fontSize: 22 }}>
        {title} <span style={{ opacity: 0.7 }}>({players.length})</span>
      </div>

      {players.length === 0 ? (
        <div style={{ marginTop: 10, opacity: 0.8 }}>Noch keine Spieler.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {players.map((p) => (
            <div key={p.id} style={playerCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 18 }}>
                    {p.number ? `#${p.number} ` : ""}
                    {p.name}
                  </div>
                  <div style={{ marginTop: 4, opacity: 0.85 }}>
                    Position: <b>{p.position}</b>
                  </div>
                </div>

                <button onClick={() => onDelete(p.id)} style={dangerBtn}>
                  Löschen
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 13, opacity: 0.85 }}>
                  Interne Notiz
                </div>
                <textarea
                  value={p.noteInternal}
                  onChange={(e) => onUpdate(p.id, { noteInternal: e.target.value })}
                  style={{ ...inputStyle, minHeight: 70, resize: "vertical", marginTop: 6 }}
                  placeholder="Nur intern…"
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button onClick={() => onMove(p.id, other)} style={btn}>
                  → Verschieben zu {other}
                </button>
                <button onClick={() => onDuplicate(p)} style={btn}>
                  + Duplizieren nach {other}
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                Hinweis: Duplizieren erzeugt eine <b>zweite Instanz</b> (eigene ID) → separate Statistik.
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}