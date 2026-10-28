import "server-only";
import { okrSetSchema, type OkrSet } from "./okr-set";

const STANDARD_URL = "https://polycare-okr.vercel.app";

export function okrKonfiguriert(): boolean {
  return !!process.env.OKR_API_KEY;
}

/** Holt das eingefrorene OKR-Set eines Zyklus; wirft mit verständlicher Meldung */
export async function holeOkrSet(zyklus: string): Promise<OkrSet> {
  const schluessel = process.env.OKR_API_KEY;
  if (!schluessel) throw new Error("Die Verbindung zum OKR-Dashboard ist noch nicht eingerichtet (OKR_API_KEY fehlt).");
  const basis = (process.env.OKR_DASHBOARD_URL ?? STANDARD_URL).replace(/\/$/, "");

  let antwort: Response;
  try {
    antwort = await fetch(`${basis}/api/v1/zyklen/${encodeURIComponent(zyklus.toUpperCase())}`, {
      headers: { Authorization: `Bearer ${schluessel}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("Das OKR-Dashboard ist gerade nicht erreichbar. Bitte später noch einmal versuchen.");
  }
  if (antwort.status === 401 || antwort.status === 404) {
    throw new Error(
      `Für ${zyklus.toUpperCase()} gibt es kein eingefrorenes OKR-Set – oder der Schlüssel ist ungültig bzw. gesperrt.`,
    );
  }
  if (!antwort.ok) throw new Error(`Das OKR-Dashboard antwortet mit Fehler ${antwort.status}.`);

  const geprueft = okrSetSchema.safeParse(await antwort.json().catch(() => null));
  if (!geprueft.success) throw new Error("Die Antwort des OKR-Dashboards hat ein unerwartetes Format.");
  return geprueft.data;
}
