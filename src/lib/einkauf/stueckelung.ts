/**
 * Hinweis auf gestückelte Anforderungen: mehrere Anforderungen eines Teams beim selben Lieferanten,
 * jede für sich bis zur Freigabegrenze, zusammen innerhalb kurzer Zeit aber darüber.
 * Nur ein Hinweis für Freigebende – entschieden wird wie immer im Workflow.
 */

export type StueckelungsKandidat = {
  id: string;
  nr: number;
  titel: string;
  team_id: string;
  lieferant: string | null;
  betrag_cent: number;
  eingereicht_am: string | null;
  created_at: string;
};

/** Zeitraum, in dem Anforderungen zusammen betrachtet werden */
export const STUECKELUNG_FENSTER_TAGE = 30;

const RECHTSFORMEN = /\b(gmbh|mbh|ag|kg|ohg|ug|se|co|ek|e\s?k|ltd|inc|haftungsbeschränkt)\b/g;

/** "Müller GmbH & Co. KG" und "müller gmbh" → "müller" */
export function normalisiereLieferant(name: string | null): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/[.,&+()/'"-]/g, " ")
    .replace(RECHTSFORMEN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function zeitpunkt(k: StueckelungsKandidat): number {
  return new Date(k.eingereicht_am ?? k.created_at).getTime();
}

const TAG_MS = 86_400_000;

/**
 * Andere Anforderungen, mit denen `a` zusammen die Grenze überschreitet; null, wenn kein Hinweis nötig.
 * `andere` darf beliebige Anforderungen enthalten – gefiltert wird hier.
 */
export function stueckelungZu(
  a: StueckelungsKandidat,
  andere: StueckelungsKandidat[],
  grenzeCent: number,
): { treffer: StueckelungsKandidat[]; summeCent: number } | null {
  const lieferant = normalisiereLieferant(a.lieferant);
  if (!lieferant || a.betrag_cent > grenzeCent) return null;

  const fenster = STUECKELUNG_FENSTER_TAGE * TAG_MS;
  const kandidaten = andere.filter(
    (k) =>
      k.id !== a.id &&
      k.team_id === a.team_id &&
      k.betrag_cent <= grenzeCent &&
      normalisiereLieferant(k.lieferant) === lieferant &&
      Math.abs(zeitpunkt(k) - zeitpunkt(a)) <= fenster,
  );

  // Wie in der Übersicht: alle Anforderungen müssen in EIN 30-Tage-Fenster passen (das auch `a` enthält);
  // genommen wird das Fenster mit der höchsten Summe
  const alle = [a, ...kandidaten].sort((x, y) => zeitpunkt(x) - zeitpunkt(y));
  let treffer: StueckelungsKandidat[] = [];
  let summeCent = 0;
  for (const start of alle) {
    if (zeitpunkt(start) > zeitpunkt(a) || zeitpunkt(a) - zeitpunkt(start) > fenster) continue;
    const imFenster = alle.filter((k) => zeitpunkt(k) >= zeitpunkt(start) && zeitpunkt(k) - zeitpunkt(start) <= fenster);
    const summe = imFenster.reduce((s, k) => s + k.betrag_cent, 0);
    if (summe > summeCent) [treffer, summeCent] = [imFenster.filter((k) => k.id !== a.id), summe];
  }
  if (!treffer.length || summeCent <= grenzeCent) return null;
  return { treffer, summeCent };
}

/**
 * Alle auffälligen Gruppen (Team + Lieferant) für die Übersicht. Je Gruppe das Zeitfenster mit der
 * höchsten Summe; nur Gruppen mit mindestens zwei Anforderungen und Summe über der Grenze.
 */
export function stueckelungsGruppen(
  anforderungen: StueckelungsKandidat[],
  grenzeCent: number,
): { lieferant: string; team_id: string; anforderungen: StueckelungsKandidat[]; summeCent: number }[] {
  const gruppen = new Map<string, StueckelungsKandidat[]>();
  for (const k of anforderungen) {
    const lieferant = normalisiereLieferant(k.lieferant);
    if (!lieferant || k.betrag_cent > grenzeCent) continue;
    const schluessel = `${k.team_id}|${lieferant}`;
    gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), k]);
  }

  const ergebnis = [];
  for (const liste of gruppen.values()) {
    const sortiert = [...liste].sort((x, y) => zeitpunkt(x) - zeitpunkt(y));
    let beste: StueckelungsKandidat[] = [];
    let besteSumme = 0;
    for (let i = 0; i < sortiert.length; i++) {
      const fenster = sortiert.filter(
        (k) => zeitpunkt(k) >= zeitpunkt(sortiert[i]) && zeitpunkt(k) - zeitpunkt(sortiert[i]) <= STUECKELUNG_FENSTER_TAGE * TAG_MS,
      );
      const summe = fenster.reduce((s, k) => s + k.betrag_cent, 0);
      if (summe > besteSumme) [beste, besteSumme] = [fenster, summe];
    }
    if (beste.length >= 2 && besteSumme > grenzeCent) {
      // Anzeigename wie bei der ersten Anforderung erfasst
      ergebnis.push({ lieferant: beste[0].lieferant ?? "", team_id: beste[0].team_id, anforderungen: beste, summeCent: besteSumme });
    }
  }
  return ergebnis.sort((x, y) => y.summeCent - x.summeCent);
}
