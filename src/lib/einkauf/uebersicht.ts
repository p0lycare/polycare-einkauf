/** Berechnungen für die Übersicht der Geschäftsführung (alle Teams einer Periode). */

export type BudgetZeile = {
  team_id: string;
  budgetposten_id: string | null;
  geplant_cent: number;
  in_freigabe_cent: number;
  gebunden_cent: number;
  verfuegbar_cent: number;
};

export type Summen = {
  geplant_cent: number;
  in_freigabe_cent: number;
  gebunden_cent: number;
  verfuegbar_cent: number;
  /** davon ohne Budgetposten freigegeben oder bestellt */
  ausserplan_cent: number;
};

const LEER: Summen = { geplant_cent: 0, in_freigabe_cent: 0, gebunden_cent: 0, verfuegbar_cent: 0, ausserplan_cent: 0 };

export function summiere(zeilen: BudgetZeile[]): Summen {
  return zeilen.reduce(
    (s, z) => ({
      geplant_cent: s.geplant_cent + z.geplant_cent,
      in_freigabe_cent: s.in_freigabe_cent + z.in_freigabe_cent,
      gebunden_cent: s.gebunden_cent + z.gebunden_cent,
      verfuegbar_cent: s.verfuegbar_cent + z.verfuegbar_cent,
      ausserplan_cent: s.ausserplan_cent + (z.budgetposten_id ? 0 : z.gebunden_cent),
    }),
    LEER,
  );
}

/** Summen je Team, in der Reihenfolge der übergebenen Teams; Teams ohne Zeilen fallen weg */
export function summenJeTeam<T extends { id: string }>(teams: T[], zeilen: BudgetZeile[]): { team: T; summen: Summen }[] {
  return teams
    .map((team) => ({ team, zeilen: zeilen.filter((z) => z.team_id === team.id) }))
    .filter((g) => g.zeilen.length)
    .map((g) => ({ team: g.team, summen: summiere(g.zeilen) }));
}

/** Anteil gebunden am geplanten Budget in Prozent, gerundet; null ohne Planung */
export function auslastung(s: Summen): number | null {
  if (s.geplant_cent <= 0) return null;
  return Math.round((s.gebunden_cent / s.geplant_cent) * 100);
}

/** Ganze Tage seit dem Einreichen, bezogen auf `jetzt` */
export function wartetTage(eingereichtAm: string, jetzt: Date): number {
  return Math.max(0, Math.floor((jetzt.getTime() - new Date(eingereichtAm).getTime()) / 86_400_000));
}

/** Ab so vielen Tagen Wartezeit wird eine offene Freigabe hervorgehoben */
export const LANGE_WARTEZEIT_TAGE = 3;
