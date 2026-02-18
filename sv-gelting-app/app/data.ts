export type Team = "1. Mannschaft" | "2. Mannschaft";
export type TerminTyp = "Training" | "Spiel";

export type Termin = {
  id: string;
  team: Team;
  typ: TerminTyp;
  titel: string;
  datum: string;   // YYYY-MM-DD
  uhrzeit: string; // HH:MM
  ort: string;
};

export const SEED_TERMINE: Termin[] = [
  {
    id: "training-2026-02-18-1",
    team: "1. Mannschaft",
    typ: "Training",
    titel: "Training",
    datum: "2026-02-18",
    uhrzeit: "20:30",
    ort: "Sportplatz",
  },
];

export const TERMINE = SEED_TERMINE;