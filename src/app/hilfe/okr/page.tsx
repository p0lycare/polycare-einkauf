import Link from "next/link";
import { karte } from "@/lib/stil";

const OKR_DASHBOARD = "https://polycare-okr.vercel.app";

type Schritt = { nr: number; titel: string; wo: string; wer: string; was: string[]; ergebnis: string };

const SCHRITTE: Schritt[] = [
  {
    nr: 1,
    titel: "OKR-Planung",
    wo: "Miro → OKR-Dashboard",
    wer: "OKR-Owner, Teams",
    was: [
      "Das OKR-Set eines Zyklus entsteht in Miro: Top-Objective, Top-KRs, Team-Objectives und Team-KRs.",
      "Budgetideen stehen als Sticky am Key Result, z. B. „21k (R316)“.",
      "Im OKR-Dashboard wird das Board importiert, geprüft und eingefroren (Version 1).",
    ],
    ergebnis: "Ein verbindliches OKR-Set mit Team-KRs, Leads und Budgetvorschlägen.",
  },
  {
    nr: 2,
    titel: "Budgetierung",
    wo: "Einkaufs-App → Planung",
    wer: "Finanzen, Teamleitungen",
    was: [
      "Finanzen übernimmt den eingefrorenen Zyklus: Er wird zur Periode (z. B. „26Z3“, Sep–Dez) im Status „In Planung“.",
      "Die Team-KRs werden zu Key Results, die Budgetvorschläge belegen je Team-KR einen Budgetposten vor.",
      "Die Teamleitungen verfeinern ihre Posten; Finanzen prüft und setzt die Periode auf „Aktiv“.",
    ],
    ergebnis: "Budgetposten je Team, jeder einem Team-KR zugeordnet.",
  },
  {
    nr: 3,
    titel: "Prozess im Einkauf",
    wo: "Einkaufs-App",
    wer: "alle, Teamleitung, GF, Einkauf",
    was: [
      "Eine Anforderung wählt einen Budgetposten – das Key Result wird automatisch übernommen.",
      "Freigabe durch Teamleitung bzw. Geschäftsführung, danach bestellt der Einkauf.",
      "Unter „Übersicht → Auswertung je Key Result“ stehen Plan und Ausgaben je KR.",
    ],
    ergebnis: "Jede Ausgabe ist einem Key Result zugeordnet – für Steuerung und OKR-Retro.",
  },
];

const REGELN: { titel: string; text: string }[] = [
  {
    titel: "Ein Zyklus für beide Tools",
    text: "Eine Periode im Einkauf entspricht genau einem OKR-Zyklus: gleiches Kürzel, gleiche Daten. Z1 Januar–April, Z2 Mai–August, Z3 September–Dezember. Quartale gibt es nicht mehr.",
  },
  {
    titel: "Klare Zuständigkeit für Daten",
    text: "Das OKR-Dashboard führt Zyklen, Objectives und Key Results (Kürzel, Titel, Team, Lead). Die Einkaufs-App führt Budgetposten, Anforderungen und Ausgaben. Übernommene Key Results werden im Einkauf nicht von Hand umbenannt, sondern im OKR-Dashboard geändert.",
  },
  {
    titel: "Stabile Kennung je Key Result",
    text: "Jedes übernommene Key Result trägt die OKR-ID aus dem Dashboard. Sie bleibt über Versionen gleich – so passen Budget und Ausgaben auch nach einer Überarbeitung zum richtigen KR.",
  },
  {
    titel: "Budget nur an Team-KRs",
    text: "Top-Level-KRs dienen zur Einordnung. Budgetposten und Anforderungen hängen an Team-KRs; Ausgaben ohne Key Result fallen in der Auswertung auf.",
  },
  {
    titel: "Vorschlag ist nicht Budget",
    text: "Der Budgetvorschlag aus der OKR-Planung belegt den Posten nur vor. Verbindlich ist der Budgetposten im Einkauf, wie ihn Teamleitung und Finanzen geplant haben.",
  },
  {
    titel: "Gleiche Teams",
    text: "Teams heißen in beiden Tools gleich (z. B. Material, Produktion, Bausysteme, Geschäftsführung). Ein Key Result mit unbekanntem Team wird bei der Übernahme gemeldet statt geraten.",
  },
  {
    titel: "Neue OKR-Version",
    text: "Wird das OKR-Set überarbeitet (Version 2, 3 …), zeigt die Einkaufs-App die Unterschiede; Finanzen bestätigt die Übernahme. Key Results, die wegfallen, aber schon Ausgaben haben, bleiben erhalten und werden markiert.",
  },
];

type Endpunkt = { richtung: string; adresse: string; inhalt: string; zugang: string; wann: string; stand: string };

const SCHNITTSTELLE: Endpunkt[] = [
  {
    richtung: "OKR-Dashboard → Einkauf",
    adresse: "GET polycare-okr.vercel.app/api/v1/zyklen/{kuerzel}",
    inhalt: "Eingefrorenes OKR-Set: Zyklus (Kürzel, Beginn, Ende), Version, Key Results mit ID, Kürzel, Titel, Team, Lead, Budgetvorschlag in Cent (brutto)",
    zugang: "Schlüssel OKR_API_KEY – erzeugt im OKR-Dashboard unter Verwaltung → Zugänge für andere Apps, hinterlegt in Vercel (Einkauf)",
    wann: "Beim Übernehmen eines Zyklus und wenn es eine neue Version gibt",
    stand: "im OKR-Dashboard fertig",
  },
  {
    richtung: "Einkauf → OKR-Dashboard",
    adresse: "GET polycare-einkauf.vercel.app/api/v1/key-results/{kuerzel}",
    inhalt: "Je OKR-ID: geplant, in Freigabe, gebunden, bestellt (Cent, brutto) – keine einzelnen Anforderungen, keine Personen",
    zugang: "Schlüssel EINKAUF_API_KEY – erzeugt in der Einkaufs-App, hinterlegt in Vercel (OKR-Dashboard)",
    wann: "Wenn die Frozen-Ansicht im OKR-Dashboard Budget-Ist je KR zeigt",
    stand: "geplant",
  },
];

const STAND: { was: string; wo: string; fertig: boolean }[] = [
  { was: "Eingefrorenes OKR-Set abrufbar", wo: "OKR-Dashboard", fertig: true },
  { was: "Auswertung je Key Result mit CSV-Export", wo: "Einkauf", fertig: true },
  { was: "Perioden als Zyklen (26Z1–26Z3) statt Quartale", wo: "Einkauf", fertig: false },
  { was: "„Aus OKR-Dashboard übernehmen“ unter Planung, mit OKR-ID je Key Result", wo: "Einkauf", fertig: false },
  { was: "Budgetvorschläge als vorbelegte Budgetposten", wo: "Einkauf", fertig: false },
  { was: "Unterschiede bei neuer OKR-Version, Bestätigung durch Finanzen", wo: "Einkauf", fertig: false },
  { was: "Budget-Ist je KR für das OKR-Dashboard bereitstellen", wo: "Einkauf", fertig: false },
  { was: "Budget-Ist in der Frozen-Ansicht anzeigen", wo: "OKR-Dashboard", fertig: false },
];

export default function OkrUndEinkauf() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-6 font-sans">
      <div>
        <Link href="/hilfe" className="text-sm text-neutral-500 hover:underline">
          ← Hilfe und Einführung
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Vom OKR zur Bestellung</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Wie das{" "}
          <a href={OKR_DASHBOARD} className="underline" target="_blank" rel="noreferrer">
            OKR-Dashboard
          </a>{" "}
          und die Einkaufs-App zusammenarbeiten: Was in der OKR-Planung entsteht, wird zum Budget, und jede Ausgabe
          zahlt sichtbar auf ein Key Result ein.
        </p>
      </div>

      {/* Ablauf als drei Stufen, am Handy untereinander */}
      <section aria-label="Ablauf" className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
        {SCHRITTE.map((s, i) => (
          <div key={s.nr} className="contents">
            <div className="flex flex-col gap-2 border-t-4 border-marke bg-flaeche p-4">
              <p className="text-xs text-neutral-500">
                Schritt {s.nr} · {s.wo}
              </p>
              <h2 className="font-semibold text-marke-dunkel dark:text-white">{s.titel}</h2>
              <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
                {s.was.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <p className="mt-auto pt-2 text-sm">
                <span className="text-neutral-500">Wer: </span>
                {s.wer}
              </p>
              <p className="text-sm font-medium">→ {s.ergebnis}</p>
            </div>
            {i < SCHRITTE.length - 1 && (
              <span aria-hidden className="flex items-center justify-center text-2xl text-marke md:px-1">
                <span className="md:hidden">↓</span>
                <span className="hidden md:inline">→</span>
              </span>
            )}
          </div>
        ))}
      </section>
      <p className="-mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        ↺ Rückweg: Die Einkaufs-App meldet je Key Result geplant, gebunden und bestellt an das OKR-Dashboard. So sieht man
        in der OKR-Ansicht und in der Retro neben dem Fortschritt auch, was dafür ausgegeben wurde.
      </p>

      <section className={karte}>
        <h2 className="font-medium">Regeln für ein sauberes Zusammenspiel</h2>
        <dl className="mt-3 flex flex-col gap-3 text-sm">
          {REGELN.map((r) => (
            <div key={r.titel}>
              <dt className="font-medium">{r.titel}</dt>
              <dd className="text-neutral-700 dark:text-neutral-300">{r.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="font-medium">Schnittstelle</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Beide Tools holen sich die Daten beim jeweils anderen ab – nur lesend, über einen eigenen Schlüssel je
          Richtung. Gespeichert wird nur der Fingerabdruck des Schlüssels, Beträge immer in Cent und brutto.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {SCHNITTSTELLE.map((e) => (
            <div key={e.richtung} className={`${karte} text-sm`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{e.richtung}</h3>
                <span className={`rounded px-2 py-0.5 text-xs ${e.stand === "geplant" ? "bg-flaeche text-neutral-600 dark:text-neutral-400" : "bg-marke-hell text-marke-dunkel"}`}>
                  {e.stand}
                </span>
              </div>
              <p className="mt-2 break-all font-mono text-xs">{e.adresse}</p>
              <dl className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-[7rem_1fr]">
                <dt className="text-neutral-500">Inhalt</dt>
                <dd>{e.inhalt}</dd>
                <dt className="text-neutral-500">Zugang</dt>
                <dd>{e.zugang}</dd>
                <dt className="text-neutral-500">Wann</dt>
                <dd>{e.wann}</dd>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className={karte}>
        <h2 className="font-medium">Stand der Umsetzung</h2>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm">
          {STAND.map((s) => (
            <li key={s.was} className="flex gap-2">
              <span aria-hidden>{s.fertig ? "✅" : "⏳"}</span>
              <span>
                {s.was} <span className="text-neutral-500">· {s.wo}</span>
                <span className="sr-only">{s.fertig ? " (fertig)" : " (offen)"}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
