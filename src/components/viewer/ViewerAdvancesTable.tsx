"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdvanceStatusBadge } from "@/components/advances/AdvanceStatusBadge";
import { PayAdvanceModal } from "@/components/advances/PayAdvanceModal";

type ViewerAdvanceRow = {
  id: string;
  title: string | null;
  advance_date: string;
  requested_amount: number | string;
  currency: string | null;
  status: string | null;
  created_report_id: string | null;
  profiles: { full_name: string; email: string } | null;
};

interface ViewerAdvancesTableProps {
  advances: ViewerAdvanceRow[];
  isPagador: boolean;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function ViewerAdvancesTable({ advances, isPagador }: ViewerAdvancesTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    return advances.filter((advance) => {
      const ownerName = advance.profiles?.full_name ?? "";
      const title = advance.title ?? "";
      const searchable = normalizeText(`${title} ${ownerName}`);
      const matchesQuery = normalizedQuery.length === 0 || searchable.includes(normalizedQuery);
      const advanceStatus = advance.status ?? "draft";
      const matchesStatus = status === "all" || advanceStatus === status;
      const matchesFrom = !fromDate || advance.advance_date >= fromDate;
      const matchesTo = !toDate || advance.advance_date <= toDate;
      return matchesQuery && matchesStatus && matchesFrom && matchesTo;
    });
  }, [advances, fromDate, query, status, toDate]);

  return (
    <div className="w-full space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Buscar por nombre</span>
          <input
            className="input h-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Adelanto o empleado"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Estado</span>
          <select className="input h-10" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos</option>
            <option value="approved">Aprobado</option>
            <option value="paid">Pagado</option>
            <option value="submitted">Enviado</option>
            <option value="rejected">Rechazado</option>
            <option value="draft">Borrador</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Desde</span>
          <input type="date" className="input h-10" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Hasta</span>
          <input type="date" className="input h-10" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-[#f5f1f8] text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium text-right">Monto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((advance) => {
                const owner = advance.profiles;
                return (
                  <tr key={advance.id} className="border-t border-[#f0ecf4] align-top transition-colors hover:bg-[#faf7fd]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-text-primary)]">{advance.title || "Sin título"}</p>
                      <p className="text-[0.7rem] text-[var(--color-text-muted)]">{owner?.full_name ?? "—"}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-text-muted)]">
                      {new Date(advance.advance_date + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      {Number(advance.requested_amount).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                      <span className="text-xs font-normal text-[var(--color-text-muted)]">{advance.currency ?? "USD"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <AdvanceStatusBadge status={advance.status ?? "draft"} />
                        {isPagador && advance.status === "approved" && (
                          <PayAdvanceModal
                            advanceId={advance.id}
                            amount={Number(advance.requested_amount)}
                            currency={advance.currency}
                            advanceDate={advance.advance_date}
                          />
                        )}
                        {advance.created_report_id && (
                          <Link
                            href={`/dashboard/viewer/reports/${advance.created_report_id}`}
                            className="inline-flex items-center rounded-full border border-[#d4cfe0] px-3 py-1 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[#f5f1f8]"
                          >
                            Ver rendicion
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
                  No hay anticipos que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
