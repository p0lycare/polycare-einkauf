import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Ich = Database["public"]["Tables"]["profile"]["Row"] & {
  /** Teams, die ich leite */
  leitet: string[];
};

/** Profil der angemeldeten Person samt geleiteter Teams; null, wenn nicht angemeldet. */
export async function ladeIch(supabase: SupabaseClient<Database>): Promise<Ich | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profil }, { data: teams }] = await Promise.all([
    supabase.from("profile").select("*").eq("id", user.id).single(),
    supabase.from("team").select("id").eq("leitung_id", user.id),
  ]);
  if (!profil) return null;
  return { ...profil, leitet: (teams ?? []).map((t) => t.id) };
}

export function gibtFrei(ich: Ich): boolean {
  return ich.ist_gf || ich.leitet.length > 0;
}

export function plant(ich: Ich): boolean {
  return ich.ist_finanzen || ich.ist_admin || ich.leitet.length > 0;
}

export function sichtAufAlleTeams(ich: Ich): boolean {
  return ich.ist_gf || ich.ist_einkauf || ich.ist_finanzen || ich.ist_admin;
}
