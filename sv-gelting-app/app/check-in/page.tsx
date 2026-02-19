import { Suspense } from "react";
import CheckInClient from "./CheckInClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Lade Check-in…</main>}>
      <CheckInClient />
    </Suspense>
  );
}