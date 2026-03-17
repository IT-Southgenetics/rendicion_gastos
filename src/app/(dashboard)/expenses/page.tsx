import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import type { Tables } from "@/types/database";

type Expense = Tables<"expenses">;
type ProfileLite = { full_name: string | null; email: string | null } | null;

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

export default async function ExpensesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const me = await getMyProfile(supabase, session);
  const isAdmin = me?.role === "admin";

  const expensesQuery = supabase
    .from("expenses")
    .select("*, profiles!expenses_user_id_fkey(full_name, email)")
    .order("expense_date", { ascending: false });

  if (!isAdmin) {
    expensesQuery.eq("user_id", session.user.id);
  }

  const { data: expenses } = await expensesQuery;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Histórico de gastos</h1>
        <p className="page-subtitle">
          {isAdmin
            ? "Vista administrador: todos los gastos del sistema."
            : "Todos los gastos registrados en tus rendiciones."}
        </p>
      </div>

      {expenses && expenses.length > 0 ? (
        <>
          {/* Cards — mobile */}
          <div className="space-y-2 md:hidden">
            {(expenses as Array<Expense & { profiles?: ProfileLite }>).map((expense) => (
              <Link
                key={expense.id}
                href={`/dashboard/expenses/${expense.id}`}
                className="card flex items-center justify-between gap-3 p-4 active:scale-[0.98] transition-transform"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {expense.description}
                  </p>
                  {isAdmin && (
                    <p className="mt-0.5 text-[0.65rem] text-[var(--color-text-muted)] truncate">
                      {(expense.profiles?.full_name ?? expense.profiles?.email) || "—"}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {CATEGORY_LABELS[expense.category] ?? expense.category}
                    {" · "}
                    {new Date(expense.expense_date + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">
                    {Number(expense.amount).toLocaleString("es-UY", { minimumFractionDigits: 2 })}{" "}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">
                      {expense.currency ?? "UYU"}
                    </span>
                  </span>
                  <ExpenseStatusBadge status={expense.status ?? "pending"} />
                </div>
              </Link>
            ))}
          </div>

          {/* Tabla — desktop */}
          <div className="card hidden overflow-hidden md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f5f1f8] text-xs uppercase text-[var(--color-text-muted)]">
                <tr>
                  {isAdmin && <th className="px-4 py-3 font-medium">Empleado</th>}
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium text-right">Monto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(expenses as Array<Expense & { profiles?: ProfileLite }>).map((expense) => (
                  <tr key={expense.id} className="border-t border-[#f0ecf4] hover:bg-[#faf7fd] transition-colors">
                    {isAdmin && (
                      <td className="px-4 py-3 align-middle text-xs text-[var(--color-text-muted)]">
                        {(expense.profiles?.full_name ?? expense.profiles?.email) || "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 align-middle text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                      {new Date(expense.expense_date + "T12:00:00").toLocaleDateString("es-UY")}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Link href={`/dashboard/expenses/${expense.id}`} className="text-sm font-medium hover:text-[var(--color-primary)]">
                        {expense.description}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-[var(--color-text-muted)]">
                      {CATEGORY_LABELS[expense.category] ?? expense.category}
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-sm font-semibold whitespace-nowrap">
                      {Number(expense.amount).toLocaleString("es-UY", { minimumFractionDigits: 2 })}{" "}
                      {expense.currency ?? "UYU"}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <ExpenseStatusBadge status={expense.status ?? "pending"} />
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      {expense.status === "pending" && (
                        <Link href={`/dashboard/expenses/${expense.id}/edit`} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                          Editar
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <span className="text-4xl">🧾</span>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Sin gastos registrados</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Los gastos aparecen acá cuando los cargás desde una rendición.
          </p>
          <Link href="/dashboard/reports" className="btn-primary mt-1 text-sm">
            Ir a Rendiciones
          </Link>
        </div>
      )}
    </div>
  );
}
