import Link from "next/link";
import { formatDatum, formatEuro } from "@/lib/format";
import { formatNr, type AnforderungStatus } from "@/lib/einkauf/anforderung";
import { leer } from "@/lib/stil";
import { AusserplanBadge, StatusBadge } from "./status-badge";

export type ListenEintrag = {
  id: string;
  nr: number;
  titel: string;
  lieferant: string | null;
  betrag_cent: number;
  status: AnforderungStatus;
  ausserplanmaessig: boolean;
  created_at: string;
  eingereicht_am: string | null;
  team_id: string;
  team: { name: string } | null;
  ersteller?: { name: string } | null;
};

/** Spalten für .select(), passend zu ListenEintrag */
export const LISTEN_SPALTEN =
  "id, nr, titel, lieferant, betrag_cent, status, ausserplanmaessig, created_at, eingereicht_am, team_id, team(name), ersteller:profile!anforderung_ersteller_id_fkey(name)";

export function AnforderungsListe({ eintraege, leerText }: { eintraege: ListenEintrag[]; leerText: string }) {
  if (!eintraege.length) return <p className={leer}>{leerText}</p>;

  return (
    <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {eintraege.map((a) => (
        <li key={a.id}>
          <Link href={`/anforderungen/${a.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900">
            <div className="min-w-0">
              <p className="truncate font-medium">{a.titel}</p>
              <p className="truncate text-sm text-neutral-500">
                {formatNr(a.nr)} · {a.team?.name}
                {a.ersteller && ` · ${a.ersteller.name}`}
                {a.lieferant && ` · ${a.lieferant}`} · {formatDatum(a.eingereicht_am ?? a.created_at)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="tabular-nums">{formatEuro(a.betrag_cent)}</span>
              <div className="flex gap-1">
                {a.ausserplanmaessig && <AusserplanBadge />}
                <StatusBadge status={a.status} />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
