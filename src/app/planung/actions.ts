"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseEuro } from "@/lib/geld";
import type { Database } from "@/lib/supabase/database.types";
import { ladeIch } from "@/lib/einkauf/ich";
import { holeOkrSet } from "@/lib/okr/abruf";
import { vergleiche, type Bestand, type Vergleich } from "@/lib/okr/okr-set";

export type Status = { fehler?: string; gespeichert?: boolean };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

function ergebnis(error: { message: string; code?: string } | null, fehlertext: string): Status {
  revalidatePath("/planung");
  revalidatePath("/budget");
  if (!error) return { gespeichert: true };
  if (error.code === "23505") return { fehler: "Dieser Name ist schon vergeben." };
  if (error.code === "23503") return { fehler: "Wird noch von Anforderungen verwendet." };
  return { fehler: fehlertext };
}

const PERIODE_STATUS = ["planung", "aktiv", "abgeschlossen"] as const;

export async function periodeSpeichern(_vorher: Status, formData: FormData): Promise<Status> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const beginn = text(formData, "beginn");
  const ende = text(formData, "ende");
  const status = text(formData, "status") as Database["public"]["Enums"]["periode_status"];
  if (!name || !beginn || !ende) return { fehler: "Bitte Name, Beginn und Ende angeben." };
  if (ende <= beginn) return { fehler: "Das Ende muss nach dem Beginn liegen." };
  if (!PERIODE_STATUS.includes(status)) return { fehler: "Unbekannter Status." };

  const supabase = await createClient();
  const daten = { name, beginn, ende, status };
  const { error } = id
    ? await supabase.from("periode").update(daten).eq("id", id)
    : await supabase.from("periode").insert(daten);
  return ergebnis(error, "Speichern fehlgeschlagen. Nur Finanzen und Admins pflegen Perioden.");
}

export async function keyResultSpeichern(_vorher: Status, formData: FormData): Promise<Status> {
  const id = text(formData, "id");
  const kuerzel = text(formData, "kuerzel");
  const titel = text(formData, "titel");
  if (!kuerzel || !titel) return { fehler: "Bitte Kürzel und Titel angeben." };
  const daten = { kuerzel, titel, team_id: text(formData, "team_id") || null };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("key_result").update(daten).eq("id", id)
    : await supabase.from("key_result").insert({ ...daten, periode_id: text(formData, "periode_id") });
  return ergebnis(error, "Speichern fehlgeschlagen.");
}

export async function keyResultLoeschen(_vorher: Status, formData: FormData): Promise<Status> {
  const supabase = await createClient();
  const { error } = await supabase.from("key_result").delete().eq("id", text(formData, "id"));
  return ergebnis(error, "Löschen fehlgeschlagen.");
}

export async function postenSpeichern(_vorher: Status, formData: FormData): Promise<Status> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const geplant = parseEuro(text(formData, "geplant") || "0");
  if (!name) return { fehler: "Bitte einen Namen angeben." };
  if (geplant === null) return { fehler: "Bitte den Betrag brutto angeben, z. B. 5.000,00." };
  const daten = { name, geplant_cent: geplant, key_result_id: text(formData, "key_result_id") || null };

  const supabase = await createClient();
  // RLS lässt Schreibzugriffe ohne Berechtigung still ins Leere laufen – darum Zeile zurückholen
  const { data, error } = id
    ? await supabase.from("budgetposten").update(daten).eq("id", id).select("id")
    : await supabase
        .from("budgetposten")
        .insert({ ...daten, periode_id: text(formData, "periode_id"), team_id: text(formData, "team_id") })
        .select("id");
  if (!error && !data?.length) return { fehler: "Keine Berechtigung, dieses Budget zu ändern." };
  return ergebnis(error, "Speichern fehlgeschlagen. Teamleitungen planen nur, solange die Periode in Planung ist.");
}

export async function postenLoeschen(_vorher: Status, formData: FormData): Promise<Status> {
  const supabase = await createClient();
  const { error } = await supabase.from("budgetposten").delete().eq("id", text(formData, "id"));
  return ergebnis(error, "Löschen fehlgeschlagen.");
}

export type KopierStatus = { fehler?: string; meldung?: string };

export async function periodeKopieren(_vorher: KopierStatus, formData: FormData): Promise<KopierStatus> {
  const quelle = text(formData, "quelle");
  const ziel = text(formData, "ziel");
  if (!quelle || !ziel) return { fehler: "Bitte eine Vorperiode wählen." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("periode_kopieren", { p_quelle: quelle, p_ziel: ziel }).single();
  revalidatePath("/planung");
  revalidatePath("/budget");
  if (error) {
    if (error.message.includes("Keine Berechtigung")) return { fehler: "Nur Finanzen und Admins kopieren Perioden." };
    if (error.message.includes("in Planung")) return { fehler: "Kopieren geht nur in eine Periode, die in Planung ist." };
    return { fehler: "Kopieren fehlgeschlagen." };
  }
  const { kopierte_key_results: kr, kopierte_posten: posten } = data;
  if (!kr && !posten) return { meldung: "Nichts zu übernehmen – alles ist schon vorhanden." };
  return { meldung: `${kr} Key Results und ${posten} Budgetposten übernommen. Beträge bitte prüfen.` };
}

// ---------------------------------------------------------------------------
// Übernahme aus dem OKR-Dashboard
// ---------------------------------------------------------------------------

export type OkrStatus = { fehler?: string; vergleich?: Vergleich; meldung?: string };

async function finanzenOderAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const ich = await ladeIch(supabase);
  return !!ich && (ich.ist_finanzen || ich.ist_admin);
}

/** Bisher Übernommenes zu einem Zyklus (Periode mit diesem Zyklus oder gleichem Namen) */
async function ladeBestand(supabase: Awaited<ReturnType<typeof createClient>>, zyklus: string): Promise<Bestand> {
  const { data: perioden } = await supabase.from("periode").select("id, name, okr_zyklus, okr_version");
  const periode =
    perioden?.find((p) => p.okr_zyklus === zyklus) ?? perioden?.find((p) => !p.okr_zyklus && p.name.toUpperCase() === zyklus);
  if (!periode) return { version: null, keyResults: [] };
  const { data } = await supabase
    .from("key_result")
    .select("okr_id, kuerzel, titel, okr_budget_vorschlag_cent, okr_entfallen, team(name)")
    .eq("periode_id", periode.id)
    .returns<(Omit<Bestand["keyResults"][number], "team"> & { team: { name: string } | null })[]>();
  return {
    version: periode.okr_version,
    keyResults: (data ?? []).map((k) => ({ ...k, team: k.team?.name ?? null })),
  };
}

export async function okrVorschau(_vorher: OkrStatus, formData: FormData): Promise<OkrStatus> {
  const zyklus = text(formData, "zyklus").toUpperCase();
  if (!/^\d{2}Z[1-3]$/.test(zyklus)) return { fehler: "Bitte den Zyklus angeben, z. B. 26Z3." };
  const supabase = await createClient();
  if (!(await finanzenOderAdmin(supabase))) return { fehler: "Nur Finanzen und Admins übernehmen OKR-Sets." };

  try {
    const [set, bestand, { data: teams }] = await Promise.all([
      holeOkrSet(zyklus),
      ladeBestand(supabase, zyklus),
      supabase.from("team").select("name"),
    ]);
    return { vergleich: vergleiche(set, bestand, (teams ?? []).map((t) => t.name)) };
  } catch (e) {
    return { fehler: e instanceof Error ? e.message : "Abruf fehlgeschlagen." };
  }
}

export async function okrUebernehmen(_vorher: OkrStatus, formData: FormData): Promise<OkrStatus> {
  const zyklus = text(formData, "zyklus").toUpperCase();
  const version = Number(text(formData, "version"));
  const supabase = await createClient();
  if (!(await finanzenOderAdmin(supabase))) return { fehler: "Nur Finanzen und Admins übernehmen OKR-Sets." };

  let set;
  try {
    set = await holeOkrSet(zyklus);
  } catch (e) {
    return { fehler: e instanceof Error ? e.message : "Abruf fehlgeschlagen." };
  }
  // Übernommen wird genau die Version, die in der Vorschau bestätigt wurde
  if (set.version.nummer !== version) {
    return { fehler: `Im OKR-Dashboard gibt es inzwischen Version ${set.version.nummer}. Bitte die Vorschau neu laden.` };
  }

  const { data, error } = await supabase.rpc("okr_uebernehmen", { p_set: set });
  revalidatePath("/planung");
  revalidatePath("/budget");
  if (error) {
    if (error.message.includes("key_result_periode_id_kuerzel_key")) {
      return { fehler: "Ein Kürzel aus dem OKR-Set ist in dieser Periode schon an ein anderes Key Result vergeben. Bitte unter Planung umbenennen." };
    }
    return { fehler: "Übernahme fehlgeschlagen." };
  }
  const e = data as { zyklus: string; version: number; neu: number; aktualisiert: number; entfallen: number; budgetposten: number; unbekannte_teams: string[] };
  const teile = [
    `${e.neu} neu`,
    `${e.aktualisiert} aktualisiert`,
    e.entfallen ? `${e.entfallen} als entfallen markiert` : null,
    `${e.budgetposten} Budgetposten vorbelegt`,
  ].filter(Boolean);
  const warnung = e.unbekannte_teams.length
    ? ` Ohne Team übernommen (Team in der Verwaltung anlegen und erneut übernehmen): ${e.unbekannte_teams.join(", ")}.`
    : "";
  return { meldung: `${e.zyklus}, Version ${e.version} übernommen: Key Results ${teile.join(", ")}.${warnung}` };
}
