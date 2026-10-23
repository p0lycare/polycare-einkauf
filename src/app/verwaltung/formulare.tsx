"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { centAlsEingabe } from "@/lib/geld";
import { feldKlein, knopfKlein } from "@/lib/stil";
import { einstellungenSpeichern, personSpeichern, teamSpeichern, type Status } from "./actions";

type Auswahl = { id: string; name: string };

function Rueckmeldung({ status }: { status: Status }) {
  if (status.fehler) return <span role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</span>;
  if (status.gespeichert) return <span role="status" className="text-sm text-green-700 dark:text-green-400">Gespeichert</span>;
  return null;
}

const ROLLEN = [
  ["ist_gf", "GF"],
  ["ist_einkauf", "Einkauf"],
  ["ist_finanzen", "Finanzen"],
  ["ist_admin", "Admin"],
] as const;

export type Person = {
  id: string;
  name: string;
  email: string;
  team_id: string | null;
  ist_gf: boolean;
  ist_einkauf: boolean;
  ist_finanzen: boolean;
  ist_admin: boolean;
};

export function PersonZeile({ person, teams }: { person: Person; teams: Auswahl[] }) {
  const [status, absenden, laeuft] = useActionState(personSpeichern, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="grid gap-2 py-3 sm:grid-cols-[1fr_10rem_auto_auto] sm:items-center">
      <input type="hidden" name="id" value={person.id} />
      <div className="min-w-0">
        <p className="truncate font-medium">{person.name}</p>
        <p className="truncate text-xs text-neutral-500">{person.email}</p>
      </div>
      <select name="team_id" defaultValue={person.team_id ?? ""} aria-label="Team" className={feldKlein}>
        <option value="">– kein Team –</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <div className="flex flex-wrap gap-3 text-sm">
        {ROLLEN.map(([feld, text]) => (
          <label key={feld} className="flex items-center gap-1">
            <input type="checkbox" name={feld} defaultChecked={person[feld]} className="size-4" />
            {text}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={laeuft} className={knopfKlein}>{laeuft ? "…" : "Speichern"}</button>
        <Rueckmeldung status={status} />
      </div>
    </form>
  );
}

export function TeamZeile({ team, personen }: { team?: { id: string; name: string; leitung_id: string | null }; personen: Auswahl[] }) {
  const [status, absenden, laeuft] = useActionState(teamSpeichern, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="grid gap-2 py-3 sm:grid-cols-[1fr_14rem_auto] sm:items-center">
      {team && <input type="hidden" name="id" value={team.id} />}
      <input name="name" defaultValue={team?.name} placeholder="Neues Team" aria-label="Teamname" className={feldKlein} />
      <select name="leitung_id" defaultValue={team?.leitung_id ?? ""} aria-label="Teamleitung" className={feldKlein}>
        <option value="">– keine Teamleitung –</option>
        {personen.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={laeuft} className={knopfKlein}>{laeuft ? "…" : team ? "Speichern" : "Anlegen"}</button>
        <Rueckmeldung status={status} />
      </div>
    </form>
  );
}

export function EinstellungenFormular({ gfGrenzeCent }: { gfGrenzeCent: number }) {
  const [status, absenden, laeuft] = useActionState(einstellungenSpeichern, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm">Freigabe durch die GF ab (brutto, über diesem Betrag)</span>
        <input name="gf_grenze" defaultValue={centAlsEingabe(gfGrenzeCent)} inputMode="decimal" className={`${feldKlein} w-40`} />
      </label>
      <button type="submit" disabled={laeuft} className={knopfKlein}>{laeuft ? "…" : "Speichern"}</button>
      <Rueckmeldung status={status} />
    </form>
  );
}
