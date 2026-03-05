type ExpenseStatus = "pending" | "approved" | "rejected" | "reviewing";

const STATUS_CONFIG: Record<ExpenseStatus, { label: string; classes: string }> = {
  pending:   { label: "Pendiente",   classes: "bg-amber-100 text-amber-800" },
  reviewing: { label: "En revisión", classes: "bg-blue-100 text-blue-800" },
  approved:  { label: "Aprobado",    classes: "bg-emerald-100 text-emerald-800" },
  rejected:  { label: "Rechazado",   classes: "bg-red-100 text-red-800" },
};

export function ExpenseStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as ExpenseStatus] ?? STATUS_CONFIG.pending;
  return (
    <span className={`badge ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
