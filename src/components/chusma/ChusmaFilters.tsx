"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { COUNTRY_OPTIONS } from "@/lib/countries";

type Params = Record<string, string | undefined>;

export function ChusmaFilters({ searchParams }: { searchParams: Params }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const initial = useMemo(
    () => ({
      status: searchParams.status ?? "",
      country: searchParams.country ?? "",
      employee: searchParams.employee ?? "",
      approver: searchParams.approver ?? "",
      from: searchParams.from ?? "",
      to: searchParams.to ?? "",
    }),
    [searchParams],
  );

  const [status, setStatus] = useState(initial.status);
  const [country, setCountry] = useState(initial.country);
  const [employee, setEmployee] = useState(initial.employee);
  const [approver, setApprover] = useState(initial.approver);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  function pushWithParams(next: Params) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      const value = (v ?? "").trim();
      if (value) params.set(k, value);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushWithParams({ status, country, employee, approver, from, to });
  }

  function onClear() {
    setStatus("");
    setCountry("");
    setEmployee("");
    setApprover("");
    setFrom("");
    setTo("");
    startTransition(() => router.push(pathname));
  }

  const disabled = isPending;

  return (
    <form onSubmit={onSubmit} className="card p-4">
      <div className="grid gap-3 md:grid-cols-6">
        <div className="md:col-span-1">
          <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input mt-1 text-xs"
            disabled={disabled}
          >
            <option value="">Todas</option>
            <option value="approved">Pendientes de pago</option>
            <option value="paid">Pagadas</option>
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
            País
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="input mt-1 text-xs"
            disabled={disabled}
          >
            <option value="">Todos</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c === "Regional" ? "Regional (otro)" : c}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
            Empleado
          </label>
          <input
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
            placeholder="Nombre del empleado…"
            className="input mt-1 text-xs"
            disabled={disabled}
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
            Aprobador
          </label>
          <input
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
            placeholder="Nombre…"
            className="input mt-1 text-xs"
            disabled={disabled}
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
            Desde
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input mt-1 text-xs"
            disabled={disabled}
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
            Hasta
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input mt-1 text-xs"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" className="btn-primary text-xs" disabled={disabled}>
          {isPending ? "Filtrando…" : "Filtrar"}
        </button>
        <button
          type="button"
          className="rounded-full border border-[#e5e2ea] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[#f5f1f8] disabled:opacity-60"
          onClick={onClear}
          disabled={disabled}
        >
          Limpiar
        </button>
        <span className="text-[0.7rem] text-[var(--color-text-muted)]">
          Los filtros se guardan en la URL.
        </span>
      </div>
    </form>
  );
}

