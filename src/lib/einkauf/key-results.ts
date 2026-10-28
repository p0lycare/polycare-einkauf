/** Auswertung je Key Result für die OKR-Retro: Plan aus den Budgetposten, Ausgaben aus den Anforderungen. */
import type { AnforderungStatus } from "./anforderung";

export type KeyResultInfo = { id: string; kuerzel: string; titel: string; team_id: string | null };
export type PostenInfo = { key_result_id: string | null; geplant_cent: number };
export type AnforderungInfo = { key_result_id: string | null; betrag_cent: number; status: AnforderungStatus };

export type KeyResultZeile = {
  /** null = Anforderungen und Posten ohne Key Result */
  kr: KeyResultInfo | null;
  geplant_cent: number;
  in_freigabe_cent: number;
  freigegeben_cent: number;
  bestellt_cent: number;
  /** freigegeben + bestellt, wie unter Budget */
  gebunden_cent: number;
  verfuegbar_cent: number;
  anzahl: number;
};

const ZAEHLT: AnforderungStatus[] = ["bei_teamleitung", "bei_gf", "freigegeben", "bestellt"];

function zeile(kr: KeyResultInfo | null, posten: PostenInfo[], anforderungen: AnforderungInfo[]): KeyResultZeile {
  const summe = (status: AnforderungStatus[]) =>
    anforderungen.filter((a) => status.includes(a.status)).reduce((s, a) => s + a.betrag_cent, 0);
  const geplant = posten.reduce((s, p) => s + p.geplant_cent, 0);
  const freigegeben = summe(["freigegeben"]);
  const bestellt = summe(["bestellt"]);
  return {
    kr,
    geplant_cent: geplant,
    in_freigabe_cent: summe(["bei_teamleitung", "bei_gf"]),
    freigegeben_cent: freigegeben,
    bestellt_cent: bestellt,
    gebunden_cent: freigegeben + bestellt,
    verfuegbar_cent: geplant - freigegeben - bestellt,
    anzahl: anforderungen.filter((a) => ZAEHLT.includes(a.status)).length,
  };
}

/** Eine Zeile je Key Result (in der übergebenen Reihenfolge), am Ende „ohne Key Result“, falls es dazu etwas gibt */
export function auswertungJeKeyResult(
  keyResults: KeyResultInfo[],
  posten: PostenInfo[],
  anforderungen: AnforderungInfo[],
): KeyResultZeile[] {
  const zeilen = keyResults.map((kr) =>
    zeile(
      kr,
      posten.filter((p) => p.key_result_id === kr.id),
      anforderungen.filter((a) => a.key_result_id === kr.id),
    ),
  );
  const ohne = zeile(
    null,
    posten.filter((p) => !p.key_result_id),
    anforderungen.filter((a) => !a.key_result_id),
  );
  return ohne.geplant_cent || ohne.anzahl ? [...zeilen, ohne] : zeilen;
}

// ---------------------------------------------------------------------------
// CSV für Finanzen (Excel, deutsch: Semikolon, Dezimalkomma, UTF-8 mit BOM)
// ---------------------------------------------------------------------------

export type CsvAnforderung = {
  nr: string;
  titel: string;
  team: string;
  key_result: string;
  budgetposten: string;
  lieferant: string;
  status: string;
  betrag_cent: number;
  eingereicht_am: string;
  bestellt_am: string;
  bestellnummer: string;
};

const SPALTEN: [keyof CsvAnforderung, string][] = [
  ["key_result", "Key Result"],
  ["team", "Team"],
  ["nr", "Nr."],
  ["titel", "Titel"],
  ["lieferant", "Lieferant"],
  ["budgetposten", "Budgetposten"],
  ["status", "Status"],
  ["betrag_cent", "Betrag brutto (EUR)"],
  ["eingereicht_am", "Eingereicht am"],
  ["bestellt_am", "Bestellt am"],
  ["bestellnummer", "Bestellnummer"],
];

/** 123456 → "1234,56" (ohne Tausenderpunkt, damit Excel rechnen kann) */
export function centAlsCsv(cent: number): string {
  const vorzeichen = cent < 0 ? "-" : "";
  const betrag = Math.abs(cent);
  return `${vorzeichen}${Math.floor(betrag / 100)},${String(betrag % 100).padStart(2, "0")}`;
}

function feld(wert: string): string {
  // Anführungszeichen nur wenn nötig; führende =,+,-,@ entschärfen (Formel-Injection in Excel)
  const sicher = /^[=+\-@\t\r]/.test(wert) ? `'${wert}` : wert;
  return /[;"\n\r]/.test(sicher) ? `"${sicher.replace(/"/g, '""')}"` : sicher;
}

export function alsCsv(zeilen: CsvAnforderung[]): string {
  const kopf = SPALTEN.map(([, titel]) => titel).join(";");
  const daten = zeilen.map((z) =>
    SPALTEN.map(([schluessel]) => (schluessel === "betrag_cent" ? centAlsCsv(z.betrag_cent) : feld(String(z[schluessel])))).join(";"),
  );
  return "﻿" + [kopf, ...daten].join("\r\n") + "\r\n";
}
