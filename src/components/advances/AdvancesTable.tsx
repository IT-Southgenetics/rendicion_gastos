"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdvanceStatusBadge } from "@/components/advances/AdvanceStatusBadge";

type AdvanceRow = {
  id: string;
  title: string | null;
  advance_date: string;
  requested_amount: number | string;
  currency: string | null;
  status: string | null;
};

interface AdvancesTableProps {
  advances: AdvanceRow[];
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function AdvancesTable({ advances }: AdvancesTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredAdvances = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());

    return advances.filter((advance) => {
      const normalizedTitle = normalizeText(advance.title ?? "");
      const matchesQuery = normalizedQuery.length === 0 || normalizedTitle.includes(normalizedQuery);

      const advanceStatus = advance.status ?? "draft";
      const matchesStatus = status === "all" || advanceStatus === status;

      const advanceDate = advance.advance_date;
      const matchesFromDate = !fromDate || advanceDate >= fromDate;
      const matchesToDate = !toDate || advanceDate <= toDate;

      return matchesQuery && matchesStatus && matchesFromDate && matchesToDate;
    });
  }, [advances, fromDate, query, status, toDate]);

  return (
    <div className="card w-full space-y-4 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Buscar por nombre</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: Viático congreso"
            className="input h-10"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Estado</span>
          <select className="input h-10" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos</option>
            <option value="draft">Borrador</option>
            <option value="submitted">Enviado</option>
            <option value="approved">Aprobado</option>
            <option value="paid">Pagado</option>
            <option value="rejected">Rechazado</option>
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
        <table className="min-w-[680px] w-full text-left text-sm">
          <thead className="bg-[#f5f1f8] text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium text-right">Monto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdvances.length > 0 ? (
              filteredAdvances.map((advance) => (
                <tr key={advance.id} className="border-t border-[#f0ecf4] transition-colors hover:bg-[#faf7fd]">
                  <td className="px-4 py-3 align-middle">
                    <Link href={`/dashboard/advances/${advance.id}`} className="font-medium text-[var(--color-text-primary)]">
                      {advance.title || "Sin título"}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle text-xs text-[var(--color-text-muted)]">
                    {new Date(advance.advance_date + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right align-middle text-sm font-semibold">
                    {Number(advance.requested_amount).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">{advance.currency ?? "USD"}</span>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <AdvanceStatusBadge status={advance.status ?? "draft"} />
                  </td>
                </tr>
              ))
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
