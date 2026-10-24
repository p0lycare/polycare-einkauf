"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { centAlsEingabe } from "@/lib/geld";
import { feldKlein, knopfKlein } from "@/lib/stil";
import {
  keyResultLoeschen,
  keyResultSpeichern,
  periodeKopieren,
  periodeSpeichern,
  postenLoeschen,
  postenSpeichern,
  type Status,
} from "./actions";

function Rueckmeldung({ status }: { status: Status }) {
  if (status.fehler) return <span role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</span>;
  if (status.gespeichert) return <span role="status" className="text-sm text-green-700 dark:text-green-400">Gespeichert</span>;
  return null;
}

function Loeschen({ id, aktion }: { id: string; aktion: typeof postenLoeschen }) {
  const [status, absenden, laeuft] = useActionState(aktion, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={laeuft} className="text-sm text-red-700 hover:underline disabled:opacity-50 dark:text-red-400">
        Löschen
      </button>
      {status.fehler && <Rueckmeldung status={status} />}
    </form>
  );
}

const STATUS_TEXT = { planung: "In Planung", aktiv: "Aktiv", abgeschlossen: "Abgeschlossen" } as const;

export type Periode = { id: string; name: string; beginn: string; ende: string; status: keyof typeof STATUS_TEXT };

export function PeriodeZeile({ periode }: { periode?: Periode }) {
  const [status, absenden, laeuft] = useActionState(periodeSpeichern, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="grid gap-2 py-3 sm:grid-cols-[1fr_9.5rem_9.5rem_9rem_auto] sm:items-center">
      {periode && <input type="hidden" name="id" value={periode.id} />}
      <input name="name" defaultValue={periode?.name} placeholder="z. B. Q1 2027" aria-label="Name" className={feldKlein} />
      <input type="date" name="beginn" defaultValue={periode?.beginn} aria-label="Beginn" className={feldKlein} />
      <input type="date" name="ende" defaultValue={periode?.ende} aria-label="Ende" className={feldKlein} />
      <select name="status" defaultValue={periode?.status ?? "planung"} aria-label="Status" className={feldKlein}>
        {Object.entries(STATUS_TEXT).map(([wert, text]) => (
          <option key={wert} value={wert}>{text}</option>
        ))}
      </select>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={laeuft} className={knopfKlein}>{laeuft ? "…" : periode ? "Speichern" : "Anlegen"}</button>
        <Rueckmeldung status={status} />
      </div>
    </form>
  );
}

type Auswahl = { id: string; name: string };
export type KeyResult = { id: string; kuerzel: string; titel: string; team_id: string | null };

export function KeyResultZeile({ kr, periodeId, teams }: { kr?: KeyResult; periodeId: string; teams: Auswahl[] }) {
  const [status, absenden, laeuft] = useActionState(keyResultSpeichern, {});
  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      <form onSubmit={ohneZuruecksetzen(absenden)} className="grid flex-1 gap-2 sm:grid-cols-[6rem_1fr_10rem_auto] sm:items-center">
        {kr && <input type="hidden" name="id" value={kr.id} />}
        <input type="hidden" name="periode_id" value={periodeId} />
        <input name="kuerzel" defaultValue={kr?.kuerzel} placeholder="KR 1.1" aria-label="Kürzel" className={feldKlein} />
        <input name="titel" defaultValue={kr?.titel} placeholder="Neues Key Result" aria-label="Titel" className={feldKlein} />
        <select name="team_id" defaultValue={kr?.team_id ?? ""} aria-label="Team" className={feldKlein}>
          <option value="">teamübergreifend</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={laeuft} className={knopfKlein}>{laeuft ? "…" : kr ? "Speichern" : "Anlegen"}</button>
          <Rueckmeldung status={status} />
        </div>
      </form>
      {kr && <Loeschen id={kr.id} aktion={keyResultLoeschen} />}
    </div>
  );
}

export type Posten = { id: string; name: string; geplant_cent: number; key_result_id: string | null };

export function PostenZeile({
  posten,
  periodeId,
  teamId,
  keyResults,
}: {
  posten?: Posten;
  periodeId: string;
  teamId: string;
  keyResults: KeyResult[];
}) {
  const [status, absenden, laeuft] = useActionState(postenSpeichern, {});
  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      <form onSubmit={ohneZuruecksetzen(absenden)} className="grid flex-1 gap-2 sm:grid-cols-[1fr_8rem_10rem_auto] sm:items-center">
        {posten && <input type="hidden" name="id" value={posten.id} />}
        <input type="hidden" name="periode_id" value={periodeId} />
        <input type="hidden" name="team_id" value={teamId} />
        <input name="name" defaultValue={posten?.name} placeholder="Neuer Budgetposten" aria-label="Budgetposten" className={feldKlein} />
        <input
          name="geplant"
          defaultValue={posten ? centAlsEingabe(posten.geplant_cent) : ""}
          placeholder="0,00"
          inputMode="decimal"
          aria-label="Geplant (brutto)"
          className={`${feldKlein} text-right`}
        />
        <select name="key_result_id" defaultValue={posten?.key_result_id ?? ""} aria-label="Key Result" className={feldKlein}>
          <option value="">– kein Key Result –</option>
          {keyResults.map((k) => (
            <option key={k.id} value={k.id}>{k.kuerzel}</option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={laeuft} className={knopfKlein}>{laeuft ? "…" : posten ? "Speichern" : "Anlegen"}</button>
          <Rueckmeldung status={status} />
        </div>
      </form>
      {posten && <Loeschen id={posten.id} aktion={postenLoeschen} />}
    </div>
  );
}

/** Key Results und Budgetposten einer früheren Periode als Vorlage in die Periode in Planung übernehmen. */
export function PeriodeKopieren({ ziel, vorperioden }: { ziel: Auswahl; vorperioden: Auswahl[] }) {
  const [status, absenden, laeuft] = useActionState(periodeKopieren, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      <input type="hidden" name="ziel" value={ziel.id} />
      <span>Vorlage aus</span>
      <select name="quelle" defaultValue={vorperioden[0]?.id} aria-label="Vorperiode" className={feldKlein}>
        {vorperioden.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button type="submit" disabled={laeuft} className={knopfKlein}>{laeuft ? "…" : `In ${ziel.name} übernehmen`}</button>
      {status.fehler && <span role="alert" className="text-red-700 dark:text-red-400">{status.fehler}</span>}
      {status.meldung && <span role="status" className="text-green-700 dark:text-green-400">{status.meldung}</span>}
    </form>
  );
}
