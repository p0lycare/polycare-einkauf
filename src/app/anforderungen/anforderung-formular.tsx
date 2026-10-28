"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { centAlsEingabe, parseEuro } from "@/lib/geld";
import { formatEuro } from "@/lib/format";
import { freigabeweg } from "@/lib/einkauf/anforderung";
import { feld, knopf, knopfSekundaer } from "@/lib/stil";
import type { AngebotVorschlag } from "@/lib/ki/angebot-schema";
import { anforderungSpeichern, type FormularStatus } from "./actions";
import { AngebotBereich, type VorhandeneDatei } from "./angebot-bereich";

export type FormularDaten = {
  perioden: { id: string; name: string }[];
  teams: { id: string; name: string; leitung_id: string | null; nur_mitglieder: boolean }[];
  posten: {
    id: string;
    periode_id: string;
    team_id: string;
    name: string;
    key_result_id: string | null;
    verfuegbar_cent: number;
  }[];
  keyResults: { id: string; periode_id: string; team_id: string | null; kuerzel: string; titel: string }[];
  gfGrenzeCent: number;
};

export type AnforderungWerte = {
  id: string;
  periode_id: string;
  team_id: string;
  budgetposten_id: string | null;
  key_result_id: string | null;
  titel: string;
  beschreibung: string | null;
  begruendung: string | null;
  lieferant: string | null;
  link: string | null;
  betrag_cent: number;
  gewuenscht_bis: string | null;
};

const STUFE_TEXT = { teamleitung: "Teamleitung", gf: "Geschäftsführung" } as const;

function Feld({ label, hinweis, children }: { label: string; hinweis?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hinweis && <span className="text-xs text-neutral-500">{hinweis}</span>}
    </label>
  );
}

export function AnforderungFormular({
  daten,
  ichId,
  eigenesTeam,
  werte,
  kiAktiv,
  dateien = [],
}: {
  daten: FormularDaten;
  ichId: string;
  eigenesTeam: string | null;
  werte?: AnforderungWerte;
  kiAktiv: boolean;
  dateien?: VorhandeneDatei[];
}) {
  const [status, absenden, laeuft] = useActionState<FormularStatus, FormData>(anforderungSpeichern, {});
  const [periodeId, setPeriodeId] = useState(werte?.periode_id ?? daten.perioden[0]?.id ?? "");
  // Teams mit „Nur Mitglieder dürfen anfordern“ nur für ihre Mitglieder (die Datenbank prüft das ebenfalls)
  const waehlbareTeams = daten.teams.filter((t) => !t.nur_mitglieder || t.id === eigenesTeam || t.id === werte?.team_id);
  // Ohne eigenes Team nicht still das erste Team vorbelegen – sonst landet die Anforderung im falschen Budget
  const [teamId, setTeamId] = useState(werte?.team_id ?? eigenesTeam ?? "");
  const [postenId, setPostenId] = useState(werte?.budgetposten_id ?? "");
  const [keyResultId, setKeyResultId] = useState(werte?.key_result_id ?? "");
  const [betrag, setBetrag] = useState(werte ? centAlsEingabe(werte.betrag_cent) : "");
  const [titel, setTitel] = useState(werte?.titel ?? "");
  const [lieferant, setLieferant] = useState(werte?.lieferant ?? "");
  const [link, setLink] = useState(werte?.link ?? "");
  const [beschreibung, setBeschreibung] = useState(werte?.beschreibung ?? "");

  if (!daten.perioden.length) {
    return (
      <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        Es gibt gerade keine aktive Budgetperiode. Bitte wende dich an Finanzen.{" "}
        <Link href="/" className="underline">
          Zurück zu meinen Anforderungen
        </Link>
      </p>
    );
  }

  const posten = daten.posten.filter((p) => p.periode_id === periodeId && p.team_id === teamId);
  const keyResults = daten.keyResults.filter(
    (k) => k.periode_id === periodeId && (k.team_id === null || k.team_id === teamId),
  );
  const gewaehlt = posten.find((p) => p.id === postenId) ?? null;
  const team = daten.teams.find((t) => t.id === teamId);
  const betragCent = parseEuro(betrag);
  const weg = betragCent
    ? freigabeweg({
        betragCent,
        verfuegbarCent: gewaehlt?.verfuegbar_cent ?? null,
        gfGrenzeCent: daten.gfGrenzeCent,
        teamHatLeitung: !!team?.leitung_id,
        ichLeiteTeam: team?.leitung_id === ichId,
      })
    : null;

  /** KI-Vorschlag übernehmen; bereits Eingetipptes bleibt stehen */
  function vorschlagUebernehmen(v: AngebotVorschlag) {
    if (v.titel && !titel) setTitel(v.titel);
    if (v.lieferant && !lieferant) setLieferant(v.lieferant);
    if (v.link && !link) setLink(v.link);
    if (v.beschreibung && !beschreibung) setBeschreibung(v.beschreibung);
    if (v.betragCent && !betrag) setBetrag(centAlsEingabe(v.betragCent));
  }

  function postenWaehlen(id: string) {
    setPostenId(id);
    // Key Result des Budgetpostens vorschlagen
    const kr = daten.posten.find((p) => p.id === id)?.key_result_id;
    if (kr) setKeyResultId(kr);
  }

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-5">
      {werte && <input type="hidden" name="id" value={werte.id} />}

      <AngebotBereich userId={ichId} kiAktiv={kiAktiv} vorhanden={dateien} onVorschlag={vorschlagUebernehmen} />

      <Feld label="Was soll bestellt werden?">
        <input name="titel" required value={titel} onChange={(e) => setTitel(e.target.value)} className={feld} placeholder="z. B. Präzisionswaage 0,1 mg" />
      </Feld>

      <div className="grid gap-4 sm:grid-cols-2">
        <Feld label="Betrag in € (brutto)">
          <input name="betrag" required inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} className={feld} placeholder="0,00" />
        </Feld>
        <Feld label="Gewünscht bis" hinweis="optional">
          <input type="date" name="gewuenscht_bis" defaultValue={werte?.gewuenscht_bis ?? ""} className={feld} />
        </Feld>
        <Feld label="Lieferant" hinweis="optional">
          <input name="lieferant" value={lieferant} onChange={(e) => setLieferant(e.target.value)} className={feld} />
        </Feld>
        <Feld label="Link zum Produkt oder Angebot" hinweis="optional">
          <input type="url" name="link" value={link} onChange={(e) => setLink(e.target.value)} className={feld} placeholder="https://" />
        </Feld>
      </div>

      <Feld label="Beschreibung" hinweis="Menge, Artikelnummer, Spezifikation – alles, was der Einkauf braucht">
        <textarea name="beschreibung" rows={4} value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} className={feld} />
      </Feld>

      <fieldset className="grid gap-4 rounded-lg border border-neutral-200 p-4 sm:grid-cols-2 dark:border-neutral-800">
        <legend className="px-1 text-sm font-medium">Budget</legend>
        {daten.perioden.length > 1 ? (
          <Feld label="Periode">
            <select name="periode_id" value={periodeId} onChange={(e) => { setPeriodeId(e.target.value); setPostenId(""); setKeyResultId(""); }} className={feld}>
              {daten.perioden.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Feld>
        ) : (
          <input type="hidden" name="periode_id" value={periodeId} />
        )}
        <Feld label="Team">
          <select name="team_id" required value={teamId} onChange={(e) => { setTeamId(e.target.value); setPostenId(""); setKeyResultId(""); }} className={feld}>
            {!teamId && <option value="">– Bitte Team wählen –</option>}
            {waehlbareTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Feld>
        <Feld
          label="Budgetposten"
          hinweis={gewaehlt ? `Noch verfügbar: ${formatEuro(gewaehlt.verfuegbar_cent)}` : "Ohne Budgetposten ist die Anforderung außerplanmäßig."}
        >
          <select name="budgetposten_id" value={postenId} onChange={(e) => postenWaehlen(e.target.value)} className={feld}>
            <option value="">– kein Budgetposten (außerplanmäßig) –</option>
            {posten.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Feld>
        {gewaehlt && betragCent !== null && betragCent > gewaehlt.verfuegbar_cent && (
          <p role="note" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2 dark:bg-amber-950 dark:text-amber-100">
            Der Betrag liegt {formatEuro(betragCent - gewaehlt.verfuegbar_cent)} über dem verfügbaren Budget. Die Anforderung
            wird außerplanmäßig – die Geschäftsführung entscheidet, bitte begründe sie unten.
          </p>
        )}
        <Feld label="Key Result" hinweis="optional">
          <select name="key_result_id" value={keyResultId} onChange={(e) => setKeyResultId(e.target.value)} className={feld}>
            <option value="">– keins –</option>
            {keyResults.map((k) => (
              <option key={k.id} value={k.id}>{k.kuerzel} – {k.titel}</option>
            ))}
          </select>
        </Feld>
      </fieldset>

      <Feld
        label={weg?.ausserplanmaessig ? "Begründung (Pflicht bei außerplanmäßig)" : "Begründung"}
        hinweis={weg?.ausserplanmaessig ? "Bitte erklären, warum es nicht warten kann und nicht aus dem Budget geht." : "optional"}
      >
        <textarea name="begruendung" rows={2} required={weg?.ausserplanmaessig} defaultValue={werte?.begruendung ?? ""} className={feld} />
      </Feld>

      {weg && (
        <p className="rounded-md bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
          Freigabe durch: <strong>{weg.stufen.map((s) => STUFE_TEXT[s]).join(" → ")}</strong>
          {weg.ausserplanmaessig && " · außerplanmäßig"}
        </p>
      )}

      {status.fehler && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {status.fehler}
        </p>
      )}

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Gespeichert wird zunächst ein Entwurf, den nur du siehst. Abgeschickt wird er danach mit „Zur Freigabe einreichen“.
      </p>
      <div className="flex gap-3">
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "Speichert …" : "Als Entwurf speichern"}
        </button>
        <Link href={werte ? `/anforderungen/${werte.id}` : "/"} className={knopfSekundaer}>
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
