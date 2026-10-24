import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNr, STATUS_TEXT, type AnforderungStatus } from "@/lib/einkauf/anforderung";
import { ladeIch } from "@/lib/einkauf/ich";
import {
  auslastung,
  LANGE_WARTEZEIT_TAGE,
  summenJeTeam,
  summiere,
  wartetTage,
  type BudgetZeile,
  type Summen,
} from "@/lib/einkauf/uebersicht";
import { STUECKELUNG_FENSTER_TAGE, stueckelungsGruppen, type StueckelungsKandidat } from "@/lib/einkauf/stueckelung";
import { formatDatum, formatEuro } from "@/lib/format";
import { karte, leer } from "@/lib/stil";

type Offen = {
  id: string;
  nr: number;
  titel: string;
  betrag_cent: number;
  status: AnforderungStatus;
  ausserplanmaessig: boolean;
  eingereicht_am: string | null;
  teamleitung_am: string | null;
  team_id: string;
  team: { name: string } | null;
  ersteller: { name: string } | null;
};

const SPALTEN =
  "id, nr, titel, betrag_cent, status, ausserplanmaessig, eingereicht_am, teamleitung_am, team_id, team(name), ersteller:profile!anforderung_ersteller_id_fkey(name)";

function Kennzahl({ titel, cent, hinweis, warnung }: { titel: string; cent: number; hinweis?: string; warnung?: boolean }) {
  return (
    <div className="bg-flaeche p-4">
      <p className="text-xs text-neutral-500">{titel}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${warnung ? "text-red-700 dark:text-red-400" : ""}`}>{formatEuro(cent)}</p>
      {hinweis && <p className="mt-0.5 text-xs text-neutral-500">{hinweis}</p>}
    </div>
  );
}

/** `breit`: Spalte erst ab Tablet-Breite zeigen */
function Betrag({ cent, warnung, breit }: { cent: number; warnung?: boolean; breit?: boolean }) {
  return (
    <td className={`px-2 py-2 text-right tabular-nums ${breit ? "hidden sm:table-cell" : ""} ${warnung && cent < 0 ? "font-medium text-red-700 dark:text-red-400" : ""}`}>
      {formatEuro(cent)}
    </td>
  );
}

export default async function Uebersicht({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { periode: gewuenscht } = await searchParams;
  const supabase = await createClient();
  const ich = await ladeIch(supabase);
  if (!ich || !(ich.ist_gf || ich.ist_finanzen || ich.ist_admin)) redirect("/");

  const [{ data: perioden }, { data: teams }] = await Promise.all([
    supabase.from("periode").select("id, name, status").order("beginn", { ascending: false }),
    supabase.from("team").select("id, name").order("name"),
  ]);
  const periode =
    perioden?.find((p) => p.id === gewuenscht) ?? perioden?.find((p) => p.status === "aktiv") ?? perioden?.[0];

  const [{ data: zeilen }, { data: offen }, { data: ausserplan }, { data: eingereicht }, { data: einstellungen }] = periode
    ? await Promise.all([
        supabase.rpc("budget_stand", { p_periode: periode.id }),
        supabase
          .from("anforderung")
          .select(SPALTEN)
          .eq("periode_id", periode.id)
          .in("status", ["bei_teamleitung", "bei_gf"])
          .order("eingereicht_am")
          .returns<Offen[]>(),
        supabase
          .from("anforderung")
          .select(SPALTEN)
          .eq("periode_id", periode.id)
          .eq("ausserplanmaessig", true)
          .in("status", ["bei_teamleitung", "bei_gf", "freigegeben", "bestellt"])
          .order("eingereicht_am", { ascending: false })
          .returns<Offen[]>(),
        supabase
          .from("anforderung")
          .select("id, nr, titel, team_id, lieferant, betrag_cent, eingereicht_am, created_at")
          .eq("periode_id", periode.id)
          .not("lieferant", "is", null)
          .in("status", ["bei_teamleitung", "bei_gf", "freigegeben", "bestellt"])
          .returns<StueckelungsKandidat[]>(),
        supabase.from("einstellungen").select("gf_grenze_cent").single(),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: null }];

  const budget = (zeilen ?? []) as BudgetZeile[];
  const gesamt: Summen = summiere(budget);
  const jeTeam = summenJeTeam(teams ?? [], budget);
  const offenJeTeam = (teamId: string) => (offen ?? []).filter((a) => a.team_id === teamId).length;
  const gfGrenzeCent = einstellungen?.gf_grenze_cent ?? 100000;
  const gestueckelt = stueckelungsGruppen(eingereicht ?? [], gfGrenzeCent);
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const jetzt = new Date();
  // Bei der GF wartet eine Anforderung seit der Freigabe der Teamleitung
  const wartetSeit = (a: Offen) => a.teamleitung_am ?? a.eingereicht_am ?? jetzt.toISOString();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Übersicht {periode?.name}</h1>
        {perioden && perioden.length > 1 && (
          <nav className="flex flex-wrap gap-2 text-sm">
            {perioden.map((p) => (
              <Link
                key={p.id}
                href={`/uebersicht?periode=${p.id}`}
                className={`rounded-md px-2 py-1 ${p.id === periode?.id ? "bg-primaer text-white dark:text-neutral-950" : "text-neutral-600 hover:underline dark:text-neutral-400"}`}
              >
                {p.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {!periode ? (
        <p className={leer}>Noch keine Periode angelegt.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kennzahl titel="Geplant" cent={gesamt.geplant_cent} />
            <Kennzahl titel="In Freigabe" cent={gesamt.in_freigabe_cent} hinweis={`${offen?.length ?? 0} offen`} />
            <Kennzahl
              titel="Gebunden"
              cent={gesamt.gebunden_cent}
              hinweis={gesamt.ausserplan_cent ? `davon ${formatEuro(gesamt.ausserplan_cent)} außerplanmäßig` : undefined}
            />
            <Kennzahl titel="Verfügbar" cent={gesamt.verfuegbar_cent} warnung={gesamt.verfuegbar_cent < 0} />
          </section>

          <section className="overflow-x-auto">
            <h2 className="mb-2 font-medium">Teams</h2>
            {!jeTeam.length ? (
              <p className={leer}>Für diese Periode ist noch kein Budget geplant.</p>
            ) : (
              <table className="w-full text-sm sm:min-w-[40rem]">
                <thead className="text-left text-xs text-neutral-500">
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="py-2 pr-2 font-normal">Team</th>
                    <th className="hidden px-2 text-right font-normal sm:table-cell">Geplant</th>
                    <th className="hidden px-2 text-right font-normal sm:table-cell">In Freigabe</th>
                    <th className="hidden px-2 text-right font-normal sm:table-cell">Gebunden</th>
                    <th className="px-2 text-right font-normal">Verfügbar</th>
                    <th className="px-2 text-right font-normal">Auslastung</th>
                    <th className="pl-2 text-right font-normal">Offen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {jeTeam.map(({ team, summen }) => {
                    const prozent = auslastung(summen);
                    return (
                      <tr key={team.id}>
                        <td className="py-2 pr-2">
                          <Link href={`/budget?periode=${periode.id}`} className="hover:underline">{team.name}</Link>
                        </td>
                        <Betrag cent={summen.geplant_cent} breit />
                        <Betrag cent={summen.in_freigabe_cent} breit />
                        <Betrag cent={summen.gebunden_cent} breit />
                        <Betrag cent={summen.verfuegbar_cent} warnung />
                        <td className={`px-2 text-right tabular-nums ${prozent !== null && prozent > 100 ? "font-medium text-red-700 dark:text-red-400" : ""}`}>
                          {prozent === null ? "–" : `${prozent} %`}
                        </td>
                        <td className="pl-2 text-right tabular-nums">{offenJeTeam(team.id) || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-medium">Offene Freigaben</h2>
            {!offen?.length ? (
              <p className={leer}>Keine Anforderung wartet auf eine Freigabe.</p>
            ) : (
              <ul className={`divide-y divide-neutral-100 dark:divide-neutral-900 ${karte}`}>
                {offen.map((a) => {
                  const tage = wartetTage(wartetSeit(a), jetzt);
                  return (
                    <li key={a.id}>
                      <Link href={`/anforderungen/${a.id}`} className="flex items-center justify-between gap-4 py-2 hover:underline">
                        <span className="min-w-0">
                          <span className="block truncate">{a.titel}</span>
                          <span className="block truncate text-xs text-neutral-500">
                            {formatNr(a.nr)} · {a.team?.name} · {a.ersteller?.name} · {STATUS_TEXT[a.status]}
                            {a.ausserplanmaessig && " · außerplanmäßig"}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end text-sm">
                          <span className="tabular-nums">{formatEuro(a.betrag_cent)}</span>
                          <span className={`text-xs ${tage >= LANGE_WARTEZEIT_TAGE ? "font-medium text-red-700 dark:text-red-400" : "text-neutral-500"}`}>
                            {tage === 0 ? "seit heute" : tage === 1 ? "seit 1 Tag" : `seit ${tage} Tagen`}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-medium">Mögliche Stückelung</h2>
            <p className="mb-2 text-sm text-neutral-500">
              Mehrere Anforderungen eines Teams beim selben Lieferanten innerhalb von {STUECKELUNG_FENSTER_TAGE} Tagen, jede
              unter der Freigabegrenze von {formatEuro(gfGrenzeCent)}, zusammen darüber.
            </p>
            {!gestueckelt.length ? (
              <p className={leer}>Nichts Auffälliges.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {gestueckelt.map((g) => (
                  <li key={`${g.team_id}|${g.lieferant}`} className="border-l-4 border-amber-400 bg-flaeche p-3 text-sm">
                    <p className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">
                        {g.lieferant} · {teamName.get(g.team_id)}
                      </span>
                      <span className="tabular-nums">zusammen {formatEuro(g.summeCent)}</span>
                    </p>
                    <ul className="mt-1 text-neutral-600 dark:text-neutral-400">
                      {g.anforderungen.map((k) => (
                        <li key={k.id}>
                          <Link href={`/anforderungen/${k.id}`} className="hover:underline">
                            {formatNr(k.nr)} {k.titel}
                          </Link>{" "}
                          · {formatEuro(k.betrag_cent)} · {formatDatum(k.eingereicht_am ?? k.created_at)}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-medium">Außerplanmäßig</h2>
            <p className="mb-2 text-sm text-neutral-500">Anforderungen ohne Budgetposten oder über dem verfügbaren Budget.</p>
            {!ausserplan?.length ? (
              <p className={leer}>Keine außerplanmäßigen Anforderungen.</p>
            ) : (
              <ul className={`divide-y divide-neutral-100 dark:divide-neutral-900 ${karte}`}>
                {ausserplan.map((a) => (
                  <li key={a.id}>
                    <Link href={`/anforderungen/${a.id}`} className="flex items-center justify-between gap-4 py-2 hover:underline">
                      <span className="min-w-0">
                        <span className="block truncate">{a.titel}</span>
                        <span className="block truncate text-xs text-neutral-500">
                          {formatNr(a.nr)} · {a.team?.name} · {a.ersteller?.name} · {STATUS_TEXT[a.status]}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums">{formatEuro(a.betrag_cent)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
