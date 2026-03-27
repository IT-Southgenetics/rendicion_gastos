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
    <form onSubmit={onSubmit} className="card w-full max-w-full p-3 sm:p-4">
      <div className="grid w-full gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input mt-1 w-full text-xs"
            disabled={disabled}
          >
            <option value="">Todas</option>
            <option value="approved">Pendientes de pago</option>
            <option value="paid">Pagadas</option>
          </select>
        </div>

        <div>
          <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
            País
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="input mt-1 w-full text-xs"
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

        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
            Empleado
          </label>
          <input
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
            placeholder="Nombre del empleado…"
            className="input mt-1 w-full text-xs"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
            Aprobador
          </label>
          <input
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
            placeholder="Nombre…"
            className="input mt-1 w-full text-xs"
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
          <div>
            <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
              Desde
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input mt-1 w-full text-xs"
              disabled={disabled}
            />
          </div>
          <div>
            <label className="block text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
              Hasta
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input mt-1 w-full text-xs"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="submit" className="btn-primary w-full text-xs" disabled={disabled}>
          {isPending ? "Filtrando…" : "Filtrar"}
        </button>
        <button
          type="button"
          className="w-full rounded-full border border-[#e5e2ea] bg-white px-3 py-2 text-center text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[#f5f1f8] disabled:opacity-60"
          onClick={onClear}
          disabled={disabled}
        >
          Limpiar
        </button>
        <span className="text-center text-[0.7rem] text-[var(--color-text-muted)] sm:text-left sm:self-center">
          Filtros en la URL.
        </span>
      </div>
    </form>
  );
}

