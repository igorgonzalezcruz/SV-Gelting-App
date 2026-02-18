"use client";

import { useEffect, useMemo, useState } from "react";
import type { Team, TerminTyp, Termin } from "../lib/store";
import { createTermin, deleteTerminCascade, loadSeason, loadTermine, saveSeason, saveTermine } from "../lib/store";

function formatDateDE(iso: string) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
function isPast(t: Termin) {
  return new Date(`${t.datum}T${t.uhrzeit}:00`).getTime() < Date.now();
}

export default function TerminePage() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [season, setSeason] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<Team | "Alle">("Alle");
  const [typeFilter, setTypeFilter] = useState<TerminTyp | "Alle">("Alle");
  const [timeFilter, setTimeFilter] = useState<"Alle" | "Vergangenheit" | "Zukunft">("Alle");

  const [newTeam, setNewTeam] = useState<Team>("1. Mannschaft");
  const [newTyp, setNewTyp] = useState<TerminTyp>("Training");
  const [newTitel, setNewTitel] = useState<string>("Training");
  const [newDatum, setNewDatum] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newZeit, setNewZeit] = useState<string>("19:00");
  const [newOrt, setNewOrt] = useState<string>("");

  // Undo
  const [undo, setUndo] = useState<{ termin: Termin; expiresAt: number } | null>(null);

  useEffect(() => {
    const s = loadSeason();
    setSeason(s);
    setTermine(loadTermine());
  }, []);

  useEffect(() => {
    if (!undo) return;
    const id = window.setInterval(() => {
      if (Date.now() >= undo.expiresAt) setUndo(null);
    }, 250);
    return () => window.clearInterval(id);
  }, [undo]);

  const filtered = useMemo(() => {
    return termine
      .filter((t) => t.saison === season)
      .filter((t) => (teamFilter === "Alle" ? true : t.team === teamFilter))
      .filter((t) => (typeFilter === "Alle" ? true : t.typ === typeFilter))
      .filter((t) => {
        if (timeFilter === "Alle") return true;
        const past = isPast(t);
        return timeFilter === "Vergangenheit" ? past : !past;
      })
      .slice()
      .sort((a, b) => `${a.datum}T${a.uhrzeit}`.localeCompare(`${b.datum}T${b.uhrzeit}`));
  }, [termine, season, teamFilter, typeFilter, timeFilter]);

  function onCreate() {
    const t = createTermin({
      team: newTeam,
      typ: newTyp,
      titel: newTitel.trim() || (newTyp === "Training" ? "Training" : "Spiel"),
      datum: newDatum,
      uhrzeit: newZeit,
      ort: newOrt.trim() || "",
      saison: season,
      internNotiz: "",
    });
    const next = loadTermine();
    setTermine(next);
  }

  function onDelete(t: Termin) {
    // sofort löschen, aber Undo anbieten
    deleteTerminCascade(t.id);
    setTermine(loadTermine());
    setUndo({ termin: t, expiresAt: Date.now() + 10_000 });
  }

  function onUndo() {
    if (!undo) return;
    // Termin wiederherstellen (nur Termin – Daten waren weg, das ist korrekt)
    const all = loadTermine();
    all.push(undo.termin);
    saveTermine(all);
    setTermine(loadTermine());
    setUndo(null);
  }

  function onSeasonChange(v: string) {
    setSeason(v);
    saveSeason(v);
  }

  const card: React.CSSProperties = { border: "2px solid #111", borderRadius: 18, padding: 16, background: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" };
  const input: React.CSSProperties = { border: "2px solid #111", borderRadius: 12, padding: "10px 12px", fontSize: 16, background: "#fff", width: "100%" };
  const btn: React.CSSProperties = { border: "2px solid #111", borderRadius: 999, padding: "10px 14px", fontWeight: 950, background: "#fff" };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 44, margin: 0 }}>Termine</h1>
      <p style={{ marginTop: 10, opacity: 0.9 }}>
        Manuell erstellen • Schnellfilter • Saison
      </p>

      {undo && (
        <div style={{ ...card, marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>
            Termin gelöscht: <span style={{ opacity: 0.85 }}>{undo.termin.typ} • {formatDateDE(undo.termin.datum)} {undo.termin.uhrzeit} • {undo.termin.titel}</span>
          </div>
          <button style={btn} onClick={onUndo}>↩ Rückgängig</button>
        </div>
      )}

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Saison</div>
        <input
          style={input}
          value={season}
          onChange={(e) => onSeasonChange(e.target.value)}
          placeholder='z.B. 2025/26'
        />
        <div style={{ marginTop: 8, opacity: 0.75 }}>Tipp: “2025/26”</div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Schnellfilter</div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Team</div>
            <select style={input} value={teamFilter} onChange={(e) => setTeamFilter(e.target.value as any)}>
              <option value="Alle">Alle</option>
              <option value="1. Mannschaft">1. Mannschaft</option>
              <option value="2. Mannschaft">2. Mannschaft</option>
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Typ</div>
            <select style={input} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
              <option value="Alle">Alle</option>
              <option value="Training">Training</option>
              <option value="Spiel">Spiel</option>
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Zeit</div>
            <select style={input} value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as any)}>
              <option value="Alle">Alle</option>
              <option value="Vergangenheit">Vergangenheit</option>
              <option value="Zukunft">Zukunft</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Termin manuell erstellen</div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Team</div>
            <select style={input} value={newTeam} onChange={(e) => setNewTeam(e.target.value as Team)}>
              <option value="1. Mannschaft">1. Mannschaft</option>
              <option value="2. Mannschaft">2. Mannschaft</option>
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Typ</div>
            <select style={input} value={newTyp} onChange={(e) => setNewTyp(e.target.value as TerminTyp)}>
              <option value="Training">Training</option>
              <option value="Spiel">Spiel</option>
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Titel</div>
            <input style={input} value={newTitel} onChange={(e) => setNewTitel(e.target.value)} />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Datum</div>
            <input style={input} type="date" value={newDatum} onChange={(e) => setNewDatum(e.target.value)} />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Uhrzeit</div>
            <input style={input} type="time" value={newZeit} onChange={(e) => setNewZeit(e.target.value)} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Ort</div>
            <input style={input} value={newOrt} onChange={(e) => setNewOrt(e.target.value)} placeholder="optional" />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button style={btn} onClick={onCreate}>+ Termin erstellen</button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, opacity: 0.85 }}>Keine Termine für die Filter/Saison.</div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} style={card}>
              <div style={{ fontWeight: 950 }}>
                {t.team} • {t.typ} • {formatDateDE(t.datum)} {t.uhrzeit}
              </div>
              <div style={{ marginTop: 6, opacity: 0.9 }}>
                {t.titel} {t.ort ? `• ${t.ort}` : ""}
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btn} onClick={() => onDelete(t)}>🗑 Löschen</button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}