import dynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const CheckInClient = dynamic(() => import("./CheckInClient"), {
  ssr: false,
  loading: () => <main style={{ padding: 24 }}>Lade Check-in…</main>,
});

export default function Page() {
  return <CheckInClient />;
}