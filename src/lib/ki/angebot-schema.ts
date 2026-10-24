import { z } from "zod";

export const angebotSchema = z.object({
  ist_angebot: z.boolean().describe("false, wenn das Dokument kein Angebot, keine Rechnung und kein Warenkorb/Produktblatt ist"),
  lieferant: z.string().nullable().describe("Name des Anbieters bzw. Händlers"),
  titel: z.string().nullable().describe("kurz, was bestellt werden soll, z. B. 'Präzisionswaage Sartorius Quintix 125D'"),
  beschreibung: z
    .string()
    .nullable()
    .describe("Positionen je Zeile mit Menge, Artikelnummer und Einzelpreis; Lieferzeit und Versandkosten, falls angegeben"),
  betrag_brutto: z.number().nullable().describe("Gesamtbetrag brutto inkl. MwSt. und Versand in der Angebotswährung"),
  waehrung: z.string().describe("ISO-Währungscode, meist EUR"),
  angebotsnummer: z.string().nullable(),
  gueltig_bis: z.string().nullable().describe("Gültigkeit des Angebots im Format YYYY-MM-DD"),
  link: z.string().nullable().describe("Produkt- oder Shop-Link, nur wenn im Dokument angegeben"),
  hinweis: z.string().nullable().describe("kurzer Hinweis bei Unklarheiten, sonst null"),
});

export type AngebotRoh = z.infer<typeof angebotSchema>;

export const ANWEISUNG = `Du liest Angebote, Warenkörbe und Produktblätter für die interne Bestellanforderung eines deutschen Technologieunternehmens aus.

Regeln:
- Der Betrag ist immer brutto (inkl. MwSt.) und enthält Versand- und Nebenkosten. Weist das Angebot nur Netto aus, rechne mit dem ausgewiesenen Steuersatz hoch, sonst mit 19 %, und sag das im Hinweis.
- Lies Beträge vom Dokument ab; rate nicht. Unleserliches oder Widersprüchliches gehört in den Hinweis.
- Bei mehreren Alternativen oder optionalen Positionen nimm das Hauptangebot und erwähne die Optionen im Hinweis.
- Titel kurz und konkret, ohne Lieferantennamen. Beschreibung sachlich, eine Position je Zeile.
- Andere Währung als EUR: Betrag in der Angebotswährung angeben und im Hinweis darauf hinweisen.`;

/** Rohwerte der KI → Vorschlag fürs Formular (Cent, nur plausible Werte) */
export function alsVorschlag(r: AngebotRoh) {
  const link = r.link && /^https?:\/\//i.test(r.link) ? r.link : null;
  return {
    istAngebot: r.ist_angebot,
    lieferant: r.lieferant,
    titel: r.titel,
    beschreibung: [r.beschreibung, r.angebotsnummer && `Angebotsnummer: ${r.angebotsnummer}`, r.gueltig_bis && `Gültig bis: ${r.gueltig_bis}`]
      .filter(Boolean)
      .join("\n") || null,
    betragCent: r.betrag_brutto && r.betrag_brutto > 0 && r.waehrung === "EUR" ? Math.round(r.betrag_brutto * 100) : null,
    waehrung: r.waehrung,
    link,
    hinweis: r.hinweis,
  };
}

export type AngebotVorschlag = ReturnType<typeof alsVorschlag>;
