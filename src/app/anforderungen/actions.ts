"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEuro } from "@/lib/geld";

export type FormularStatus = { fehler?: string };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

export async function anforderungSpeichern(_vorher: FormularStatus, formData: FormData): Promise<FormularStatus> {
  const id = text(formData, "id") || null;
  const titel = text(formData, "titel");
  const periodeId = text(formData, "periode_id");
  const teamId = text(formData, "team_id");
  const betrag = parseEuro(text(formData, "betrag"));
  const link = text(formData, "link") || null;

  if (!titel) return { fehler: "Bitte angeben, was bestellt werden soll." };
  if (!periodeId || !teamId) return { fehler: "Bitte Periode und Team auswählen." };
  if (!betrag) return { fehler: "Bitte den Betrag brutto angeben, z. B. 249,90." };
  if (link && !/^https?:\/\//i.test(link)) return { fehler: "Der Link muss mit http:// oder https:// beginnen." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const daten = {
    titel,
    periode_id: periodeId,
    team_id: teamId,
    budgetposten_id: text(formData, "budgetposten_id") || null,
    key_result_id: text(formData, "key_result_id") || null,
    beschreibung: text(formData, "beschreibung") || null,
    begruendung: text(formData, "begruendung") || null,
    lieferant: text(formData, "lieferant") || null,
    link,
    betrag_cent: betrag,
    gewuenscht_bis: text(formData, "gewuenscht_bis") || null,
  };

  const { data, error } = id
    ? await supabase.from("anforderung").update(daten).eq("id", id).select("id").single()
    : await supabase
        .from("anforderung")
        .insert({ ...daten, ersteller_id: user.id })
        .select("id")
        .single();

  if (error || !data) {
    if (error?.message.includes("foreign key")) {
      return { fehler: "Budgetposten oder Key Result passen nicht zu Team und Periode." };
    }
    return { fehler: "Speichern fehlgeschlagen. Ist die Anforderung noch im Entwurf?" };
  }

  revalidatePath("/");
  revalidatePath(`/anforderungen/${data.id}`);
  redirect(`/anforderungen/${data.id}`);
}

export async function anforderungLoeschen(formData: FormData) {
  const id = text(formData, "id");
  const supabase = await createClient();
  await supabase.from("anforderung").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}
