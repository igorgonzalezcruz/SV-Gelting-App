"use client";

import { useEffect, useMemo, useState } from "react";
import type { Termin, Player, RatingsStore, Ratings, Note, MatchStatsStore } from "../lib/store";
import {
  loadTermine,
  loadPlayers,
  loadRatings,
  saveRatings,
  loadAttendance,
  loadMatchStats,
  saveMatchStats,
  loadSeason,
} from "../lib/store";

const NOTE_OPTIONS: Note[] = [1, 2, 3, 4, 5, 6];

function formatDateDE(iso: string) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
function isPast(t: Termin) {
  return new Date(`${t.datum}T${t.uhrzeit}:00`).getTime() < Date.now();
}
function avg(r: Ratings) {
  return (r.spielintelligenz + r.kondition + r.technisch + r.verstaendnis) / 4;
}

export default function BewertungPage() {
  const [season, setSeason] = useState("");
  const [termine, setTermine] = useState<Termin[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [att, setAtt] = useState<any>({});
  const [ratings, setRatings] = useState<RatingsStore>({});
  const [matchStats, setMatchStats] = useState<MatchStatsStore>({});

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedTerminId, setSelectedTerminId] = useState<string>("");

  useEffect(() => {
    setSeason(loadSeason());          // kann leer sein → dann NICHT filtern
    setTermine(loadTermine());        // smart-repair
    setPlayers(loadPlayers());        // smart-repair
    setAtt(loadAttendance());
    setRatings(loadRatings());
    setMatchStats(loadMatchStats());
  }, []);

  useEffect(() => saveRatings(ratings), [ratings]);
  useEffect(() => saveMatchStats(matchStats), [matchStats]);

  const player = players.find((p) => p.id === selectedPlayerId) ?? null;

  const playerTermine = useMemo(() => {
    if (!player) return [];

    return [...termine]
      .filter((t) => (!season ? true : t.saison === season)) // ✅ pragmatisch
      .filter((t) => t.team === player.team)
      .filter(isPast)
      .sort((a, b) => `${b.datum}T${b.uhrzeit}`.localeCompare(`${a.datum}T${a.uhrzeit}`));
  }, [termine, player, season]);

  useEffect(() => {
    if (!selectedPlayerId && players.length) setSelectedPlayerId(players[0].id);
  }, [players, selectedPlayerId]);

  useEffect(() => {
    if (!player) return;
    if (playerTermine.length && !selectedTerminId) setSelectedTerminId(playerTermine[0].id);
  }, [player, playerTermine, selectedTerminId]);

  const termin = playerTermine.find((t) => t.id === selectedTerminId) ?? null;

  const wasPresent = useMemo(() => {
    if (!termin || !player) return null;
    const v = att[termin.id]?.[player.id];
    return typeof v === "boolean" ? v : null;
  }, [att, termin, player]);

  const currentRating = useMemo(() => {
    if (!termin || !player) return null;
    return ratings[termin.id]?.[player.id] ?? null;
  }, [ratings, termin, player]);

  const currentMatch = useMemo(() => {
    if (!termin || !player) return null;
    return matchStats[termin.id]?.[player.id] ?? null;
  }, [matchStats, termin, player]);

  function setField(field: keyof Ratings, value: Note) {
    if (!termin || !player) return;
    setRatings((prev) => {
      const next = { ...prev };
      const perTermin = { ...(next[termin.id] ?? {}) };
      const cur: Ratings =
        perTermin[player.id] ?? { spielintelligenz: 3, kondition: 3, technisch: 3, verstaendnis: 3 };
      perTermin[player.id] = { ...cur, [field]: value };
      next[termin.id] = perTermin;
      return next;
    });
  }

  function clearRating() {
    if (!termin || !player) return;
    setRatings((prev) => {
      const next = { ...prev };
      const perTermin = { ...(next[termin.id] ?? {}) };
      delete perTermin[player.id];
      next[termin.id] = perTermin;
      return next;
    });
  }

  function copyLastRating() {
    if (!termin || !player) return;
    const list = playerTermine
      .filter((t) => t.typ === termin.typ)
      .slice()
      .sort((a, b) => `${b.datum}T${b.uhrzeit}`.localeCompare(`${a.datum}T${a.uhrzeit}`));

    for (const t of list) {
      if (t.id === termin.id) continue;
      const r = ratings[t.id]?.[player.id];
      if (r) {
        setRatings((prev) => {
          const next = { ...prev };
          const per = { ...(next[termin.id] ?? {}) };
          per[player.id] = { ...r };
          next[termin.id] = per;
          return next;
        });
        return;
      }
    }
    alert("Keine vorherige Bewertung gefunden.");
  }

  function setMinutesGoalsAssists(minutes: number, goals: number, assists: number) {
    if (!termin || !player) return;
    setMatchStats((prev) => {
      const next = { ...prev };
      const per = { ...(next[termin.id] ?? {}) };
      per[player.id] = {
        minutes: Math.max(0, Math.min(200, Math.round(minutes))),
        goals: Math.max(0, Math.round(goals)),
        assists: Math.max(0, Math.round(assists)),
      };
      next[termin.id] = per;
      return next;
    });
  }

  function clearMatch() {
    if (!termin || !player) return;
    setMatchStats((prev) => {
      const next = { ...prev };
      const per = { ...(next[termin.id] ?? {}) };
      delete per[player.id];
      next[termin.id] = per;
      return next;
    });
  }

  const card: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 18,
    padding: 18,
    background: "#fff",
    maxWidth: 900,
    marginTop: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  };
  const input: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 16,
    background: "#fff",
    width: "100%",
  };
  const btn: React.CSSProperties = {
    border: "2px solid #111",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 900,
    background: "#fff",
  };

  const avgText = currentRating ? avg(currentRating).toFixed(2) : "—";

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 44, margin: 0 }}>Bewertung</h1>
      <p style={{ marginTop: 10, opacity: 0.9 }}>
        Saison: <b>{season || "— (keine Saison gesetzt)"}</b> • Spieler → Termin → Bewertung • Spiel: Minuten/Tore/Vorlagen
      </p>

      <div style={card}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Spieler auswählen</div>

        {players.length === 0 ? (
          <div style={{ opacity: 0.85 }}>
            <b>Keine Spieler gefunden.</b>
            <div>Wenn du vorher Spieler hattest: sie werden gleich “smart” aus localStorage repariert.</div>
            <div style={{ marginTop: 6 }}>Lade Seite neu (Hard Reload) oder lege 1 Spieler an.</div>
          </div>
        ) : (
          <select
            value={selectedPlayerId}
            onChange={(e) => {
              setSelectedPlayerId(e.target.value);
              setSelectedTerminId("");
            }}
            style={input}
          >
            {players
              .slice()
              .sort(
                (a, b) =>
                  a.team.localeCompare(b.team) ||
                  (parseInt(a.number || "9999", 10) - parseInt(b.number || "9999", 10)) ||
                  a.name.localeCompare(b.name)
              )
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.team} • {p.number ? `#${p.number} ` : ""}{p.name}
                </option>
              ))}
          </select>
        )}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>
          Termin auswählen (nur vergangene des Teams{season ? " & Saison" : ""})
        </div>

        {!player ? (
          <div style={{ opacity: 0.85 }}>Bitte zuerst einen Spieler auswählen.</div>
        ) : playerTermine.length === 0 ? (
          <div style={{ opacity: 0.85 }}>
            Keine vergangenen Termine für Team <b>{player.team}</b>{season ? <> in Saison <b>{season}</b></> : null}.
            <div style={{ marginTop: 6, opacity: 0.75 }}>
              Tipp: Wenn Saison leer ist, setze eine Saison – oder Terminen fehlt das Feld <code>saison</code>.
            </div>
          </div>
        ) : (
          <select value={selectedTerminId} onChange={(e) => setSelectedTerminId(e.target.value)} style={input}>
            {playerTermine.map((t) => (
              <option key={t.id} value={t.id}>
                {t.typ} • {formatDateDE(t.datum)} {t.uhrzeit} • {t.titel}
              </option>
            ))}
          </select>
        )}

        {termin && (
          <div style={{ marginTop: 10, opacity: 0.9 }}>
            Anwesenheit (Check-in): <b>{wasPresent === true ? "✅ war da" : wasPresent === false ? "❌ nicht da" : "⚪ offen"}</b>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Spiel-Performance</div>
        {!player || !termin ? (
          <div style={{ opacity: 0.85 }}>Bitte Spieler und Termin wählen.</div>
        ) : termin.typ !== "Spiel" ? (
          <div style={{ opacity: 0.85 }}>Nur bei Terminen vom Typ <b>Spiel</b>.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Minuten</div>
                <input
                  style={input}
                  inputMode="numeric"
                  value={currentMatch?.minutes ?? ""}
                  placeholder="z.B. 90"
                  onChange={(e) =>
                    setMinutesGoalsAssists(
                      Number(e.target.value || 0),
                      currentMatch?.goals ?? 0,
                      currentMatch?.assists ?? 0
                    )
                  }
                />
              </div>
              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Tore</div>
                <input
                  style={input}
                  inputMode="numeric"
                  value={currentMatch?.goals ?? ""}
                  placeholder="z.B. 1"
                  onChange={(e) =>
                    setMinutesGoalsAssists(currentMatch?.minutes ?? 0, Number(e.target.value || 0), currentMatch?.assists ?? 0)
                  }
                />
              </div>
              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Vorlagen</div>
                <input
                  style={input}
                  inputMode="numeric"
                  value={currentMatch?.assists ?? ""}
                  placeholder="z.B. 1"
                  onChange={(e) =>
                    setMinutesGoalsAssists(currentMatch?.minutes ?? 0, currentMatch?.goals ?? 0, Number(e.target.value || 0))
                  }
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={btn} onClick={clearMatch}>Min/Tore/Vorlagen löschen</button>
            </div>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Bewertung (1–6)</div>

        {!player || !termin ? (
          <div style={{ opacity: 0.85 }}>Bitte Spieler und Termin wählen.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={btn} onClick={copyLastRating}>↩ Letzte Bewertung übernehmen</button>
              <button style={btn} onClick={clearRating}>🗑 Bewertung löschen</button>
              <div style={{ marginLeft: "auto", fontWeight: 950 }}>Ø: {avgText}</div>
            </div>

            <RatingRow label="Spielintelligenz" value={currentRating?.spielintelligenz} onChange={(v) => setField("spielintelligenz", v)} />
            <RatingRow label="Kondition" value={currentRating?.kondition} onChange={(v) => setField("kondition", v)} />
            <RatingRow label="Technisch" value={currentRating?.technisch} onChange={(v) => setField("technisch", v)} />
            <RatingRow label="Verständnis" value={currentRating?.verstaendnis} onChange={(v) => setField("verstaendnis", v)} />
          </>
        )}
      </div>
    </main>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: Note;
  onChange: (v: Note) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
      <div style={{ width: 170, fontWeight: 900 }}>{label}</div>
      <select
        value={value ?? 3}
        onChange={(e) => onChange(parseInt(e.target.value, 10) as Note)}
        style={{ border: "2px solid #111", borderRadius: 12, padding: "10px 12px", fontSize: 16, background: "#fff" }}
      >
        {NOTE_OPTIONS.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  );
}