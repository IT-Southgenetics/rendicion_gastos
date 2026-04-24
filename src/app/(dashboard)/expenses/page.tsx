import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import type { Tables } from "@/types/database";

type Expense = Tables<"expenses">;
type ExpenseStatus = "pending" | "reviewing" | "approved" | "rejected";

type SearchParams = {
  q?: string;
  status?: string;
  category?: string;
  currency?: string;
  reportId?: string;
  from?: string;
  to?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  transport:       "Transporte",
  food:            "Comida y bebida",
  accommodation:   "Alojamiento",
  fuel:            "Combustible",
  communication:   "Comunicación",
  office_supplies: "Insumos de oficina",
  entertainment:   "Entretenimiento",
  other:           "Otros",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  reviewing: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  paid: "Pagado",
};

function isValidDateParam(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const q = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();
  const category = (params.category ?? "").trim();
  const currency = (params.currency ?? "").trim().toUpperCase();
  const reportId = (params.reportId ?? "").trim();
  const from = (params.from ?? "").trim();
  const to = (params.to ?? "").trim();

  const { data: myReports } = await supabase
    .from("weekly_reports")
    .select("id, title, week_start, week_end")
    .eq("user_id", session.user.id)
    .order("week_start", { ascending: false });

  const reports = (myReports ?? []) as Array<{
    id: string;
    title: string | null;
    week_start: string;
    week_end: string;
  }>;
  const validReportIds = new Set(reports.map((report) => report.id));

  let query = supabase
    .from("expenses")
    .select("*, weekly_reports!expenses_report_id_fkey(id, title, week_start, week_end, workflow_status)")
    .eq("user_id", session.user.id);

  if (q) {
    query = query.ilike("description", `%${q}%`);
  }

  if (status && Object.prototype.hasOwnProperty.call(STATUS_LABELS, status)) {
    if (status === "paid") {
      query = query.eq("status", "approved" as "pending" | "approved" | "rejected" | "reviewing");
    } else {
      query = query.eq("status", status as "pending" | "approved" | "rejected" | "reviewing");
    }
  }

  if (category && Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, category)) {
    query = query.eq("category", category as "transport" | "food" | "accommodation" | "communication" | "office_supplies" | "entertainment" | "fuel" | "other");
  }

  if (currency) {
    query = query.eq("currency", currency as string & NonNullable<unknown>);
  }
  if (reportId && validReportIds.has(reportId)) {
    query = query.eq("report_id", reportId);
  }

  if (isValidDateParam(from)) {
    query = query.gte("expense_date", from);
  }

  if (isValidDateParam(to)) {
    query = query.lte("expense_date", to);
  }

  const { data: expenses } = await query.order("expense_date", { ascending: false });
  let filteredExpenses = (expenses ?? []) as (Expense & {
    weekly_reports: {
      id: string;
      title: string | null;
      week_start: string;
      week_end: string;
      workflow_status: string | null;
    } | null;
  })[];

  if (status === "paid") {
    filteredExpenses = filteredExpenses.filter((e) => e.weekly_reports?.workflow_status === "paid");
  } else if (status === "approved") {
    filteredExpenses = filteredExpenses.filter((e) => e.weekly_reports?.workflow_status !== "paid");
  }

  const hasFilters = Boolean(q || status || category || currency || reportId || from || to);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Histórico de gastos</h1>
        <p className="page-subtitle">Vista en formato sabana con filtros por descripcion, estado, categoria, moneda y fecha.</p>
      </div>

      <details className="card w-full max-w-full overflow-x-hidden p-4" open={hasFilters}>
        <summary className="filters-summary flex w-full max-w-full cursor-pointer list-none box-border items-center gap-2 overflow-hidden rounded-xl border border-[#ece8f2] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <span className="inline-flex min-w-0 items-center gap-2 truncate">
            <span aria-hidden="true">≡</span>
            <span className="truncate">Filtros</span>
          </span>
          {hasFilters && (
            <span className="ml-auto hidden shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs text-[var(--color-primary)] sm:inline-flex">
              activos
            </span>
          )}
        </summary>
        <form method="get" className="mt-3 w-full max-w-full overflow-x-hidden">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Buscar descripcion..."
              className="input w-full lg:col-span-2"
            />
            <select name="status" defaultValue={status} className="input w-full">
              <option value="">Estado (todos)</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select name="category" defaultValue={category} className="input w-full">
              <option value="">Categoria (todas)</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select name="reportId" defaultValue={reportId} className="input w-full">
              <option value="">Rendicion (todas)</option>
              {reports.map((report) => {
                const periodLabel = `${new Date(report.week_start + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short" })} - ${new Date(report.week_end + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}`;
                const label = report.title?.trim() ? `${report.title} (${periodLabel})` : periodLabel;
                return (
                  <option key={report.id} value={report.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
              <input type="date" name="from" defaultValue={from} className="input w-full" />
              <input type="date" name="to" defaultValue={to} className="input w-full" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select name="currency" defaultValue={currency} className="input w-full">
              <option value="">Moneda (todas)</option>
              <option value="UYU">UYU</option>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
              <option value="BRL">BRL</option>
              <option value="EUR">EUR</option>
            </select>
            <button type="submit" className="btn-primary w-full text-sm">
              Aplicar filtros
            </button>
            <Link
              href="/dashboard/expenses"
              className="inline-flex w-full items-center justify-center rounded-full border border-[#e5e2ea] bg-white px-4 py-3 text-center text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[#f5f1f8]"
            >
              Limpiar filtros
            </Link>
          </div>
        </form>
      </details>

      {filteredExpenses.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="border-b border-[#f0ecf4] px-4 py-2 text-xs text-[var(--color-text-muted)]">
            Mostrando {filteredExpenses.length} gasto{filteredExpenses.length === 1 ? "" : "s"}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f5f1f8] text-xs uppercase text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium max-[508px]:px-2">Fecha</th>
                  <th className="px-4 py-3 font-medium max-[508px]:hidden">Descripción</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Categoría</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Comercio/Empresa</th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell">Moneda</th>
                  <th className="px-4 py-3 font-medium text-right max-[508px]:px-2">Monto</th>
                  <th className="px-4 py-3 font-medium max-[508px]:px-2">Estado</th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell">Rendicion</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-[#f0ecf4] hover:bg-[#faf7fd] transition-colors">
                    <td className="px-4 py-3 align-middle text-xs text-[var(--color-text-muted)] whitespace-nowrap max-[508px]:px-2">
                      {new Date(expense.expense_date + "T12:00:00").toLocaleDateString("es-UY")}
                    </td>
                    <td className="px-4 py-3 align-middle max-w-[340px] max-[508px]:hidden">
                      <Link href={`/dashboard/expenses/${expense.id}`} className="text-sm font-medium break-words whitespace-normal hover:text-[var(--color-primary)]">
                        {expense.description}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 align-middle text-xs text-[var(--color-text-muted)] md:table-cell">
                      {CATEGORY_LABELS[expense.category] ?? expense.category}
                    </td>
                    <td className="hidden px-4 py-3 align-middle text-xs text-[var(--color-text-muted)] max-w-[220px] break-words whitespace-normal lg:table-cell">
                      {expense.merchant_name || "—"}
                    </td>
                    <td className="hidden px-4 py-3 align-middle text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap xl:table-cell">
                      {expense.currency ?? "UYU"}
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-sm font-semibold whitespace-nowrap max-[508px]:px-2">
                      {Number(expense.amount).toLocaleString("es-UY", { minimumFractionDigits: 2 })}{" "}
                    </td>
                    <td className="px-4 py-3 align-middle text-center max-[508px]:px-2">
                      <div className="flex justify-center">
                        <ExpenseStatusBadge status={expense.status === "approved" && expense.weekly_reports?.workflow_status === "paid" ? "paid" : (expense.status ?? "pending")} />
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 align-middle text-xs text-[var(--color-text-muted)] xl:table-cell">
                      {expense.report_id ? (
                        <Link href={`/dashboard/reports/${expense.report_id}`} className="hover:text-[var(--color-primary)] hover:underline">
                          {expense.weekly_reports?.title?.trim()
                            ? expense.weekly_reports.title
                            : expense.weekly_reports
                              ? `${new Date(expense.weekly_reports.week_start + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short" })} - ${new Date(expense.weekly_reports.week_end + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}`
                              : `${expense.report_id.slice(0, 8)}...`}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f5f1f8]">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-primary)]" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M12 18v-6" />
              <path d="M9 15h6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {hasFilters ? "No hay gastos con esos filtros" : "Sin gastos registrados"}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {hasFilters
              ? "Probá cambiando los criterios de búsqueda."
              : "Los gastos aparecen acá cuando los cargás desde una rendición."}
          </p>
          <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
            {hasFilters ? (
              <Link href="/dashboard/expenses" className="btn-primary mt-1 w-full text-sm sm:w-auto">
                Limpiar filtros
              </Link>
            ) : (
              <Link href="/dashboard/reports" className="btn-primary mt-1 w-full text-sm sm:w-auto">
                Ir a Rendiciones
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
