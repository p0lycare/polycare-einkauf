/**
 * OKR-Set aus dem OKR-Dashboard (GET /api/v1/zyklen/{kuerzel}) prüfen und mit dem Stand im Einkauf vergleichen.
 * Reine Logik ohne Netzwerk – der Abruf liegt in `abruf.ts`.
 */
import { z } from "zod";

const datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const okrSetSchema = z.object({
  zyklus: z.object({ kuerzel: z.string().regex(/^\d{2}Z[1-3]$/i), beginn: datum, ende: datum, status: z.string() }),
  version: z.object({ nummer: z.number().int().positive(), eingefroren_am: z.string(), begruendung: z.string().nullable() }),
  objective: z.string().nullable(),
  key_results: z.array(
    z.object({
      id: z.string().min(1),
      ebene: z.enum(["top", "team"]),
      kuerzel: z.string().nullable(),
      titel: z.string(),
      lead: z.string().nullable(),
      team: z.string().nullable(),
      top_kr: z.string().nullable().optional(),
      budget_vorschlag_cent: z.number().int().nonnegative().nullable(),
      budget_bemerkung: z.string().nullable(),
    }),
  ),
});

export type OkrSet = z.infer<typeof okrSetSchema>;
export type OkrKeyResult = OkrSet["key_results"][number];

/** Zyklus zu einem Datum: Z1 Januar–April, Z2 Mai–August, Z3 September–Dezember, z. B. 2026-10-28 → "26Z3" */
export function zyklusFuerDatum(d: Date): string {
  const nr = Math.floor(d.getMonth() / 4) + 1;
  return `${String(d.getFullYear()).slice(2)}Z${nr}`;
}

/** Was im Einkauf zu einem Zyklus schon übernommen ist */
export type Bestand = {
  version: number | null;
  keyResults: { okr_id: string | null; kuerzel: string; titel: string; team: string | null; okr_budget_vorschlag_cent: number | null; okr_entfallen: boolean }[];
};

export type Aenderung = { kuerzel: string; titel: string; team: string | null; was: string[] };

export type Vergleich = {
  zyklus: string;
  version: number;
  bisherigeVersion: number | null;
  neu: OkrKeyResult[];
  geaendert: Aenderung[];
  entfallen: { kuerzel: string; titel: string; team: string | null }[];
  unveraendert: number;
  unbekannteTeams: string[];
  /** Budget an Top-Level-KRs – wird nicht übernommen, nur zur Info */
  budgetAnTopKrs: { kuerzel: string; cent: number }[];
  budgetSummeCent: number;
};

const anzeigeKuerzel = (kr: OkrKeyResult) => kr.kuerzel?.trim() || `OKR ${kr.id.slice(0, 6)}`;

/** Unterschiede zwischen OKR-Set und Bestand, für die Vorschau vor der Übernahme */
export function vergleiche(set: OkrSet, bestand: Bestand, teamNamen: string[]): Vergleich {
  const teams = new Set(teamNamen.map((t) => t.toLowerCase()));
  const teamKrs = set.key_results.filter((k) => k.ebene === "team");
  const nachId = new Map(bestand.keyResults.filter((k) => k.okr_id).map((k) => [k.okr_id!, k]));
  const nachKuerzel = new Map(bestand.keyResults.filter((k) => !k.okr_id).map((k) => [k.kuerzel, k]));

  const neu: OkrKeyResult[] = [];
  const geaendert: Aenderung[] = [];
  let unveraendert = 0;
  for (const kr of teamKrs) {
    const alt = nachId.get(kr.id) ?? nachKuerzel.get(anzeigeKuerzel(kr));
    if (!alt) {
      neu.push(kr);
      continue;
    }
    const was: string[] = [];
    if (alt.kuerzel !== anzeigeKuerzel(kr)) was.push(`Kürzel ${alt.kuerzel} → ${anzeigeKuerzel(kr)}`);
    if (alt.titel !== kr.titel) was.push("Titel");
    if ((alt.team ?? "").toLowerCase() !== (kr.team ?? "").toLowerCase()) was.push(`Team ${alt.team ?? "–"} → ${kr.team ?? "–"}`);
    if (alt.okr_id && (alt.okr_budget_vorschlag_cent ?? null) !== (kr.budget_vorschlag_cent ?? null)) was.push("Budgetvorschlag");
    if (alt.okr_entfallen) was.push("wieder im OKR-Set");
    if (!alt.okr_id) was.push("wird mit dem OKR-Dashboard verknüpft");
    if (was.length) geaendert.push({ kuerzel: anzeigeKuerzel(kr), titel: kr.titel, team: kr.team, was });
    else unveraendert++;
  }

  const ids = new Set(teamKrs.map((k) => k.id));
  const entfallen = bestand.keyResults
    .filter((k) => k.okr_id && !k.okr_entfallen && !ids.has(k.okr_id))
    .map((k) => ({ kuerzel: k.kuerzel, titel: k.titel, team: k.team }));

  const unbekannteTeams = [...new Set(teamKrs.map((k) => k.team).filter((t): t is string => !!t && !teams.has(t.toLowerCase())))];

  return {
    zyklus: set.zyklus.kuerzel.toUpperCase(),
    version: set.version.nummer,
    bisherigeVersion: bestand.version,
    neu,
    geaendert,
    entfallen,
    unveraendert,
    unbekannteTeams,
    budgetAnTopKrs: set.key_results
      .filter((k) => k.ebene === "top" && (k.budget_vorschlag_cent ?? 0) > 0)
      .map((k) => ({ kuerzel: anzeigeKuerzel(k), cent: k.budget_vorschlag_cent! })),
    budgetSummeCent: teamKrs.reduce((s, k) => s + (k.budget_vorschlag_cent ?? 0), 0),
  };
}
