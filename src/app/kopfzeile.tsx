import Link from "next/link";
import { Logo } from "./logo";
import { KopfzeileReiter, type Reiter } from "./kopfzeile-reiter";

export type KopfzeileDaten = {
  name: string;
  freigaben: number | null;
  bestellen: number | null;
  zeigePlanung: boolean;
  zeigeVerwaltung: boolean;
};

/** Kopfzeile in zwei Ebenen: oben Logo und Konto, darunter die Bereiche als Reiter. Null = Bereich ausblenden. */
export function Kopfzeile({ daten }: { daten: KopfzeileDaten }) {
  const reiter: Reiter[] = [
    { href: "/", text: "Meine Anforderungen", aktivBei: "/" },
    ...(daten.freigaben !== null ? [{ href: "/freigaben", text: "Freigaben", aktivBei: "/freigaben", zaehler: daten.freigaben }] : []),
    ...(daten.bestellen !== null ? [{ href: "/einkauf", text: "Einkauf", aktivBei: "/einkauf", zaehler: daten.bestellen }] : []),
    { href: "/budget", text: "Budget", aktivBei: "/budget" },
    ...(daten.zeigePlanung ? [{ href: "/planung", text: "Planung", aktivBei: "/planung" }] : []),
    ...(daten.zeigeVerwaltung ? [{ href: "/verwaltung", text: "Verwaltung", aktivBei: "/verwaltung" }] : []),
  ];

  return (
    <header className="border-b border-neutral-200 font-sans dark:border-neutral-800">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 pt-4 pb-1">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Polycare Einkauf, Startseite">
            <Logo className="h-5 text-marke-dunkel dark:text-white" />
            <span className="hidden border-l border-neutral-300 pl-3 text-sm sm:inline text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">Einkauf</span>
          </Link>
          <div className="flex min-w-0 items-center gap-3 text-sm sm:gap-4">
            <Link href="/hilfe" className="text-neutral-500 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100">
              Hilfe
            </Link>
            <span className="hidden truncate text-neutral-700 sm:inline dark:text-neutral-300">{daten.name}</span>
            <form action="/auth/logout" method="post">
              <button type="submit" className="whitespace-nowrap text-neutral-500 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100">
                Abmelden
              </button>
            </form>
          </div>
        </div>
        <KopfzeileReiter reiter={reiter} />
      </div>
    </header>
  );
}
