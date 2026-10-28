"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEuro } from "@/lib/geld";
import { angebotAuslesen, type AngebotVorschlag } from "@/lib/ki/angebot-auslesen";

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
  if (betrag > 1_000_000_00) return { fehler: "Der Betrag ist zu hoch – bitte prüfen (höchstens 1.000.000 €)." };
  const gewuenschtBis = text(formData, "gewuenscht_bis");
  if (gewuenschtBis && !/^\d{4}-\d{2}-\d{2}$/.test(gewuenschtBis)) return { fehler: "Bitte ein gültiges Datum bei „Gewünscht bis“ angeben." };
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
    if (error?.message.includes("row-level security")) {
      return { fehler: "Für dieses Team dürfen nur seine Mitglieder anfordern." };
    }
    if (error?.message.includes("foreign key")) {
      return { fehler: "Budgetposten oder Key Result passen nicht zu Team und Periode." };
    }
    return {
      fehler:
        "Speichern hat nicht geklappt. Eingereichte Anforderungen lassen sich nur nach dem Zurückziehen ändern; sonst bitte noch einmal versuchen und bei Wiederholung der Verwaltung Bescheid geben.",
    };
  }

  // Die Anforderung ist gespeichert; schlägt das Anhängen fehl, zeigt die Detailseite einen Hinweis
  const angehaengt = await dateienAnhaengen(supabase, user.id, data.id, formData);
  revalidatePath("/");
  revalidatePath(`/anforderungen/${data.id}`);
  redirect(`/anforderungen/${data.id}${angehaengt ? "" : "?angebot=fehler"}`);
}

export async function anforderungLoeschen(formData: FormData) {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { data: dateien } = await supabase.from("anforderung_datei").select("pfad").eq("anforderung_id", id);
  const { data: geloescht } = await supabase.from("anforderung").delete().eq("id", id).select("id");
  if (geloescht?.length && dateien?.length) await supabase.storage.from("angebote").remove(dateien.map((d) => d.pfad));
  revalidatePath("/");
  redirect("/");
}

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type NeueDatei = { pfad: string; name: string; content_type: string; groesse: number };

/** Registriert hochgeladene Angebote an der Anforderung (Feld "dateien": JSON-Liste); false bei Fehler. */
async function dateienAnhaengen(supabase: Supabase, userId: string, anforderungId: string, formData: FormData) {
  let dateien: NeueDatei[];
  try {
    dateien = JSON.parse(text(formData, "dateien") || "[]");
  } catch {
    return false;
  }
  const neu = dateien.filter((d) => typeof d.pfad === "string" && d.pfad.startsWith(`${userId}/`));
  if (!neu.length) return true;
  const { error } = await supabase.from("anforderung_datei").upsert(
    neu.map((d) => ({
      anforderung_id: anforderungId,
      pfad: d.pfad,
      name: String(d.name).slice(0, 200),
      content_type: d.content_type || null,
      groesse: Number(d.groesse) || null,
    })),
    { onConflict: "pfad", ignoreDuplicates: true },
  );
  return !error;
}

export async function dateiEntfernen(id: string): Promise<{ fehler?: string }> {
  const supabase = await createClient();
  const { data } = await supabase.from("anforderung_datei").delete().eq("id", id).select("pfad, anforderung_id");
  if (!data?.length) return { fehler: "Das Angebot kann nicht mehr entfernt werden." };
  await supabase.storage.from("angebote").remove([data[0].pfad]);
  revalidatePath(`/anforderungen/${data[0].anforderung_id}`);
  return {};
}

export type AuslesenErgebnis = { fehler?: string; vorschlag?: AngebotVorschlag };

/** Liest ein gerade hochgeladenes Angebot per KI aus und liefert einen Vorschlag fürs Formular. */
export async function angebotPerKiAuslesen(pfad: string): Promise<AuslesenErgebnis> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !pfad.startsWith(`${user.id}/`)) return { fehler: "Ungültige Datei." };

  const { data: blob } = await supabase.storage.from("angebote").download(pfad);
  if (!blob) return { fehler: "Das Angebot wurde nicht gefunden." };

  const ergebnis = await angebotAuslesen({ inhalt: new Uint8Array(await blob.arrayBuffer()), contentType: blob.type });
  return "fehler" in ergebnis ? { fehler: ergebnis.fehler } : { vorschlag: ergebnis };
}
