"use client";

import { Suspense } from "react";
import Inner from "./Inner";

export default function CheckInClient() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Lade Check-in…</main>}>
      <Inner />
    </Suspense>
  );
}