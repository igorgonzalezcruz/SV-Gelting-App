"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    const t = loadTermine();
    const p = loadPlayers();
    const a = loadAttendance();

    setTermine(t);
    setPlayers(p);
    setAttStore(a);

    const initial =
      (terminFromUrl && t.find((x) => x.id === terminFromUrl)?.id) ||
      (t[0]?.id ?? "");

    setSelectedTerminId(initial);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      terminMap[playerId] = !Boolean(terminMap[playerId]);
      return { ...prev, [selectedTerminId]: terminMap };
    });
  }

  if (!loaded) return <main style={{ padding: 24 }}>Lade…</main>;

  return (
    <main style={{ padding: 24 }}>
      <h1>Check-in</h1>

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
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc", minWidth: 320 }}
          >
            {termine.map((t) => (
              <option key={t.id} value={t.id}>
                {t.typ} • {formatDateDE(t.datum)} {t.uhrzeit} • {t.titel}
              </option>
            ))}
          </select>
        </div>
      )}

      {players.length === 0 ? (
        <div style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8 }}>
          <b>Keine Spieler vorhanden.</b>
          <div>Lege erst Spieler an.</div>
        </div>
      ) : (
        <>
          <h2 style={{ marginTop: 8 }}>
            {selectedTermin ? `Termin: ${selectedTermin.titel}` : "—"}
          </h2>

          <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            {players
              .slice()
              .sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name))
              .map((p) => {
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
                    <span style={{ flex: 1 }}>
                      {p.team} • {p.number ? `#${p.number} ` : ""}{p.name}
                    </span>
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