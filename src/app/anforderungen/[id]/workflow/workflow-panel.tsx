"use client";

import { useActionState, useState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { feld, knopf, knopfSekundaer } from "@/lib/stil";
import { ablehnen, bestellen, einreichen, freigeben, zurueckziehen, type WorkflowStatus } from "./actions";

export type WorkflowRechte = {
  einreichen: boolean;
  zurueckziehen: boolean;
  freigeben: boolean;
  bestellen: boolean;
};

function Fehler({ status }: { status: WorkflowStatus }) {
  return status.fehler ? (
    <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
      {status.fehler}
    </p>
  ) : null;
}

function Einfach({
  id,
  aktion,
  text,
  sekundaer,
}: {
  id: string;
  aktion: typeof einreichen;
  text: string;
  sekundaer?: boolean;
}) {
  const [status, absenden, laeuft] = useActionState(aktion, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <Fehler status={status} />
      <div>
        <button type="submit" disabled={laeuft} className={sekundaer ? knopfSekundaer : knopf}>
          {laeuft ? "…" : text}
        </button>
      </div>
    </form>
  );
}

function Ablehnen({ id, onAbbrechen }: { id: string; onAbbrechen: () => void }) {
  const [status, absenden, laeuft] = useActionState(ablehnen, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Grund der Ablehnung</span>
        <textarea name="grund" required rows={2} className={feld} placeholder="z. B. bitte günstigeres Angebot einholen" />
      </label>
      <Fehler status={status} />
      <div className="flex gap-3">
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : "Ablehnen"}
        </button>
        <button type="button" onClick={onAbbrechen} className={knopfSekundaer}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function Freigeben({ id }: { id: string }) {
  const [status, absenden, laeuft] = useActionState(freigeben, {});
  const [ablehnung, setAblehnung] = useState(false);
  if (ablehnung) return <Ablehnen id={id} onAbbrechen={() => setAblehnung(false)} />;
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Kommentar</span>
        <input name="kommentar" className={feld} placeholder="optional" />
      </label>
      <Fehler status={status} />
      <div className="flex gap-3">
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : "Freigeben"}
        </button>
        <button type="button" onClick={() => setAblehnung(true)} className={knopfSekundaer}>
          Ablehnen …
        </button>
      </div>
    </form>
  );
}

function Bestellen({ id }: { id: string }) {
  const [status, absenden, laeuft] = useActionState(bestellen, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Bestellnummer</span>
        <input name="bestellnummer" className={feld} placeholder="optional, z. B. Auftragsnummer des Lieferanten" />
      </label>
      <Fehler status={status} />
      <div>
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : "Als bestellt markieren"}
        </button>
      </div>
    </form>
  );
}

export function WorkflowPanel({ id, rechte, titel }: { id: string; rechte: WorkflowRechte; titel: string }) {
  if (!Object.values(rechte).some(Boolean)) return null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border-2 border-neutral-900 p-4 dark:border-neutral-100">
      <h2 className="font-medium">{titel}</h2>
      {rechte.einreichen && <Einfach id={id} aktion={einreichen} text="Zur Freigabe einreichen" />}
      {rechte.zurueckziehen && <Einfach id={id} aktion={zurueckziehen} text="Zurückziehen und bearbeiten" sekundaer />}
      {rechte.freigeben && <Freigeben id={id} />}
      {rechte.bestellen && <Bestellen id={id} />}
    </section>
  );
}
