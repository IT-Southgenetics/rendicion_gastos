import { ADVANCE_STATUS_LABELS, getAdvanceStatusClass } from "@/lib/advances";

export function AdvanceStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${getAdvanceStatusClass(status)}`}>
      {ADVANCE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
