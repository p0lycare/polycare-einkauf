"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Erledigt } from "./erledigt";
import { createClient } from "@/lib/supabase/server";
import { benachrichtige } from "@/lib/mail/benachrichtigen";

export type WorkflowStatus = { fehler?: string };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/** Fehlermeldungen der Datenbankfunktionen sind bereits für Menschen formuliert */
function meldung(error: { message: string } | null): WorkflowStatus {
  return error ? { fehler: error.message } : {};
}

function aktualisieren(id: string) {
  revalidatePath(`/anforderungen/${id}`);
  revalidatePath("/", "layout");
}

/** Nach Erfolg zurück auf die Anforderung, dort erscheint die passende Rückmeldung */
function fertig(id: string, erledigt: Erledigt): never {
  aktualisieren(id);
  redirect(`/anforderungen/${id}?erledigt=${erledigt}`);
}

export async function einreichen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("anforderung_einreichen", { p_id: id });
  if (error) return meldung(error);
  await benachrichtige(supabase, id, "zur_freigabe");
  const { data } = await supabase.from("anforderung").select("status").eq("id", id).single();
  fertig(id, data?.status === "bei_gf" ? "eingereicht_gf" : "eingereicht_tl");
}

export async function zurueckziehen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("anforderung_zurueckziehen", { p_id: id });
  if (error) return meldung(error);
  fertig(id, "zurueckgezogen");
}

export async function freigeben(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { data: neu, error } = await supabase.rpc("anforderung_freigeben", {
    p_id: id,
    p_kommentar: text(formData, "kommentar") || undefined,
  });
  if (error) return meldung(error);
  if (neu === "bei_gf") {
    await benachrichtige(supabase, id, "zur_freigabe");
    fertig(id, "freigegeben_gf");
  }
  await Promise.all([benachrichtige(supabase, id, "freigegeben"), benachrichtige(supabase, id, "zum_bestellen")]);
  fertig(id, "freigegeben");
}

export async function ablehnen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const grund = text(formData, "grund");
  if (!grund) return { fehler: "Bitte einen Grund für die Ablehnung angeben." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("anforderung_ablehnen", { p_id: id, p_grund: grund });
  if (error) return meldung(error);
  await benachrichtige(supabase, id, "abgelehnt", { grund });
  fertig(id, "abgelehnt");
}

export async function bestellen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("anforderung_bestellen", {
    p_id: id,
    p_bestellnummer: text(formData, "bestellnummer") || undefined,
  });
  if (error) return meldung(error);
  await benachrichtige(supabase, id, "bestellt");
  fertig(id, "bestellt");
}
