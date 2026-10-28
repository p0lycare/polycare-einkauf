import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gibtFrei, ladeIch, sichtAufAlleTeams } from "@/lib/einkauf/ich";
import { formatNr } from "@/lib/einkauf/anforderung";
import { STUECKELUNG_FENSTER_TAGE, stueckelungZu, type StueckelungsKandidat } from "@/lib/einkauf/stueckelung";
import { formatDatum, formatEuro } from "@/lib/format";
import { knopfSekundaer } from "@/lib/stil";
import { LoeschenKnopf } from "./loeschen-knopf";
import { ERLEDIGT, istErledigt } from "./workflow/erledigt";
import { AusserplanBadge, StatusBadge } from "../status-badge";
import { Verlauf } from "./workflow/verlauf";
import { WorkflowPanel, type WorkflowRechte } from "./workflow/workflow-panel";

function Zeile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1.5 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default async function AnforderungSeite({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ angebot?: string; erledigt?: string }>;
}) {
  const { id } = await params;
  const { angebot, erledigt } = await searchParams;
  const supabase = await createClient();
  const [ich, { data: a }, { data: dateien }] = await Promise.all([
    ladeIch(supabase),
    supabase
      .from("anforderung")
      .select(
        `*, darf_freigeben,
         team(name), periode(name),
         budgetposten(name), key_result(kuerzel, titel),
         ersteller:profile!anforderung_ersteller_id_fkey(name),
         tl:profile!anforderung_teamleitung_von_fkey(name),
         gf:profile!anforderung_gf_von_fkey(name),
         einkauf:profile!anforderung_bestellt_von_fkey(name)`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("anforderung_datei").select("id, pfad, name").eq("anforderung_id", id).order("created_at"),
  ]);
  if (!a || !ich) notFound();

  // Kurzlebige Links zu den Angeboten (privater Bucket)
  const { data: links } = dateien?.length
    ? await supabase.storage.from("angebote").createSignedUrls(dateien.map((d) => d.pfad), 600)
    : { data: [] };
  const angebote = (dateien ?? []).map((d, i) => ({ ...d, url: links?.[i]?.signedUrl ?? null }));

  const eigene = a.ersteller_id === ich.id;
  const bearbeitbar = eigene && (a.status === "entwurf" || a.status === "abgelehnt");
  const rechte: WorkflowRechte = {
    einreichen: bearbeitbar,
    zurueckziehen: eigene && (a.status === "bei_teamleitung" || a.status === "bei_gf"),
    freigeben: !!a.darf_freigeben,
    bestellen: ich.ist_einkauf && a.status === "freigegeben",
  };
  // Hinweis auf gestückelte Anforderungen für alle, die Freigaben oder Ausgaben im Blick haben
  const pruefeStueckelung =
    (rechte.freigeben || sichtAufAlleTeams(ich)) && a.status !== "entwurf" && a.status !== "abgelehnt" && !!a.lieferant;
  const [{ data: aehnliche }, { data: einstellungen }] = pruefeStueckelung
    ? await Promise.all([
        supabase
          .from("anforderung")
          .select("id, nr, titel, team_id, lieferant, betrag_cent, eingereicht_am, created_at")
          .eq("team_id", a.team_id)
          .neq("id", a.id)
          .not("lieferant", "is", null)
          .in("status", ["bei_teamleitung", "bei_gf", "freigegeben", "bestellt"])
          .returns<StueckelungsKandidat[]>(),
        supabase.from("einstellungen").select("gf_grenze_cent").single(),
      ])
    : [{ data: [] }, { data: null }];
  const gfGrenzeCent = einstellungen?.gf_grenze_cent ?? 100000;
  const stueckelung = pruefeStueckelung ? stueckelungZu(a, aehnliche ?? [], gfGrenzeCent) : null;

  // Die GF darf auch Anforderungen freigeben, die noch bei der Teamleitung liegen – das soll man merken
  const vertritt = rechte.freigeben && a.status === "bei_teamleitung" && !ich.leitet.includes(a.team_id);
  const panelTitel = rechte.freigeben
    ? a.status === "bei_gf"
      ? "Freigabe Geschäftsführung"
      : vertritt
        ? "Freigabe anstelle der Teamleitung"
        : "Freigabe Teamleitung"
    : rechte.bestellen
      ? "Bestellung"
      : a.status === "entwurf"
        ? "Noch nicht eingereicht"
        : "Nächster Schritt";
  const panelHinweis = vertritt
    ? "Die Anforderung liegt noch bei der Teamleitung. Gibst du sie frei, wird die Teamleitung übersprungen."
    : rechte.einreichen
      ? "Erst mit „Zur Freigabe einreichen“ geht die Anforderung los – vorher sieht sie niemand außer dir."
      : undefined;
  // Zurückziehen nach erteilter Teamleitungs-Freigabe verwirft diese – vorher nachfragen
  const zurueckziehenFrage = a.teamleitung_von
    ? `Die Freigabe ${a.tl?.name ? `von ${a.tl.name} ` : ""}verfällt, du musst danach neu einreichen. Trotzdem zurückziehen?`
    : undefined;

  // Zurück dorthin, woher man in der Regel kommt
  const zurueck = eigene
    ? { href: "/", text: "Meine Anforderungen" }
    : ich.ist_einkauf && (a.status === "freigegeben" || a.status === "bestellt")
      ? { href: "/einkauf", text: "Einkauf" }
      : gibtFrei(ich) && a.status !== "freigegeben" && a.status !== "bestellt"
        ? { href: "/freigaben", text: "Freigaben" }
        : sichtAufAlleTeams(ich)
          ? { href: "/uebersicht", text: "Übersicht" }
          : { href: "/", text: "Meine Anforderungen" };
  const weiter =
    erledigt === "freigegeben" || erledigt === "freigegeben_gf" || erledigt === "abgelehnt"
      ? { href: "/freigaben", text: "Zur nächsten Freigabe →" }
      : erledigt === "bestellt"
        ? { href: "/einkauf", text: "Zurück zum Einkauf →" }
        : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <div>
        <Link href={zurueck.href} className="text-sm text-neutral-500 hover:underline">
          ← {zurueck.text}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500">{formatNr(a.nr)}</p>
            <h1 className="text-xl font-semibold">{a.titel}</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xl font-semibold tabular-nums">{formatEuro(a.betrag_cent)}</span>
            <div className="flex gap-1">
              {a.ausserplanmaessig && <AusserplanBadge />}
              <StatusBadge status={a.status} />
            </div>
          </div>
        </div>
      </div>

      {a.status === "abgelehnt" && a.ablehnungsgrund && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Abgelehnt: {a.ablehnungsgrund}
          {eigene && " – du kannst die Anforderung bearbeiten und erneut einreichen."}
        </p>
      )}

      {angebot === "fehler" && (
        <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Die Anforderung ist gespeichert, aber das Angebot konnte nicht angehängt werden. Bitte über „Bearbeiten“ erneut hochladen.
        </p>
      )}

      {stueckelung && (
        <div role="note" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">Mögliche Stückelung</p>
          <p className="mt-1">
            Beim selben Lieferanten gibt es in diesem Team innerhalb von {STUECKELUNG_FENSTER_TAGE} Tagen weitere Anforderungen.
            Jede liegt unter der Freigabegrenze von {formatEuro(gfGrenzeCent)}, zusammen sind es {formatEuro(stueckelung.summeCent)}.
            Bitte prüfen, ob das eine Bestellung ist, die die Geschäftsführung freigeben sollte.
          </p>
          <ul className="mt-2">
            {stueckelung.treffer.map((k) => (
              <li key={k.id}>
                <Link href={`/anforderungen/${k.id}`} className="underline">
                  {formatNr(k.nr)} {k.titel}
                </Link>{" "}
                · {formatEuro(k.betrag_cent)} · {formatDatum(k.eingereicht_am ?? k.created_at)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {istErledigt(erledigt) && (
        <p role="status" className="flex flex-wrap justify-between gap-2 rounded-md bg-marke-hell p-3 text-sm text-marke-dunkel">
          <span>{ERLEDIGT[erledigt]}</span>
          {weiter && (
            <Link href={weiter.href} className="font-medium underline">
              {weiter.text}
            </Link>
          )}
        </p>
      )}

      <WorkflowPanel id={a.id} rechte={rechte} titel={panelTitel} hinweis={panelHinweis} zurueckziehenFrage={zurueckziehenFrage} />

      <dl className="divide-y divide-neutral-100 dark:divide-neutral-900">
        <Zeile label="Angefordert von">{a.ersteller?.name}</Zeile>
        <Zeile label="Team">{a.team?.name}</Zeile>
        <Zeile label="Periode">{a.periode?.name}</Zeile>
        <Zeile label="Budgetposten">{a.budgetposten?.name ?? "– außerplanmäßig –"}</Zeile>
        {a.key_result && (
          <Zeile label="Key Result">
            {a.key_result.kuerzel} – {a.key_result.titel}
          </Zeile>
        )}
        {a.lieferant && <Zeile label="Lieferant">{a.lieferant}</Zeile>}
        {angebote.length > 0 && (
          <Zeile label="Angebot">
            <ul>
              {angebote.map((d) => (
                <li key={d.id}>
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noreferrer" className="underline">
                      📎 {d.name}
                    </a>
                  ) : (
                    <span>📎 {d.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </Zeile>
        )}
        {a.link && (
          <Zeile label="Link">
            <a href={a.link} target="_blank" rel="noreferrer" className="underline">
              {a.link}
            </a>
          </Zeile>
        )}
        {a.gewuenscht_bis && <Zeile label="Gewünscht bis">{formatDatum(a.gewuenscht_bis)}</Zeile>}
        {a.beschreibung && <Zeile label="Beschreibung"><span className="whitespace-pre-line">{a.beschreibung}</span></Zeile>}
        {a.begruendung && <Zeile label="Begründung"><span className="whitespace-pre-line">{a.begruendung}</span></Zeile>}
        {a.tl && <Zeile label="Teamleitung">{a.tl.name}</Zeile>}
        {a.gf && <Zeile label="Geschäftsführung">{a.gf.name}</Zeile>}
        {a.einkauf && (
          <Zeile label="Bestellt">
            {a.einkauf.name}
            {a.bestellt_am && `, ${formatDatum(a.bestellt_am)}`}
            {a.bestellnummer && ` · ${a.bestellnummer}`}
          </Zeile>
        )}
      </dl>

      {bearbeitbar && (
        <div className="flex gap-3">
          <Link href={`/anforderungen/${a.id}/bearbeiten`} className={knopfSekundaer}>
            Bearbeiten
          </Link>
          {a.status === "entwurf" && <LoeschenKnopf id={a.id} nr={formatNr(a.nr)} />}
        </div>
      )}

      <Verlauf anforderungId={a.id} />
    </main>
  );
}
