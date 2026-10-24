import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Kopfzeile } from "./kopfzeile";
import { createClient } from "@/lib/supabase/server";
import { gibtFrei, ladeIch, plant } from "@/lib/einkauf/ich";
import "./globals.css";

// Inter als frei verfügbare Nähe zur Hausschrift TT Interphases
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polycare Einkauf",
  description: "Bestellanforderungen gegen das Quartalsbudget, Freigabe und Bestellung",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const ich = await ladeIch(supabase);

  const [{ count: freigaben }, { count: bestellen }] = await Promise.all([
    ich && gibtFrei(ich)
      ? supabase
          .from("anforderung")
          .select("id", { count: "exact", head: true })
          .in("status", ["bei_teamleitung", "bei_gf"])
          .eq("darf_freigeben", true)
      : { count: 0 },
    ich?.ist_einkauf
      ? supabase.from("anforderung").select("id", { count: "exact", head: true }).eq("status", "freigegeben")
      : { count: 0 },
  ]);

  return (
    <html lang="de">
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        {ich && (
          <Kopfzeile
            daten={{
              name: ich.name,
              freigaben: gibtFrei(ich) ? (freigaben ?? 0) : null,
              bestellen: ich.ist_einkauf ? (bestellen ?? 0) : null,
              zeigeUebersicht: ich.ist_gf || ich.ist_finanzen || ich.ist_admin,
              zeigePlanung: plant(ich),
              zeigeVerwaltung: ich.ist_admin,
            }}
          />
        )}
        {children}
      </body>
    </html>
  );
}
