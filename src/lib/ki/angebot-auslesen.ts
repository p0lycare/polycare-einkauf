import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ANWEISUNG, alsVorschlag, angebotSchema, type AngebotVorschlag } from "./angebot-schema";

export type { AngebotVorschlag };

export function kiVerfuegbar(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Liest ein Angebot (PDF oder Foto) mit Claude aus. Das Ergebnis ist ein Vorschlag;
 * die anfordernde Person prüft und speichert ihn im Formular.
 */
export async function angebotAuslesen(datei: {
  inhalt: Uint8Array;
  contentType: string;
}): Promise<AngebotVorschlag | { fehler: string }> {
  if (!kiVerfuegbar()) return { fehler: "Das Auslesen per KI ist noch nicht eingerichtet." };

  const daten = Buffer.from(datei.inhalt).toString("base64");
  const quelle: Anthropic.Beta.BetaContentBlockParam | null =
    datei.contentType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: daten } }
      : datei.contentType === "image/jpeg" || datei.contentType === "image/png" || datei.contentType === "image/webp"
        ? { type: "image", source: { type: "base64", media_type: datei.contentType, data: daten } }
        : null;
  if (!quelle) return { fehler: "Dieses Dateiformat kann nicht ausgelesen werden (bitte PDF, JPEG oder PNG)." };

  const client = new Anthropic();
  try {
    const antwort = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(angebotSchema) },
      system: ANWEISUNG,
      messages: [{ role: "user", content: [quelle, { type: "text", text: "Lies dieses Angebot aus." }] }],
    });

    if (antwort.stop_reason === "refusal" || !antwort.parsed_output) {
      return { fehler: "Das Angebot konnte nicht ausgelesen werden." };
    }
    return alsVorschlag(antwort.parsed_output);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { fehler: "Gerade sind zu viele Anfragen unterwegs – bitte gleich noch einmal versuchen." };
    if (e instanceof Anthropic.AuthenticationError) return { fehler: "Der KI-Zugang ist ungültig (API-Schlüssel prüfen)." };
    if (e instanceof Anthropic.APIError) {
      console.error("Angebot auslesen fehlgeschlagen", e.status, e.message);
      return { fehler: "Das Angebot konnte gerade nicht ausgelesen werden." };
    }
    throw e;
  }
}
