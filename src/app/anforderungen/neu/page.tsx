import { createClient } from "@/lib/supabase/server";
import { ladeIch } from "@/lib/einkauf/ich";
import { kiVerfuegbar } from "@/lib/ki/angebot-auslesen";
import { AnforderungFormular } from "../anforderung-formular";
import { ladeFormularDaten } from "../formular-daten";

export default async function NeueAnforderung() {
  const supabase = await createClient();
  const [ich, daten] = await Promise.all([ladeIch(supabase), ladeFormularDaten(supabase)]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Neue Anforderung</h1>
      <AnforderungFormular daten={daten} ichId={ich!.id} eigenesTeam={ich!.team_id} kiAktiv={kiVerfuegbar()} />
    </main>
  );
}
