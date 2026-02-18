"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BackupSnapshot,
  loadBackups,
  saveBackups,
  makeSnapshot,
  restoreSnapshot,
  loadSeason,
  loadTermine,
  loadPlayers,
  loadAttendance,
  loadRatings,
  loadTests,
  loadMatchStats,
  loadLineup,
} from "../lib/store";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };
  const head = cols.map(esc).join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return head + "\n" + body;
}

export default function ExportPage() {
  const [season, setSeason] = useState("");
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);

  useEffect(() => {
    setSeason(loadSeason());
    setBackups(loadBackups());
  }, []);

  function createBackup() {
    const snap = makeSnapshot(season);
    const all = loadBackups();
    all.unshift(snap);
    saveBackups(all.slice(0, 30));
    setBackups(loadBackups());
    alert("Backup erstellt.");
  }

  function downloadBackup(snap: BackupSnapshot) {
    downloadText(`backup_${snap.season}_${snap.id}.json`, JSON.stringify(snap, null, 2));
  }

  function deleteBackup(id: string) {
    const next = backups.filter((b) => b.id !== id);
    saveBackups(next);
    setBackups(next);
  }

  function restore(b: BackupSnapshot) {
    if (!confirm("Backup wirklich wiederherstellen? (Überschreibt aktuelle Daten)")) return;
    restoreSnapshot(b);
    alert("Backup wiederhergestellt. Seite neu laden.");
  }

  function exportCSV_All() {
    const termine = loadTermine().filter((t) => t.saison === season);
    const players = loadPlayers();
    const att = loadAttendance();
    const rat = loadRatings();
    const tests = loadTests();
    const ms = loadMatchStats();
    const lu = loadLineup();

    const rowsTermine = termine.map((t) => ({ ...t }));
    const rowsPlayers = players.map((p) => ({ ...p }));

    const rowsAttendance = Object.keys(att).flatMap((terminId) =>
      Object.keys(att[terminId] ?? {}).map((playerId) => ({
        terminId,
        playerId,
        present: att[terminId][playerId],
      }))
    );

    const rowsRatings = Object.keys(rat).flatMap((terminId) =>
      Object.keys(rat[terminId] ?? {}).map((playerId) => ({
        terminId,
        playerId,
        ...rat[terminId][playerId],
      }))
    );

    const rowsMatch = Object.keys(ms).flatMap((terminId) =>
      Object.keys(ms[terminId] ?? {}).map((playerId) => ({
        terminId,
        playerId,
        ...ms[terminId][playerId],
      }))
    );

    const rowsTests = Object.keys(tests).flatMap((playerId) =>
      (tests[playerId] ?? []).map((e) => ({ playerId, ...e }))
    );

    const rowsLineup = Object.keys(lu).map((terminId) => ({
      terminId,
      starters: (lu[terminId].starterIds ?? []).join("|"),
      bench: (lu[terminId].benchIds ?? []).join("|"),
      note: lu[terminId].note ?? "",
    }));

    downloadText(`export_${season}_termine.csv`, toCSV(rowsTermine));
    downloadText(`export_${season}_players.csv`, toCSV(rowsPlayers));
    downloadText(`export_${season}_attendance.csv`, toCSV(rowsAttendance));
    downloadText(`export_${season}_ratings.csv`, toCSV(rowsRatings));
    downloadText(`export_${season}_matchstats.csv`, toCSV(rowsMatch));
    downloadText(`export_${season}_tests.csv`, toCSV(rowsTests));
    downloadText(`export_${season}_lineup.csv`, toCSV(rowsLineup));
  }

  const card: React.CSSProperties = { border: "2px solid #111", borderRadius: 18, padding: 18, background: "#fff", maxWidth: 980, boxShadow: "0 10px 30px rgba(0,0,0,0.06)" };
  const btn: React.CSSProperties = { border: "2px solid #111", borderRadius: 999, padding: "10px 14px", fontWeight: 950, background: "#fff" };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 44, margin: 0 }}>Export</h1>
      <p style={{ marginTop: 10, opacity: 0.9 }}>
        Auto-Backup läuft 1× pro Tag beim Öffnen • Hier kannst du manuell sichern/restore & CSV für Excel exportieren.
      </p>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950 }}>Saison</div>
        <div style={{ marginTop: 8, opacity: 0.9 }}><b>{season}</b></div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950 }}>CSV Export (Excel)</div>
        <div style={{ marginTop: 10 }}>
          <button style={btn} onClick={exportCSV_All}>⬇ Alle CSV exportieren</button>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 950 }}>Backups</div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btn} onClick={createBackup}>+ Backup erstellen</button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {backups.length === 0 ? (
            <div style={{ opacity: 0.85 }}>Keine Backups vorhanden.</div>
          ) : (
            backups.map((b) => (
              <div key={b.id} style={{ border: "2px solid #111", borderRadius: 16, padding: 12 }}>
                <div style={{ fontWeight: 950 }}>{b.season}</div>
                <div style={{ marginTop: 4, opacity: 0.85 }}>{new Date(b.createdAtISO).toLocaleString()}</div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={btn} onClick={() => downloadBackup(b)}>⬇ Download</button>
                  <button style={btn} onClick={() => restore(b)}>↩ Restore</button>
                  <button style={btn} onClick={() => deleteBackup(b.id)}>🗑 Löschen</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}