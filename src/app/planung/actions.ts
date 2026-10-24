"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseEuro } from "@/lib/geld";
import type { Database } from "@/lib/supabase/database.types";

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
