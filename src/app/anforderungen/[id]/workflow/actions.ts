"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function einreichen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("anforderung_einreichen", { p_id: id });
  aktualisieren(id);
  return meldung(error);
}

export async function zurueckziehen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("anforderung_zurueckziehen", { p_id: id });
  aktualisieren(id);
  return meldung(error);
}

export async function freigeben(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("anforderung_freigeben", {
    p_id: id,
    p_kommentar: text(formData, "kommentar") || undefined,
  });
  aktualisieren(id);
  return meldung(error);
}

export async function ablehnen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const grund = text(formData, "grund");
  if (!grund) return { fehler: "Bitte einen Grund für die Ablehnung angeben." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("anforderung_ablehnen", { p_id: id, p_grund: grund });
  aktualisieren(id);
  return meldung(error);
}

export async function bestellen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("anforderung_bestellen", {
    p_id: id,
    p_bestellnummer: text(formData, "bestellnummer") || undefined,
  });
  aktualisieren(id);
  return meldung(error);
}
