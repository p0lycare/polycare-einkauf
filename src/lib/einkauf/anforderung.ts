import type { Database } from "@/lib/supabase/database.types";

export type AnforderungStatus = Database["public"]["Enums"]["anforderung_status"];

export const STATUS_TEXT: Record<AnforderungStatus, string> = {
  entwurf: "Entwurf",
  bei_teamleitung: "Bei Teamleitung",
  bei_gf: "Bei Geschäftsführung",
  freigegeben: "Freigegeben",
  bestellt: "Bestellt",
  abgelehnt: "Abgelehnt",
};

/** Laufende Nummer → "BA-0042" */
export function formatNr(nr: number): string {
  return `BA-${String(nr).padStart(4, "0")}`;
}

export type Freigabestufe = "teamleitung" | "gf";

/**
 * Welche Freigaben eine Anforderung voraussichtlich braucht – für den Hinweis im Formular.
 * Spiegelt anforderung_einreichen/anforderung_freigeben in der Datenbank; dort fällt die Entscheidung.
 *
 * @param verfuegbarCent noch verfügbares Budget des gewählten Postens, null = kein Budgetposten
 */
export function freigabeweg(opts: {
  betragCent: number;
  verfuegbarCent: number | null;
  gfGrenzeCent: number;
  teamHatLeitung: boolean;
  ichLeiteTeam: boolean;
}): { stufen: Freigabestufe[]; ausserplanmaessig: boolean } {
  const ausserplanmaessig = opts.verfuegbarCent === null || opts.betragCent > opts.verfuegbarCent;
  const brauchtGf = ausserplanmaessig || opts.betragCent > opts.gfGrenzeCent;

  if (!opts.teamHatLeitung || opts.ichLeiteTeam) return { stufen: ["gf"], ausserplanmaessig };
  return { stufen: brauchtGf ? ["teamleitung", "gf"] : ["teamleitung"], ausserplanmaessig };
}
