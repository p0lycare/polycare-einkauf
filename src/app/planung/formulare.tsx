"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { centAlsEingabe } from "@/lib/geld";
import { formatEuro } from "@/lib/format";
import { feldKlein, knopfKlein } from "@/lib/stil";
import {
  keyResultLoeschen,
  keyResultSpeichern,
  okrUebernehmen,
  okrVorschau,
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

/** Feld mit Beschriftung: am Handy sichtbar darüber, ab Tablet-Breite übernimmt die Kopfzeile */
function Beschriftet({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-500 sm:sr-only">{text}</span>
      {children}
    </label>
  );
}

/** Spaltenköpfe ab Tablet-Breite, im selben Raster wie die Zeilen darunter */
function Kopf({ raster, spalten }: { raster: string; spalten: string[] }) {
  return (
    <div aria-hidden className={`hidden gap-2 pt-2 text-xs text-neutral-500 sm:grid ${raster}`}>
      {spalten.map((s) => (
        <span key={s}>{s}</span>
      ))}
    </div>
  );
}

const RASTER_PERIODE = "sm:grid-cols-[1fr_9.5rem_9.5rem_9rem_auto]";
const RASTER_KR = "sm:grid-cols-[6rem_1fr_10rem_auto]";
const RASTER_POSTEN = "sm:grid-cols-[1fr_8rem_10rem_auto]";

export const PeriodenKopf = () => <Kopf raster={RASTER_PERIODE} spalten={["Name", "Beginn", "Ende", "Status", ""]} />;
export const KeyResultKopf = () => <Kopf raster={RASTER_KR} spalten={["Kürzel", "Titel", "Team", ""]} />;
export const PostenKopf = () => <Kopf raster={RASTER_POSTEN} spalten={["Budgetposten", "Geplant (€, brutto)", "Key Result", ""]} />;

function Loeschen({ id, aktion, frage }: { id: string; aktion: typeof postenLoeschen; frage: string }) {
  const [status, absenden, laeuft] = useActionState(aktion, {});
  const senden = ohneZuruecksetzen(absenden);
  return (
    <form onSubmit={(e) => (confirm(frage) ? senden(e) : e.preventDefault())} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={laeuft} className="text-sm text-red-700 hover:underline disabled:opacity-50 dark:text-red-400">
        Löschen
      </button>
      {status.fehler && <Rueckmeldung status={status} />}
    </form>
  );
}

export const STATUS_TEXT = { planung: "In Planung", aktiv: "Aktiv", abgeschlossen: "Abgeschlossen" } as const;

export type Periode = { id: string; name: string; beginn: string; ende: string; status: keyof typeof STATUS_TEXT };

export function PeriodeZeile({ periode }: { periode?: Periode }) {
  const [status, absenden, laeuft] = useActionState(periodeSpeichern, {});
  const senden = ohneZuruecksetzen(absenden);
  // Statuswechsel mit Folgen nur nach Rückfrage
  function pruefen(e: React.FormEvent<HTMLFormElement>) {
    const neu = new FormData(e.currentTarget).get("status");
    const name = new FormData(e.currentTarget).get("name") || "Die Periode";
    const frage =
      periode && neu !== periode.status
        ? neu === "abgeschlossen"
          ? `${name} abschließen? Danach sind keine Anforderungen mehr möglich, das Restbudget verfällt.`
          : neu === "aktiv"
            ? `${name} aktivieren? Dann sind Anforderungen möglich, und die Teamleitungen können ihr Budget nicht mehr selbst ändern.`
            : null
        : null;
    if (frage && !confirm(frage)) return e.preventDefault();
    senden(e);
  }
  return (
    <form onSubmit={pruefen} className={`grid gap-2 py-3 sm:items-center ${RASTER_PERIODE}`}>
      {periode && <input type="hidden" name="id" value={periode.id} />}
      <Beschriftet text="Name">
        <input name="name" defaultValue={periode?.name} placeholder="z. B. 27Z1" className={feldKlein} />
      </Beschriftet>
      <Beschriftet text="Beginn">
        <input type="date" name="beginn" defaultValue={periode?.beginn} className={feldKlein} />
      </Beschriftet>
      <Beschriftet text="Ende">
        <input type="date" name="ende" defaultValue={periode?.ende} className={feldKlein} />
      </Beschriftet>
      <Beschriftet text="Status">
        <select name="status" defaultValue={periode?.status ?? "planung"} className={feldKlein}>
          {Object.entries(STATUS_TEXT).map(([wert, text]) => (
            <option key={wert} value={wert}>{text}</option>
          ))}
        </select>
      </Beschriftet>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={laeuft} className={knopfKlein}>{laeuft ? "Speichert …" : periode ? "Speichern" : "Anlegen"}</button>
        <Rueckmeldung status={status} />
      </div>
    </form>
  );
}

type Auswahl = { id: string; name: string };
export type KeyResult = {
  id: string;
  kuerzel: string;
  titel: string;
  team_id: string | null;
  okr_id?: string | null;
  okr_entfallen?: boolean;
};

/** Aus dem OKR-Dashboard übernommenes Key Result: nur lesen, geändert wird im OKR-Dashboard */
function OkrKeyResultZeile({ kr, teams }: { kr: KeyResult; teams: Auswahl[] }) {
  return (
    <div className={`grid gap-2 py-2 text-sm sm:items-center ${RASTER_KR}`}>
      <span className="font-medium">{kr.kuerzel}</span>
      <span>{kr.titel}</span>
      <span className="text-neutral-600 dark:text-neutral-400">{teams.find((t) => t.id === kr.team_id)?.name ?? "ohne Team"}</span>
      <span
        className={`justify-self-start rounded px-2 py-0.5 text-xs ${kr.okr_entfallen ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100" : "bg-marke-hell text-marke-dunkel"}`}
        title={kr.okr_entfallen ? "Steht in der neuesten OKR-Version nicht mehr; bleibt wegen möglicher Ausgaben erhalten" : "Aus dem OKR-Dashboard übernommen – Änderungen dort vornehmen"}
      >
        {kr.okr_entfallen ? "nicht mehr im OKR-Set" : "aus OKR-Dashboard"}
      </span>
    </div>
  );
}

export function KeyResultZeile({ kr, periodeId, teams }: { kr?: KeyResult; periodeId: string; teams: Auswahl[] }) {
  const [status, absenden, laeuft] = useActionState(keyResultSpeichern, {});
  if (kr?.okr_id) return <OkrKeyResultZeile kr={kr} teams={teams} />;
  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      <form onSubmit={ohneZuruecksetzen(absenden)} className={`grid flex-1 gap-2 sm:items-center ${RASTER_KR}`}>
        {kr && <input type="hidden" name="id" value={kr.id} />}
        <input type="hidden" name="periode_id" value={periodeId} />
        <Beschriftet text="Kürzel">
          <input name="kuerzel" defaultValue={kr?.kuerzel} placeholder="KR 1.1" className={feldKlein} />
        </Beschriftet>
        <Beschriftet text="Titel">
          <input name="titel" defaultValue={kr?.titel} placeholder="Neues Key Result" className={feldKlein} />
        </Beschriftet>
        <Beschriftet text="Team">
          <select name="team_id" defaultValue={kr?.team_id ?? ""} className={feldKlein}>
            <option value="">teamübergreifend</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Beschriftet>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={laeuft} className={knopfKlein}>{laeuft ? "Speichert …" : kr ? "Speichern" : "Anlegen"}</button>
          <Rueckmeldung status={status} />
        </div>
      </form>
      {kr && <Loeschen id={kr.id} aktion={keyResultLoeschen} frage={`Key Result ${kr.kuerzel} löschen?`} />}
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
      <form onSubmit={ohneZuruecksetzen(absenden)} className={`grid flex-1 gap-2 sm:items-center ${RASTER_POSTEN}`}>
        {posten && <input type="hidden" name="id" value={posten.id} />}
        <input type="hidden" name="periode_id" value={periodeId} />
        <input type="hidden" name="team_id" value={teamId} />
        <Beschriftet text="Budgetposten">
          <input name="name" defaultValue={posten?.name} placeholder="Neuer Budgetposten" className={feldKlein} />
        </Beschriftet>
        <Beschriftet text="Geplant (€, brutto)">
          <input
            name="geplant"
            defaultValue={posten ? centAlsEingabe(posten.geplant_cent) : ""}
            placeholder="0,00"
            inputMode="decimal"
            className={`${feldKlein} text-right`}
          />
        </Beschriftet>
        <Beschriftet text="Key Result">
          <select name="key_result_id" defaultValue={posten?.key_result_id ?? ""} className={feldKlein}>
            <option value="">– kein Key Result –</option>
            {keyResults.map((k) => (
              <option key={k.id} value={k.id}>{k.kuerzel}</option>
            ))}
          </select>
        </Beschriftet>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={laeuft} className={knopfKlein}>{laeuft ? "Speichert …" : posten ? "Speichern" : "Anlegen"}</button>
          <Rueckmeldung status={status} />
        </div>
      </form>
      {posten && <Loeschen id={posten.id} aktion={postenLoeschen} frage={`Budgetposten „${posten.name}“ löschen?`} />}
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

/** Vorschau und Übernahme eines eingefrorenen OKR-Sets; Finanzen bestätigt, was übernommen wird */
export function OkrUebernahme({ vorschlag }: { vorschlag: string }) {
  const [vorschau, laden, laedt] = useActionState(okrVorschau, {});
  const [ergebnis, uebernehmen, uebernimmt] = useActionState(okrUebernehmen, {});
  const v = vorschau.vergleich;
  const bereitsAktuell = v && v.bisherigeVersion === v.version && !v.neu.length && !v.geaendert.length && !v.entfallen.length;

  return (
    <div className="mt-3 flex flex-col gap-4 text-sm">
      <form onSubmit={ohneZuruecksetzen(laden)} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-500">Zyklus</span>
          <input name="zyklus" defaultValue={vorschlag} className={`${feldKlein} w-28 uppercase`} />
        </label>
        <button type="submit" disabled={laedt} className={knopfKlein}>
          {laedt ? "Lädt …" : "Vorschau laden"}
        </button>
      </form>
      {vorschau.fehler && <p role="alert" className="text-red-700 dark:text-red-400">{vorschau.fehler}</p>}

      {v && (
        <div className="flex flex-col gap-3 border-l-4 border-marke bg-flaeche p-3">
          <p>
            <strong>
              {v.zyklus}, Version {v.version}
            </strong>
            {v.bisherigeVersion ? ` – bisher übernommen: Version ${v.bisherigeVersion}` : " – noch nicht übernommen"}.
            Budgetvorschläge der Team-KRs zusammen {formatEuro(v.budgetSummeCent)}.
          </p>
          {bereitsAktuell ? (
            <p>Alles ist auf dem Stand des OKR-Dashboards.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {v.neu.length > 0 && (
                <li>
                  <span className="font-medium">Neu ({v.neu.length}):</span>{" "}
                  {v.neu.map((k) => `${k.kuerzel ?? "?"} ${k.titel}${k.team ? ` (${k.team})` : ""}${k.budget_vorschlag_cent ? ` · ${formatEuro(k.budget_vorschlag_cent)}` : ""}`).join("; ")}
                </li>
              )}
              {v.geaendert.length > 0 && (
                <li>
                  <span className="font-medium">Geändert ({v.geaendert.length}):</span>{" "}
                  {v.geaendert.map((g) => `${g.kuerzel}: ${g.was.join(", ")}`).join("; ")}
                </li>
              )}
              {v.entfallen.length > 0 && (
                <li>
                  <span className="font-medium">Nicht mehr im OKR-Set ({v.entfallen.length}):</span>{" "}
                  {v.entfallen.map((k) => `${k.kuerzel} ${k.titel}`).join("; ")} – bleiben mit ihren Ausgaben erhalten und werden markiert.
                </li>
              )}
              {v.unveraendert > 0 && <li className="text-neutral-500">{v.unveraendert} unverändert</li>}
            </ul>
          )}
          {v.unbekannteTeams.length > 0 && (
            <p className="text-amber-800 dark:text-amber-300">
              Diese Teams gibt es im Einkauf noch nicht: {v.unbekannteTeams.join(", ")}. Ihre Key Results werden ohne Team und
              ohne Budgetposten übernommen – am besten die Teams vorher unter Verwaltung anlegen.
            </p>
          )}
          {v.budgetAnTopKrs.length > 0 && (
            <p className="text-neutral-600 dark:text-neutral-400">
              Budget an Top-Level-KRs wird nicht übernommen, Budget hängt nur an Team-KRs:{" "}
              {v.budgetAnTopKrs.map((b) => `${b.kuerzel} ${formatEuro(b.cent)}`).join(", ")}.
            </p>
          )}
          {!bereitsAktuell && (
            <form onSubmit={ohneZuruecksetzen(uebernehmen)} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="zyklus" value={v.zyklus} />
              <input type="hidden" name="version" value={v.version} />
              <button type="submit" disabled={uebernimmt} className={knopfKlein}>
                {uebernimmt ? "Übernimmt …" : `Version ${v.version} übernehmen`}
              </button>
              <span className="text-neutral-500">
                Neue Budgetposten werden mit dem Vorschlag vorbelegt; bestehende Posten bleiben unverändert.
              </span>
            </form>
          )}
        </div>
      )}
      {ergebnis.fehler && <p role="alert" className="text-red-700 dark:text-red-400">{ergebnis.fehler}</p>}
      {ergebnis.meldung && <p role="status" className="text-green-700 dark:text-green-400">{ergebnis.meldung}</p>}
    </div>
  );
}
