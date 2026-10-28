import { STATUS_TEXT, type AnforderungStatus } from "@/lib/einkauf/anforderung";

const FARBE: Record<AnforderungStatus, string> = {
  entwurf: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  bei_teamleitung: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  bei_gf: "bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  freigegeben: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  bestellt: "bg-marke-hell text-marke-dunkel",
  abgelehnt: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export function StatusBadge({ status }: { status: AnforderungStatus }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${FARBE[status]}`}>{STATUS_TEXT[status]}</span>;
}

export function AusserplanBadge() {
  return (
    <span className="rounded bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-200">
      außerplanmäßig
    </span>
  );
}
