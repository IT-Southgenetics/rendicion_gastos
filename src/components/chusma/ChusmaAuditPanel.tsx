'use client';

import Link from "next/link";
import { useMemo, useState } from "react";

type WorkflowStatus = "draft" | "submitted" | "needs_correction" | "approved" | "paid";

export type ChusmaAuditReport = {
  id: string;
  title: string | null;
  week_start: string;
  week_end: string;
  status: "open" | "closed";
  workflow_status: string | null;
  total_amount: number | null;
  user_id: string;
  employee: {
    full_name: string;
    email: string;
    department: string | null;
  } | null;
};

const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  draft: "Borrador",
  submitted: "En revisión",
  needs_correction: "Devuelta al empleado",
  approved: "Cerrada / Aprobada",
  paid: "Pagada",
};

function badgeFor(ws: WorkflowStatus) {
  if (ws === "submitted") return "bg-amber-100 text-amber-700";
  if (ws === "approved") return "bg-emerald-100 text-emerald-700";
  if (ws === "paid") return "bg-blue-100 text-blue-700";
  if (ws === "needs_correction") return "bg-rose-100 text-rose-700";
  return "bg-gray-100 text-gray-700";
}

export function ChusmaAuditPanel({ reports }: { reports: ChusmaAuditReport[] }) {
  const [q, setQ] = useState("");
  const [workflow, setWorkflow] = useState<"all" | WorkflowStatus>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const byWorkflow = reports.filter((r) => {
      const ws = (r.workflow_status ?? "draft") as WorkflowStatus;
      return workflow === "all" ? true : ws === workflow;
    });

    const byText = needle.length
      ? byWorkflow.filter((r) => {
          const emp = r.employee;
          const s = [
            r.title ?? "",
            emp?.full_name ?? "",
            emp?.email ?? "",
            emp?.department ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return s.includes(needle);
        })
      : byWorkflow;

    const sorted = [...byText].sort((a, b) => {
      const aKey = a.week_start;
      const bKey = b.week_start;
      return sort === "newest" ? bKey.localeCompare(aKey) : aKey.localeCompare(bKey);
    });

    return sorted;
  }, [q, workflow, sort, reports]);

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Auditoría</h1>
            <p className="page-subtitle">
              Lista completa de rendiciones asignadas (solo lectura).
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="input"
            placeholder="Buscar por empleado, email, título o depto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input" value={workflow} onChange={(e) => setWorkflow(e.target.value as any)}>
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="submitted">En revisión</option>
            <option value="needs_correction">Devuelta al empleado</option>
            <option value="approved">Cerrada / Aprobada</option>
            <option value="paid">Pagada</option>
          </select>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as any)}>
            <option value="newest">Más nuevas primero</option>
            <option value="oldest">Más viejas primero</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center space-y-2">
          <p className="text-sm text-[var(--color-text-muted)]">
            No hay rendiciones que coincidan con tu búsqueda/filtros.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="border-b border-[#f0ecf4] px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Rendiciones ({filtered.length})
            </h2>
          </div>
          <div className="divide-y divide-[#f0ecf4]">
            {filtered.map((r) => {
              const ws = (r.workflow_status ?? "draft") as WorkflowStatus;
              const startDate = new Date(r.week_start + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short" });
              const endDate = new Date(r.week_end + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" });
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/viewer/reports/${r.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#fdfbff] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                      {r.title ?? `${startDate} – ${endDate}`}
                    </p>
                    <p className="text-[0.7rem] text-[var(--color-text-muted)] truncate">
                      {startDate} – {endDate}
                      {r.employee?.full_name ? ` · ${r.employee.full_name}` : ""}
                      {r.employee?.email ? ` · ${r.employee.email}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${badgeFor(ws)}`}>
                    {WORKFLOW_LABELS[ws]}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

