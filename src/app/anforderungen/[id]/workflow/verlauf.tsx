import { createClient } from "@/lib/supabase/server";

const AKTION_TEXT: Record<string, string> = {
  eingereicht: "Eingereicht",
  zurueckgezogen: "Zurückgezogen",
  freigegeben: "Freigegeben",
  abgelehnt: "Abgelehnt",
  bestellt: "Bestellt",
};

const zeitFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

export async function Verlauf({ anforderungId }: { anforderungId: string }) {
  const supabase = await createClient();
  const { data: ereignisse } = await supabase
    .from("anforderung_ereignis")
    .select("id, zeit, aktion, kommentar, person:profile(name)")
    .eq("anforderung_id", anforderungId)
    .order("zeit");

  if (!ereignisse?.length) return null;

  return (
    <section>
      <h2 className="mb-2 font-medium">Verlauf</h2>
      <ol className="flex flex-col gap-2 border-l border-neutral-200 pl-4 text-sm dark:border-neutral-800">
        {ereignisse.map((e) => (
          <li key={e.id}>
            <span className="font-medium">{AKTION_TEXT[e.aktion] ?? e.aktion}</span> · {e.person?.name} ·{" "}
            <span className="text-neutral-500">{zeitFormat.format(new Date(e.zeit))}</span>
            {e.kommentar && <p className="text-neutral-600 dark:text-neutral-400">„{e.kommentar}“</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
