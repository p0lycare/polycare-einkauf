import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FormularDaten } from "./anforderung-formular";

/** Auswahllisten für das Anforderungsformular: aktive Perioden, Teams, sichtbare Budgetposten mit Stand */
export async function ladeFormularDaten(supabase: SupabaseClient<Database>): Promise<FormularDaten> {
  const [{ data: perioden }, { data: teams }, { data: keyResults }, { data: einstellungen }] = await Promise.all([
    supabase.from("periode").select("id, name").eq("status", "aktiv").order("beginn"),
    supabase.from("team").select("id, name, leitung_id, nur_mitglieder").order("name"),
    supabase.from("key_result").select("id, periode_id, team_id, kuerzel, titel").order("kuerzel"),
    supabase.from("einstellungen").select("gf_grenze_cent").single(),
  ]);

  const staende = await Promise.all(
    (perioden ?? []).map(async (p) => {
      const { data } = await supabase.rpc("budget_stand", { p_periode: p.id });
      return (data ?? [])
        .filter((z) => z.budgetposten_id)
        .map((z) => ({
          id: z.budgetposten_id!,
          periode_id: p.id,
          team_id: z.team_id,
          name: z.name,
          key_result_id: z.key_result_id,
          verfuegbar_cent: z.verfuegbar_cent,
        }));
    }),
  );

  return {
    perioden: perioden ?? [],
    teams: teams ?? [],
    posten: staende.flat(),
    keyResults: keyResults ?? [],
    gfGrenzeCent: einstellungen?.gf_grenze_cent ?? 100000,
  };
}
