import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ladeIch } from "@/lib/einkauf/ich";
import { karte } from "@/lib/stil";
import { mailKonfiguration } from "@/lib/mail/graph";
import { EinstellungenFormular, PersonZeile, TeamZeile } from "./formulare";
import { TestmailKnopf } from "./mail-bereich";

const zeitFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

const STATUS_TEXT = { gesendet: "gesendet", fehler: "Fehler", nicht_eingerichtet: "nicht eingerichtet" } as Record<string, string>;

export default async function Verwaltung() {
  const supabase = await createClient();
  const ich = await ladeIch(supabase);
  if (!ich?.ist_admin) redirect("/");

  const [{ data: personen }, { data: teams }, { data: einstellungen }, { data: mails }] = await Promise.all([
    supabase.from("profile").select("id, name, email, team_id, ist_gf, ist_einkauf, ist_finanzen, ist_admin").order("name"),
    supabase.from("team").select("id, name, leitung_id").order("name"),
    supabase.from("einstellungen").select("gf_grenze_cent").single(),
    supabase.from("mail_protokoll").select("id, zeit, anlass, an, betreff, status, fehler").order("zeit", { ascending: false }).limit(20),
  ]);
  const absender = mailKonfiguration()?.absender;
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

      <section className={karte}>
        <h2 className="font-medium">E-Mail-Benachrichtigungen</h2>
        <p className="mt-1 mb-3 text-sm text-neutral-500">
          {absender
            ? `Versand über Microsoft 365 aus dem Postfach ${absender}.`
            : "Noch nicht eingerichtet: In Vercel fehlen MAIL_TENANT_ID, MAIL_CLIENT_ID, MAIL_CLIENT_SECRET und MAIL_ABSENDER."}
        </p>
        <TestmailKnopf />
        {!!mails?.length && (
          <ul className="mt-4 divide-y divide-neutral-100 text-sm dark:divide-neutral-900">
            {mails.map((m) => (
              <li key={m.id} className="py-2">
                <span className="text-neutral-500">{zeitFormat.format(new Date(m.zeit))}</span> · {m.betreff} → {m.an.join(", ")} ·{" "}
                <span className={m.status === "gesendet" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                  {STATUS_TEXT[m.status] ?? m.status}
                </span>
                {m.fehler && <p className="text-xs text-red-700 dark:text-red-400">{m.fehler}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
