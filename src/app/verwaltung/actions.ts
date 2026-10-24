"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseEuro } from "@/lib/geld";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { appUrl } from "@/lib/mail/benachrichtigen";

export type Status = { fehler?: string; gespeichert?: boolean };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

function ergebnis(error: { message: string } | null, fehlertext: string): Status {
  revalidatePath("/", "layout");
  return error ? { fehler: fehlertext } : { gespeichert: true };
}

export async function personSpeichern(_vorher: Status, formData: FormData): Promise<Status> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profile")
    .update({
      team_id: text(formData, "team_id") || null,
      ist_gf: formData.get("ist_gf") === "on",
      ist_einkauf: formData.get("ist_einkauf") === "on",
      ist_finanzen: formData.get("ist_finanzen") === "on",
      ist_admin: formData.get("ist_admin") === "on",
    })
    .eq("id", text(formData, "id"));
  return ergebnis(error, "Speichern fehlgeschlagen.");
}

export async function teamSpeichern(_vorher: Status, formData: FormData): Promise<Status> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!name) return { fehler: "Bitte einen Namen angeben." };
  const daten = { name, leitung_id: text(formData, "leitung_id") || null };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("team").update(daten).eq("id", id)
    : await supabase.from("team").insert(daten);
  return ergebnis(error, error?.message.includes("unique") ? "Diesen Teamnamen gibt es schon." : "Speichern fehlgeschlagen.");
}

export async function einstellungenSpeichern(_vorher: Status, formData: FormData): Promise<Status> {
  const grenze = parseEuro(text(formData, "gf_grenze"));
  if (grenze === null) return { fehler: "Bitte einen Betrag angeben, z. B. 1.000,00." };
  const supabase = await createClient();
  const { error } = await supabase.from("einstellungen").update({ gf_grenze_cent: grenze }).eq("id", true);
  return ergebnis(error, "Speichern fehlgeschlagen.");
}

export type TestmailStatus = { fehler?: string; gesendetAn?: string };

export async function testmailSenden(): Promise<TestmailStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profile").select("email, ist_admin").eq("id", user!.id).single();
  if (!profil?.ist_admin) return { fehler: "Keine Berechtigung." };
  if (!mailKonfiguration()) return { fehler: "E-Mail-Versand ist noch nicht eingerichtet (Env-Variablen fehlen)." };

  const betreff = "Testmail – Polycare Einkauf";
  const protokoll = (status: "gesendet" | "fehler", fehler = "") =>
    supabase.rpc("mail_protokollieren", {
      p_anforderung: null as unknown as string,
      p_anlass: "test",
      p_an: [profil.email],
      p_betreff: betreff,
      p_status: status,
      p_fehler: fehler,
    });
  try {
    const link = await appUrl();
    await sendeMail({
      an: [profil.email],
      betreff,
      text: `Der E-Mail-Versand funktioniert.\n\n${link}`,
      html: `<p>Der E-Mail-Versand funktioniert.</p><p><a href="${link}">${link}</a></p>`,
    });
    await protokoll("gesendet");
    revalidatePath("/verwaltung");
    return { gesendetAn: profil.email };
  } catch (e) {
    const fehler = e instanceof Error ? e.message : String(e);
    await protokoll("fehler", fehler);
    revalidatePath("/verwaltung");
    return { fehler };
  }
}
