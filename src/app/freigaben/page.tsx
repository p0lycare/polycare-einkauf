import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ladeIch } from "@/lib/einkauf/ich";
import { AnforderungsListe, LISTEN_SPALTEN, type ListenEintrag } from "../anforderungen/anforderungs-liste";

export default async function Freigaben() {
  const supabase = await createClient();
  const ich = await ladeIch(supabase);
  if (!ich) redirect("/login");
  const { data } = await supabase
    .from("anforderung")
    .select(LISTEN_SPALTEN)
    .in("status", ["bei_teamleitung", "bei_gf"])
    .eq("darf_freigeben", true)
    .order("eingereicht_am")
    .returns<ListenEintrag[]>();

  // Die GF darf auch bei der Teamleitung liegende Anforderungen freigeben – die stehen getrennt,
  // damit klar ist, was wirklich auf sie wartet
  const wartet = (data ?? []).filter((a) => a.status === "bei_gf" || ich.leitet.includes(a.team_id));
  const vertretbar = (data ?? []).filter((a) => !wartet.includes(a));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Freigaben</h1>
      <section className="flex flex-col gap-2">
        {vertretbar.length > 0 && <h2 className="font-medium">Wartet auf dich</h2>}
        <AnforderungsListe eintraege={wartet} leerText="Nichts zu tun – keine Anforderungen warten auf deine Freigabe." />
      </section>
      {vertretbar.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Noch bei der Teamleitung</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Diese Anforderungen warten auf die jeweilige Teamleitung. Als Geschäftsführung kannst du vertreten, zum Beispiel
            bei Abwesenheit – die Teamleitung wird dann übersprungen.
          </p>
          <AnforderungsListe eintraege={vertretbar} leerText="" />
        </section>
      )}
    </main>
  );
}
