import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ladeIch } from "@/lib/einkauf/ich";
import { formatEuro } from "@/lib/format";
import { einfuehrung, ROLLEN, rollenVon, type Einfuehrung } from "@/lib/hilfe/einfuehrung";
import { karte } from "@/lib/stil";

function Abschnitt({ e }: { e: Einfuehrung }) {
  return (
    <>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{e.kurz}</p>
      <ol className="mt-3 flex flex-col gap-3 text-sm">
        {e.schritte.map((s, i) => (
          <li key={s.titel} className="grid grid-cols-[1.5rem_1fr] gap-x-2">
            <span className="tabular-nums text-neutral-500">{i + 1}.</span>
            <span>
              <strong className="font-medium">{s.titel}</strong>
              <br />
              {s.text}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

const ROLLEN_NAME = {
  mitarbeitende: "Mitarbeitende",
  teamleitung: "Teamleitung",
  gf: "Geschäftsführung",
  einkauf: "Einkauf",
  finanzen: "Finanzen",
  admin: "Admin",
} as const;

export default async function Hilfe() {
  const supabase = await createClient();
  const ich = await ladeIch(supabase);
  if (!ich) redirect("/login");
  const { data: einstellungen } = await supabase.from("einstellungen").select("gf_grenze_cent").single();

  const texte = einfuehrung(formatEuro(einstellungen?.gf_grenze_cent ?? 100000));
  const meine = rollenVon(ich);
  const weitere = ROLLEN.filter((r) => !meine.includes(r));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 font-sans">
      <div>
        <h1 className="text-xl font-semibold">Einführung</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Deine Rollen: {meine.map((r) => ROLLEN_NAME[r]).join(", ")}.
          {!ich.team_id && " Du bist noch keinem Team zugeordnet – bitte melde dich bei der Verwaltung."}
        </p>
      </div>

      {meine.map((r) => (
        <section key={r} className={karte}>
          <h2 className="font-medium">{texte[r].titel}</h2>
          <Abschnitt e={texte[r]} />
        </section>
      ))}

      {weitere.length > 0 && (
        <section className={karte}>
          <h2 className="font-medium">Was die anderen machen</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Zum Nachlesen, wer im Ablauf wofür zuständig ist.</p>
          {weitere.map((r) => (
            <details key={r} className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-900">
              <summary className="cursor-pointer text-sm font-medium">{texte[r].titel}</summary>
              <Abschnitt e={texte[r]} />
            </details>
          ))}
        </section>
      )}
    </main>
  );
}
