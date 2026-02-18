import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import CleanupClient from "./CleanupClient";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  title: "SV Gelting",
  description: "Teamverwaltung, Termine, Check-in, Bewertung, Stats",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <CleanupClient>
          <AppShell>{children}</AppShell>
        </CleanupClient>
      </body>
    </html>
  );
}
