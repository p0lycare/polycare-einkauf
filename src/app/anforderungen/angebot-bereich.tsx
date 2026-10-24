"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { verkleinereBild } from "@/lib/bild";
import type { AngebotVorschlag } from "@/lib/ki/angebot-schema";
import { angebotPerKiAuslesen, dateiEntfernen, type NeueDatei } from "./actions";

export type VorhandeneDatei = { id: string; name: string };

/**
 * Angebote hochladen (vor dem Speichern in den eigenen Ordner) und auf Wunsch per KI auslesen.
 * Die neuen Dateien gehen als JSON im Feld "dateien" mit dem Formular an den Server.
 */
export function AngebotBereich({
  userId,
  kiAktiv,
  vorhanden,
  onVorschlag,
}: {
  userId: string;
  kiAktiv: boolean;
  vorhanden: VorhandeneDatei[];
  onVorschlag: (v: AngebotVorschlag) => void;
}) {
  const router = useRouter();
  const [neu, setNeu] = useState<NeueDatei[]>([]);
  const [laedtHoch, setLaedtHoch] = useState(false);
  const [ki, setKi] = useState<{ laeuft: boolean; hinweis?: string | null; fehler?: string }>({ laeuft: false });
  const [fehler, setFehler] = useState<string | null>(null);
  const [entfernt, starteEntfernen] = useTransition();

  async function dateiWaehlen(f: File | null) {
    setFehler(null);
    setKi({ laeuft: false });
    if (!f) return;

    setLaedtHoch(true);
    let datei: NeueDatei;
    try {
      const verkleinert = await verkleinereBild(f);
      const endung = verkleinert.name.split(".").pop()?.toLowerCase() || "pdf";
      const pfad = `${userId}/${crypto.randomUUID()}.${endung}`;
      const { error } = await createClient().storage.from("angebote").upload(pfad, verkleinert, {
        contentType: verkleinert.type,
      });
      if (error) throw error;
      datei = { pfad, name: f.name, content_type: verkleinert.type, groesse: verkleinert.size };
      setNeu((liste) => [...liste, datei]);
    } catch {
      setFehler("Das Angebot konnte nicht hochgeladen werden (max. 10 MB, PDF oder Bild).");
      return;
    } finally {
      setLaedtHoch(false);
    }

    if (!kiAktiv) return;
    setKi({ laeuft: true });
    try {
      const antwort = await angebotPerKiAuslesen(datei.pfad);
      if (antwort.vorschlag?.istAngebot) onVorschlag(antwort.vorschlag);
      setKi({
        laeuft: false,
        fehler: antwort.fehler ?? (antwort.vorschlag && !antwort.vorschlag.istAngebot ? "Das sieht nicht wie ein Angebot aus – bitte selbst ausfüllen." : undefined),
        hinweis: antwort.vorschlag?.istAngebot
          ? [
              "Vorschlag übernommen – bitte prüfen.",
              antwort.vorschlag.betragCent === null && "Betrag bitte selbst eintragen.",
              antwort.vorschlag.hinweis,
            ]
              .filter(Boolean)
              .join(" ")
          : null,
      });
    } catch {
      setKi({ laeuft: false, fehler: "Das Angebot konnte gerade nicht ausgelesen werden." });
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
      <input type="hidden" name="dateien" value={JSON.stringify(neu)} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Angebot (PDF oder Foto)</span>
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={laedtHoch || ki.laeuft}
          onChange={(e) => {
            void dateiWaehlen(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
          className="text-sm file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:file:border-neutral-700 dark:file:bg-neutral-900"
        />
        <span className="text-xs text-neutral-500">
          {kiAktiv ? "Optional. Claude liest das Angebot aus und füllt das Formular vor." : "Optional. Wird an die Anforderung gehängt."}
        </span>
      </label>

      {(vorhanden.length > 0 || neu.length > 0) && (
        <ul className="text-sm">
          {vorhanden.map((d) => (
            <li key={d.id} className="flex items-center gap-3">
              <span className="truncate">📎 {d.name}</span>
              <button
                type="button"
                disabled={entfernt}
                onClick={() =>
                  starteEntfernen(async () => {
                    const r = await dateiEntfernen(d.id);
                    if (r.fehler) setFehler(r.fehler);
                    router.refresh();
                  })
                }
                className="text-xs text-red-700 hover:underline dark:text-red-400"
              >
                Entfernen
              </button>
            </li>
          ))}
          {neu.map((d) => (
            <li key={d.pfad} className="truncate">
              📎 {d.name} <span className="text-xs text-neutral-500">(wird beim Speichern angehängt)</span>
            </li>
          ))}
        </ul>
      )}

      {laedtHoch && <p className="text-sm text-neutral-500">Lädt hoch …</p>}
      {ki.laeuft && <p className="text-sm text-neutral-500">Claude liest das Angebot aus …</p>}
      {ki.hinweis && <p role="status" className="text-sm text-green-800 dark:text-green-300">{ki.hinweis}</p>}
      {(fehler || ki.fehler) && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {fehler ?? ki.fehler}
        </p>
      )}
    </div>
  );
}
