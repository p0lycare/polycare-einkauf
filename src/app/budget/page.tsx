import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/format";
import { leer } from "@/lib/stil";

type Zeile = {
  team_id: string;
  budgetposten_id: string | null;
  name: string;
  key_result_id: string | null;
  geplant_cent: number;
  in_freigabe_cent: number;
  gebunden_cent: number;
  verfuegbar_cent: number;
};

/** Auslastung eines Postens: gebunden (voll) und in Freigabe (hell), Überschreitung als Hinweis */
function Balken({ z }: { z: Zeile }) {
  const basis = Math.max(z.geplant_cent, z.gebunden_cent + z.in_freigabe_cent, 1);
  const gebunden = (z.gebunden_cent / basis) * 100;
  const freigabe = (z.in_freigabe_cent / basis) * 100;
  return (
    <div
      className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
      role="img"
      aria-label={`${formatEuro(z.gebunden_cent)} gebunden, ${formatEuro(z.in_freigabe_cent)} in Freigabe von ${formatEuro(z.geplant_cent)}`}
    >
      {gebunden > 0 && <div className="rounded-full bg-sky-700 dark:bg-sky-400" style={{ width: `${gebunden}%` }} />}
      {freigabe > 0 && <div className="rounded-full bg-sky-300 dark:bg-sky-700" style={{ width: `${freigabe}%` }} />}
    </div>
  );
}

function Betrag({ cent, negativWarnung }: { cent: number; negativWarnung?: boolean }) {
  const warnung = negativWarnung && cent < 0;
  return (
    <td className={`px-2 py-2 text-right tabular-nums ${warnung ? "font-medium text-red-700 dark:text-red-400" : ""}`}>
      {formatEuro(cent)}
    </td>
  );
}

export default async function Budget({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { periode: gewuenscht } = await searchParams;
  const supabase = await createClient();
  const [{ data: perioden }, { data: teams }, { data: keyResults }] = await Promise.all([
    supabase.from("periode").select("id, name, status").order("beginn", { ascending: false }),
    supabase.from("team").select("id, name").order("name"),
    supabase.from("key_result").select("id, kuerzel"),
  ]);

  const periode =
    perioden?.find((p) => p.id === gewuenscht) ?? perioden?.find((p) => p.status === "aktiv") ?? perioden?.[0];
  const { data: zeilen } = periode ? await supabase.rpc("budget_stand", { p_periode: periode.id }) : { data: [] };
  const kr = new Map((keyResults ?? []).map((k) => [k.id, k.kuerzel]));

  const nachTeam = (teams ?? [])
    .map((t) => ({ team: t, zeilen: (zeilen ?? []).filter((z) => z.team_id === t.id) as Zeile[] }))
    .filter((g) => g.zeilen.length);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Budget {periode?.name}</h1>
        {perioden && perioden.length > 1 && (
          <nav className="flex flex-wrap gap-2 text-sm">
            {perioden.map((p) => (
              <Link
                key={p.id}
                href={`/budget?periode=${p.id}`}
                className={`rounded-md px-2 py-1 ${p.id === periode?.id ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:underline dark:text-neutral-400"}`}
              >
                {p.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-sky-700 dark:bg-sky-400" /> gebunden (freigegeben oder bestellt)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-sky-300 dark:bg-sky-700" /> in Freigabe</span>
        <span>Verfügbar = geplant − gebunden. Alle Beträge brutto.</span>
      </p>

      {!nachTeam.length && <p className={leer}>Für diese Periode ist noch kein Budget sichtbar.</p>}

      {nachTeam.map(({ team, zeilen }) => {
        const summe = (feld: keyof Pick<Zeile, "geplant_cent" | "in_freigabe_cent" | "gebunden_cent" | "verfuegbar_cent">) =>
          zeilen.reduce((s, z) => s + z[feld], 0);
        return (
          <section key={team.id} className="overflow-x-auto">
            <h2 className="mb-2 font-medium">{team.name}</h2>
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs text-neutral-500">
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2 pr-2 font-normal">Budgetposten</th>
                  <th className="w-40 px-2 font-normal" />
                  <th className="px-2 text-right font-normal">Geplant</th>
                  <th className="px-2 text-right font-normal">In Freigabe</th>
                  <th className="px-2 text-right font-normal">Gebunden</th>
                  <th className="px-2 text-right font-normal">Verfügbar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {zeilen.map((z) => (
                  <tr key={z.budgetposten_id ?? "ausserplan"}>
                    <td className="py-2 pr-2">
                      <span className={z.budgetposten_id ? "" : "italic text-neutral-500"}>{z.name}</span>
                      {z.key_result_id && (
                        <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{kr.get(z.key_result_id)}</span>
                      )}
                    </td>
                    <td className="px-2">{z.budgetposten_id && <Balken z={z} />}</td>
                    <Betrag cent={z.geplant_cent} />
                    <Betrag cent={z.in_freigabe_cent} />
                    <Betrag cent={z.gebunden_cent} />
                    <Betrag cent={z.verfuegbar_cent} negativWarnung />
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-300 font-medium dark:border-neutral-700">
                <tr>
                  <td className="py-2 pr-2">Summe</td>
                  <td />
                  <Betrag cent={summe("geplant_cent")} />
                  <Betrag cent={summe("in_freigabe_cent")} />
                  <Betrag cent={summe("gebunden_cent")} />
                  <Betrag cent={summe("verfuegbar_cent")} negativWarnung />
                </tr>
              </tfoot>
            </table>
          </section>
        );
      })}
    </main>
  );
}
