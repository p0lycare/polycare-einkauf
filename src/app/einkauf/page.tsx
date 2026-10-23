import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ladeIch } from "@/lib/einkauf/ich";
import { AnforderungsListe, LISTEN_SPALTEN, type ListenEintrag } from "../anforderungen/anforderungs-liste";

export default async function Einkauf() {
  const supabase = await createClient();
  const ich = await ladeIch(supabase);
  if (!ich?.ist_einkauf) redirect("/");

  const [{ data: offen }, { data: bestellt }] = await Promise.all([
    supabase
      .from("anforderung")
      .select(LISTEN_SPALTEN)
      .eq("status", "freigegeben")
      .order("eingereicht_am")
      .returns<ListenEintrag[]>(),
    supabase
      .from("anforderung")
      .select(LISTEN_SPALTEN)
      .eq("status", "bestellt")
      .order("bestellt_am", { ascending: false })
      .limit(20)
      .returns<ListenEintrag[]>(),
  ]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Einkauf</h1>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Zu bestellen</h2>
        <AnforderungsListe eintraege={offen ?? []} leerText="Keine freigegebenen Anforderungen offen." />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Zuletzt bestellt</h2>
        <AnforderungsListe eintraege={bestellt ?? []} leerText="Noch nichts bestellt." />
      </section>
    </main>
  );
}
