import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ladeIch, plant } from "@/lib/einkauf/ich";
import { formatDatum, formatEuro } from "@/lib/format";
import { karte } from "@/lib/stil";
import { KeyResultZeile, PeriodeKopieren, PeriodeZeile, PostenZeile } from "./formulare";

export default async function Planung({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { periode: gewuenscht } = await searchParams;
  const supabase = await createClient();
  const ich = await ladeIch(supabase);
  if (!ich || !plant(ich)) redirect("/");
  const finanzen = ich.ist_finanzen || ich.ist_admin;

  const [{ data: perioden }, { data: teams }] = await Promise.all([
    supabase.from("periode").select("id, name, beginn, ende, status").order("beginn", { ascending: false }),
    supabase.from("team").select("id, name").order("name"),
  ]);
  const periode =
    perioden?.find((p) => p.id === gewuenscht) ??
    perioden?.find((p) => p.status === "planung") ??
    perioden?.find((p) => p.status === "aktiv") ??
    perioden?.[0];

  const [{ data: keyResults }, { data: posten }] = periode
    ? await Promise.all([
        supabase.from("key_result").select("id, kuerzel, titel, team_id").eq("periode_id", periode.id).order("kuerzel"),
        supabase.from("budgetposten").select("id, team_id, name, geplant_cent, key_result_id").eq("periode_id", periode.id).order("name"),
      ])
    : [{ data: [] }, { data: [] }];

  // Finanzen/Admin planen alle Teams; Teamleitungen nur ihre eigenen und nur während der Planung
  const planbareTeams = (teams ?? []).filter(
    (t) => finanzen || (ich.leitet.includes(t.id) && periode?.status === "planung"),
  );
  const sichtbareTeams = (teams ?? []).filter((t) => finanzen || ich.leitet.includes(t.id));
  // Vorlagen für eine Periode in Planung: alle früheren Perioden, die jüngste zuerst
  const vorperioden =
    finanzen && periode?.status === "planung" ? (perioden ?? []).filter((p) => p.beginn < periode.beginn) : [];

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-6 font-sans">
      <h1 className="text-xl font-semibold">Planung</h1>

      <section className={karte}>
        <h2 className="font-medium">Perioden</h2>
        <p className="mt-1 text-sm text-neutral-500">
          In Planung: Teamleitungen pflegen ihr Budget. Aktiv: Anforderungen sind möglich. Abgeschlossen: Restbudget verfällt.
        </p>
        {finanzen ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {(perioden ?? []).map((p) => (
              <PeriodeZeile key={p.id} periode={p} />
            ))}
            <PeriodeZeile />
          </div>
        ) : (
          <ul className="mt-2 text-sm">
            {(perioden ?? []).map((p) => (
              <li key={p.id}>
                {p.name}: {formatDatum(p.beginn)} – {formatDatum(p.ende)} ({p.status})
              </li>
            ))}
          </ul>
        )}
      </section>

      {periode && (
        <>
          {perioden && perioden.length > 1 && (
            <nav className="-mb-4 flex flex-wrap gap-2 text-sm">
              {perioden.map((p) => (
                <Link
                  key={p.id}
                  href={`/planung?periode=${p.id}`}
                  className={`rounded-md px-2 py-1 ${p.id === periode.id ? "bg-primaer text-white dark:text-neutral-950" : "text-neutral-600 hover:underline dark:text-neutral-400"}`}
                >
                  {p.name}
                </Link>
              ))}
            </nav>
          )}

          {vorperioden.length > 0 && (
            <section className={karte}>
              <h2 className="font-medium">Vorperiode kopieren</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Übernimmt Key Results und Budgetposten mit ihren Beträgen als Vorlage. Schon vorhandene Einträge bleiben
                unverändert, doppelt kopieren schadet nicht.
              </p>
              <PeriodeKopieren ziel={periode} vorperioden={vorperioden} />
            </section>
          )}

          <section className={karte}>
            <h2 className="font-medium">Key Results {periode.name}</h2>
            {finanzen ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {(keyResults ?? []).map((k) => (
                  <KeyResultZeile key={k.id} kr={k} periodeId={periode.id} teams={teams ?? []} />
                ))}
                <KeyResultZeile periodeId={periode.id} teams={teams ?? []} />
              </div>
            ) : (
              <ul className="mt-2 text-sm">
                {(keyResults ?? []).map((k) => (
                  <li key={k.id}>
                    <strong>{k.kuerzel}</strong> {k.titel}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {sichtbareTeams.map((t) => {
            const teamPosten = (posten ?? []).filter((p) => p.team_id === t.id);
            const krs = (keyResults ?? []).filter((k) => !k.team_id || k.team_id === t.id);
            const summe = teamPosten.reduce((s, p) => s + p.geplant_cent, 0);
            const bearbeitbar = planbareTeams.some((pt) => pt.id === t.id);
            return (
              <section key={t.id} className={karte}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-medium">Budget {t.name}</h2>
                  <span className="tabular-nums text-sm text-neutral-600 dark:text-neutral-400">Summe {formatEuro(summe)}</span>
                </div>
                {bearbeitbar ? (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                    {teamPosten.map((p) => (
                      <PostenZeile key={p.id} posten={p} periodeId={periode.id} teamId={t.id} keyResults={krs} />
                    ))}
                    <PostenZeile periodeId={periode.id} teamId={t.id} keyResults={krs} />
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-neutral-500">Die Periode ist nicht mehr in Planung – Änderungen nur durch Finanzen.</p>
                    <ul className="mt-2 text-sm">
                      {teamPosten.map((p) => (
                        <li key={p.id} className="flex justify-between">
                          <span>{p.name}</span>
                          <span className="tabular-nums">{formatEuro(p.geplant_cent)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
