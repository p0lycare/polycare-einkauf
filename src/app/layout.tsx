import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { gibtFrei, ladeIch, plant } from "@/lib/einkauf/ich";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
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

const navLink = "text-neutral-600 hover:underline dark:text-neutral-400";

function Zaehler({ anzahl }: { anzahl: number }) {
  if (anzahl <= 0) return null;
  return (
    <span className="ml-1 rounded-full bg-neutral-900 px-1.5 py-0.5 text-xs text-white dark:bg-white dark:text-neutral-900">
      {anzahl}
    </span>
  );
}

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {ich && (
          <header className="border-b border-neutral-200 dark:border-neutral-800">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3 font-sans">
              <Link href="/" className="font-semibold">
                Polycare Einkauf
              </Link>
              <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {gibtFrei(ich) && (
                  <Link href="/freigaben" className={navLink}>
                    Freigaben
                    <Zaehler anzahl={freigaben ?? 0} />
                  </Link>
                )}
                {ich.ist_einkauf && (
                  <Link href="/einkauf" className={navLink}>
                    Einkauf
                    <Zaehler anzahl={bestellen ?? 0} />
                  </Link>
                )}
                <Link href="/budget" className={navLink}>
                  Budget
                </Link>
                {plant(ich) && (
                  <Link href="/planung" className={navLink}>
                    Planung
                  </Link>
                )}
                {ich.ist_admin && (
                  <Link href="/verwaltung" className={navLink}>
                    Verwaltung
                  </Link>
                )}
                <span className="hidden text-neutral-400 sm:inline">|</span>
                <span className="hidden text-neutral-600 sm:inline dark:text-neutral-400">{ich.name}</span>
                <form action="/auth/logout" method="post">
                  <button type="submit" className="text-neutral-600 underline dark:text-neutral-400">
                    Abmelden
                  </button>
                </form>
              </nav>
            </div>
          </header>
        )}
        {children}
      </body>
    </html>
  );
}
