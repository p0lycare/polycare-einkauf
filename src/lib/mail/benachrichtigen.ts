import "server-only";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { formatEuro } from "@/lib/format";
import { formatNr } from "@/lib/einkauf/anforderung";
import { mailKonfiguration, sendeMail } from "./graph";
import { alsMail, type Anlass } from "./vorlagen";

export async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  // Links in Mails nie aus Request-Headern bauen, die ein Client setzen kann – nur lokal als Notlösung
  if (process.env.VERCEL_ENV === "production") throw new Error("APP_URL ist nicht gesetzt");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/**
 * Benachrichtigt die Beteiligten nach einem Workflow-Schritt. Schlägt nie fehl:
 * Ein Mailproblem darf den Workflow nicht blockieren, es wird nur protokolliert.
 */
export async function benachrichtige(
  supabase: SupabaseClient<Database>,
  anforderungId: string,
  anlass: Anlass,
  extra: { grund?: string } = {},
): Promise<void> {
  let an: string[] = [];
  let betreff: string | null = null;
  const protokolliere = (status: "gesendet" | "fehler" | "nicht_eingerichtet", fehler = "") =>
    supabase
      .rpc("mail_protokollieren", {
        p_anforderung: anforderungId,
        p_anlass: anlass,
        p_an: an,
        p_betreff: betreff ?? anlass,
        p_status: status,
        p_fehler: fehler,
      })
      .then(
        () => undefined,
        () => undefined,
      );

  try {
    const { data: empfaenger } = await supabase.rpc("mail_empfaenger", { p_anforderung: anforderungId, p_anlass: anlass });
    an = (empfaenger ?? []).map((e) => e.email).filter(Boolean);
    if (!an.length) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: a } = await supabase
      .from("anforderung")
      .select("nr, titel, betrag_cent, status, ausserplanmaessig, bestellnummer, team(name), ersteller:profile!anforderung_ersteller_id_fkey(name)")
      .eq("id", anforderungId)
      .single();
    if (!a || !user) return;
    const { data: handelnd } = await supabase.from("profile").select("name").eq("id", user.id).maybeSingle();

    const mail = alsMail(anlass, {
      nr: formatNr(a.nr),
      titel: a.titel,
      betrag: formatEuro(a.betrag_cent),
      team: a.team?.name ?? "",
      anfordernd: a.ersteller?.name ?? "",
      link: `${await appUrl()}/anforderungen/${anforderungId}`,
      handelnd: handelnd?.name ?? "",
      stufeGf: a.status === "bei_gf",
      ausserplanmaessig: a.ausserplanmaessig,
      grund: extra.grund,
      bestellnummer: a.bestellnummer ?? undefined,
    });
    betreff = mail.betreff;

    if (!mailKonfiguration()) return await protokolliere("nicht_eingerichtet");
    await sendeMail({ an, betreff: mail.betreff, text: mail.text, html: mail.html });
    await protokolliere("gesendet");
  } catch (e) {
    console.error("Benachrichtigung fehlgeschlagen", e);
    await protokolliere("fehler", e instanceof Error ? e.message : String(e));
  }
}
