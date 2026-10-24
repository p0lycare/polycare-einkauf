import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNr, STATUS_TEXT, type AnforderungStatus } from "@/lib/einkauf/anforderung";
import { ladeIch } from "@/lib/einkauf/ich";
import { auswertungJeKeyResult } from "@/lib/einkauf/key-results";
import { formatEuro } from "@/lib/format";
import { knopfKlein, leer } from "@/lib/stil";

type Anf = {
  id: string;
  nr: number;
  titel: string;
  key_result_id: string | null;
  betrag_cent: number;
  status: AnforderungStatus;
  team: { name: string } | null;
};

function Betrag({ cent, warnung, breit }: { cent: number; warnung?: boolean; breit?: boolean }) {
  return (
    <td
      className={`px-2 py-2 text-right tabular-nums ${breit ? "hidden sm:table-cell" : ""} ${warnung && cent < 0 ? "font-medium text-red-700 dark:text-red-400" : ""}`}
    >
      {formatEuro(cent)}
    </td>
  );
}

export default async function KeyResultAuswertung({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { periode: gewuenscht } = await searchParams;
  const supabase = await createClient();
  const ich = await ladeIch(supabase);
  if (!ich || !(ich.ist_gf || ich.ist_finanzen || ich.ist_admin)) redirect("/");

  const [{ data: perioden }, { data: teams }] = await Promise.all([
    supabase.from("periode").select("id, name, status").order("beginn", { ascending: false }),
    supabase.from("team").select("id, name"),
  ]);
  const periode =
    perioden?.find((p) => p.id === gewuenscht) ?? perioden?.find((p) => p.status === "aktiv") ?? perioden?.[0];

  const [{ data: keyResults }, { data: posten }, { data: anforderungen }] = periode
    ? await Promise.all([
        supabase.from("key_result").select("id, kuerzel, titel, team_id").eq("periode_id", periode.id).order("kuerzel"),
        supabase.from("budgetposten").select("key_result_id, geplant_cent").eq("periode_id", periode.id),
        supabase
          .from("anforderung")
          .select("id, nr, titel, key_result_id, betrag_cent, status, team(name)")
          .eq("periode_id", periode.id)
          .in("status", ["bei_teamleitung", "bei_gf", "freigegeben", "bestellt"])
          .order("nr")
          .returns<Anf[]>(),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const zeilen = auswertungJeKeyResult(keyResults ?? [], posten ?? [], anforderungen ?? []);
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 font-sans">
      <div>
        <Link href={`/uebersicht${periode ? `?periode=${periode.id}` : ""}`} className="text-sm text-neutral-500 hover:underline">
          ← Übersicht
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Key Results {periode?.name}</h1>
          {periode && (
            <a href={`/uebersicht/key-results/csv?periode=${periode.id}`} className={knopfKlein} download>
              Als CSV herunterladen
            </a>
          )}
        </div>
        {perioden && perioden.length > 1 && (
          <nav className="mt-3 flex flex-wrap gap-2 text-sm">
            {perioden.map((p) => (
              <Link
                key={p.id}
                href={`/uebersicht/key-results?periode=${p.id}`}
                className={`rounded-md px-2 py-1 ${p.id === periode?.id ? "bg-primaer text-white dark:text-neutral-950" : "text-neutral-600 hover:underline dark:text-neutral-400"}`}
              >
                {p.name}
              </Link>
            ))}
          </nav>
        )}
        <p className="mt-3 text-sm text-neutral-500">
          Geplant = Summe der Budgetposten mit diesem Key Result. Ausgaben nach dem Key Result der Anforderung. Gebunden =
          freigegeben oder bestellt. Alle Beträge brutto.
        </p>
      </div>

      {!zeilen.length ? (
        <p className={leer}>Für diese Periode gibt es noch keine Key Results.</p>
      ) : (
        <section className="overflow-x-auto">
          <table className="w-full text-sm sm:min-w-[40rem]">
            <thead className="text-left text-xs text-neutral-500">
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-2 font-normal">Key Result</th>
                <th className="hidden px-2 text-right font-normal sm:table-cell">Geplant</th>
                <th className="hidden px-2 text-right font-normal sm:table-cell">In Freigabe</th>
                <th className="px-2 text-right font-normal">Gebunden</th>
                <th className="hidden px-2 text-right font-normal sm:table-cell">davon bestellt</th>
                <th className="px-2 text-right font-normal">Verfügbar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {zeilen.map((z) => {
                const eigene = (anforderungen ?? []).filter((a) => a.key_result_id === (z.kr?.id ?? null));
                return (
                  <tr key={z.kr?.id ?? "ohne"} className="align-top">
                    <td className="py-2 pr-2">
                      {z.kr ? (
                        <>
                          <strong className="font-medium">{z.kr.kuerzel}</strong> {z.kr.titel}
                          <span className="block text-xs text-neutral-500">
                            {z.kr.team_id ? teamName.get(z.kr.team_id) : "teamübergreifend"}
                          </span>
                        </>
                      ) : (
                        <span className="italic text-neutral-500">ohne Key Result</span>
                      )}
                      {eigene.length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-neutral-500">
                            {z.anzahl} {z.anzahl === 1 ? "Anforderung" : "Anforderungen"}
                          </summary>
                          <ul className="mt-1 text-xs">
                            {eigene.map((a) => (
                              <li key={a.id}>
                                <Link href={`/anforderungen/${a.id}`} className="hover:underline">
                                  {formatNr(a.nr)} {a.titel}
                                </Link>{" "}
                                · {a.team?.name} · {formatEuro(a.betrag_cent)} · {STATUS_TEXT[a.status]}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <Betrag cent={z.geplant_cent} breit />
                    <Betrag cent={z.in_freigabe_cent} breit />
                    <Betrag cent={z.gebunden_cent} />
                    <Betrag cent={z.bestellt_cent} breit />
                    <Betrag cent={z.verfuegbar_cent} warnung />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
