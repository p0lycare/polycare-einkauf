import { createClient } from "@/lib/supabase/server";
import { AnforderungsListe, LISTEN_SPALTEN, type ListenEintrag } from "../anforderungen/anforderungs-liste";

export default async function Freigaben() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("anforderung")
    .select(LISTEN_SPALTEN)
    .in("status", ["bei_teamleitung", "bei_gf"])
    .eq("darf_freigeben", true)
    .order("eingereicht_am")
    .returns<ListenEintrag[]>();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Freigaben</h1>
      <AnforderungsListe eintraege={data ?? []} leerText="Nichts zu tun – keine Anforderungen warten auf deine Freigabe." />
    </main>
  );
}
