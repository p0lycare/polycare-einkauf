import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ladeIch } from "@/lib/einkauf/ich";
import { karte } from "@/lib/stil";
import { EinstellungenFormular, PersonZeile, TeamZeile } from "./formulare";

export default async function Verwaltung() {
  const supabase = await createClient();
  const ich = await ladeIch(supabase);
  if (!ich?.ist_admin) redirect("/");

  const [{ data: personen }, { data: teams }, { data: einstellungen }] = await Promise.all([
    supabase.from("profile").select("id, name, email, team_id, ist_gf, ist_einkauf, ist_finanzen, ist_admin").order("name"),
    supabase.from("team").select("id, name, leitung_id").order("name"),
    supabase.from("einstellungen").select("gf_grenze_cent").single(),
  ]);
  const auswahl = (personen ?? []).map((p) => ({ id: p.id, name: p.name }));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-6 font-sans">
      <h1 className="text-xl font-semibold">Verwaltung</h1>

      <section className={karte}>
        <h2 className="font-medium">Teams und Teamleitungen</h2>
        <p className="mt-1 text-sm text-neutral-500">Die Teamleitung gibt Anforderungen ihres Teams frei und plant dessen Budget.</p>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
          {(teams ?? []).map((t) => (
            <TeamZeile key={t.id} team={t} personen={auswahl} />
          ))}
          <TeamZeile personen={auswahl} />
        </div>
      </section>

      <section className={karte}>
        <h2 className="font-medium">Personen</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Personen erscheinen hier nach ihrer ersten Anmeldung. GF gibt über der Grenze und außerplanmäßig frei, Einkauf
          bestellt, Finanzen plant Perioden und Budgets aller Teams.
        </p>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
          {(personen ?? []).map((p) => (
            <PersonZeile key={p.id} person={p} teams={teams ?? []} />
          ))}
        </div>
      </section>

      <section className={karte}>
        <h2 className="mb-3 font-medium">Freigabegrenze</h2>
        <EinstellungenFormular gfGrenzeCent={einstellungen?.gf_grenze_cent ?? 100000} />
      </section>
    </main>
  );
}
