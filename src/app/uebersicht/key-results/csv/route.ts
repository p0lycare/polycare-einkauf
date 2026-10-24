import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatNr, STATUS_TEXT, type AnforderungStatus } from "@/lib/einkauf/anforderung";
import { ladeIch } from "@/lib/einkauf/ich";
import { alsCsv } from "@/lib/einkauf/key-results";
import { formatDatum } from "@/lib/format";

type Zeile = {
  nr: number;
  titel: string;
  lieferant: string | null;
  betrag_cent: number;
  status: AnforderungStatus;
  eingereicht_am: string | null;
  bestellt_am: string | null;
  bestellnummer: string | null;
  team: { name: string } | null;
  key_result: { kuerzel: string; titel: string } | null;
  budgetposten: { name: string } | null;
};

/** Alle eingereichten Anforderungen einer Periode mit Key Result, für Finanzen als CSV */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const ich = await ladeIch(supabase);
  if (!ich || !(ich.ist_gf || ich.ist_finanzen || ich.ist_admin)) {
    return new NextResponse("Keine Berechtigung", { status: 403 });
  }

  const periodeId = request.nextUrl.searchParams.get("periode") ?? "";
  const { data: periode } = await supabase.from("periode").select("id, name").eq("id", periodeId).maybeSingle();
  if (!periode) return new NextResponse("Periode nicht gefunden", { status: 404 });

  const { data } = await supabase
    .from("anforderung")
    .select(
      "nr, titel, lieferant, betrag_cent, status, eingereicht_am, bestellt_am, bestellnummer, team(name), key_result(kuerzel, titel), budgetposten(name)",
    )
    .eq("periode_id", periode.id)
    .in("status", ["bei_teamleitung", "bei_gf", "freigegeben", "bestellt"])
    .order("nr")
    .returns<Zeile[]>();

  const csv = alsCsv(
    (data ?? [])
      .map((a) => ({
        key_result: a.key_result ? `${a.key_result.kuerzel} ${a.key_result.titel}` : "ohne Key Result",
        team: a.team?.name ?? "",
        nr: formatNr(a.nr),
        titel: a.titel,
        lieferant: a.lieferant ?? "",
        budgetposten: a.budgetposten?.name ?? "außerplanmäßig",
        status: STATUS_TEXT[a.status],
        betrag_cent: a.betrag_cent,
        eingereicht_am: a.eingereicht_am ? formatDatum(a.eingereicht_am) : "",
        bestellt_am: a.bestellt_am ? formatDatum(a.bestellt_am) : "",
        bestellnummer: a.bestellnummer ?? "",
      }))
      .sort((x, y) => x.key_result.localeCompare(y.key_result, "de") || x.nr.localeCompare(y.nr)),
  );

  const dateiname = `key-results-${periode.name.replace(/[^A-Za-z0-9]+/g, "-")}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dateiname}"`,
      "Cache-Control": "no-store",
    },
  });
}
