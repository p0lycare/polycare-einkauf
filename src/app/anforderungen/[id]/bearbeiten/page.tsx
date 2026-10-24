import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ladeIch } from "@/lib/einkauf/ich";
import { kiVerfuegbar } from "@/lib/ki/angebot-auslesen";
import { AnforderungFormular } from "../../anforderung-formular";
import { ladeFormularDaten } from "../../formular-daten";

export default async function AnforderungBearbeiten({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [ich, daten, { data: a }, { data: dateien }] = await Promise.all([
    ladeIch(supabase),
    ladeFormularDaten(supabase),
    supabase.from("anforderung").select("*").eq("id", id).maybeSingle(),
    supabase.from("anforderung_datei").select("id, name").eq("anforderung_id", id).order("created_at"),
  ]);
  if (!a) notFound();
  if (a.ersteller_id !== ich!.id || !["entwurf", "abgelehnt"].includes(a.status)) redirect(`/anforderungen/${id}`);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Anforderung bearbeiten</h1>
      <AnforderungFormular
        daten={daten}
        ichId={ich!.id}
        eigenesTeam={ich!.team_id}
        werte={a}
        kiAktiv={kiVerfuegbar()}
        dateien={dateien ?? []}
      />
    </main>
  );
}
