const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatEuro(cent: number): string {
  return euro.format(cent / 100);
}

const DATUM_BERLIN = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * "2026-10-23" → "23.10.2026". Zeitstempel mit Zeitzone (aus der Datenbank, in UTC) werden in deutscher
 * Zeit gezeigt – sonst rutscht eine Bestellung um 1:30 Uhr auf den Vortag.
 */
export function formatDatum(wert: string): string {
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(wert.slice(10))) return DATUM_BERLIN.format(new Date(wert));
  const [j, m, t] = wert.slice(0, 10).split("-");
  return `${t}.${m}.${j}`;
}

/** "2026-10-23T07:30" → "23.10.2026, 07:30" */
export function formatDatumZeit(wert: string): string {
  return `${formatDatum(wert)}, ${wert.slice(11, 16)}`;
}

/** Postgres-Timestamp "2026-10-23T07:30:00" → Wert für <input type="datetime-local"> */
export function alsLokal(wert: string): string {
  return wert.slice(0, 16);
}

const WOCHENTAG = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function wochentag(datum: string): string {
  const [j, m, t] = datum.split("-").map(Number);
  return WOCHENTAG[new Date(Date.UTC(j, m - 1, t)).getUTCDay()];
}
