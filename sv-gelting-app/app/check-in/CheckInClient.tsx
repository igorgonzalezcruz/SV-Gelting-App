"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AttendanceStore, Player, Termin } from "../lib/store";
import { loadAttendance, loadPlayers, loadTermine, saveAttendance } from "../lib/store";

function formatDateDE(iso?: string) {
  const s = String(iso || "");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s || "—";
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export default function CheckInClient() {
  const params = useSearchParams();
  const terminFromUrl = params.get("termin") || "";

  const [loaded, setLoaded] = useState(false);
  const [termine, setTermine] = useState<Termin[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attStore, setAttStore] = useState<AttendanceStore>({});

  const [selectedTerminId, setSelectedTerminId] = useState<string>("");

  // Load once
  useEffect(() => {
    const t = loadTermine();
    const p = loadPlayers();
    const a = loadAttendance();

    setTermine(t);
    setPlayers(p);
    setAttStore(a);

    // Termin aus URL bevorzugen, sonst erster Termin
    const initial =
      (terminFromUrl && t.find((x) => x.id === terminFromUrl)?.id) ||
      (t[0]?.id ?? "");

    setSelectedTerminId(initial);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist Attendance (robust)
  useEffect(() => {
    if (!loaded) return;
    saveAttendance(attStore);
  }, [attStore, loaded]);

  const selectedTermin = useMemo(
    () => termine.find((t) => t.id === selectedTerminId) || null,
    [termine, selectedTerminId]
  );

  const currentMap = useMemo(() => {
    if (!selectedTerminId) return {};
    return attStore[selectedTerminId] || {};
  }, [attStore, selectedTerminId]);

  function togglePlayer(playerId: string) {
    if (!selectedTerminId) return;

    setAttStore((prev) => {
      const terminMap = { ...(prev[selectedTerminId] || {}) };
      const nextVal = !Boolean(terminMap[playerId]);
      terminMap[playerId] = nextVal;

      return {
        ...prev,
        [selectedTerminId]: terminMap,
      };
    });
  }

  if (!loaded) {
    return <main style={{ padding: 24 }}>Lade…</main>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Check-in</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/termine">Termine</Link>
        <Link href="/bewertung">Bewertung</Link>
        <Link href="/teams">Teams</Link>
        <Link href="/stats">Stats</Link>
        <Link href="/aufstellung">Aufstellung</Link>
        <Link href="/export">Export</Link>
      </div>

      {termine.length === 0 ? (
        <div style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8 }}>
          <b>Keine Termine vorhanden.</b>
          <div>Lege erst unter „Termine“ mindestens einen Termin an.</div>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Termin auswählen</label>
          <select
            value={selectedTerminId}
            onChange={(e) => setSelectedTerminId(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc", minWidth: 260 }}
          >
            {termine.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title ? `${t.title} – ` : ""}
                {formatDateDE(t.date)} {t.description ? `(${t.description})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {players.length === 0 ? (
        <div style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8 }}>
          <b>Keine Spieler vorhanden.</b>
          <div>Lege erst Spieler an (Teams/Spieler-Bereich).</div>
        </div>
      ) : (
        <>
          <h2 style={{ marginTop: 8 }}>
            {selectedTermin ? `Termin: ${selectedTermin.title ?? formatDateDE(selectedTermin.date)}` : "—"}
          </h2>

          <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            {players.map((p) => {
              const checked = Boolean(currentMap[p.id]);
              return (
                <label
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid #ddd",
                    padding: 10,
                    borderRadius: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePlayer(p.id)}
                    style={{ transform: "scale(1.2)" }}
                  />
                  <span style={{ flex: 1 }}>{p.name}</span>
                  <span style={{ opacity: 0.7 }}>{checked ? "✅" : ""}</span>
                </label>
              );
            })}
          </div>

          <div style={{ marginTop: 16, opacity: 0.8 }}>
            gespeichert für Termin <code>{selectedTerminId || "—"}</code>
          </div>
        </>
      )}
    </main>
  );
}