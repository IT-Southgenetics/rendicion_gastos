import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminReportsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // Verificar que sea admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // Traer todas las rendiciones con datos del usuario y conteo de gastos
  const { data: reports } = await supabase
    .from("weekly_reports")
    .select(`
      *,
      profiles!weekly_reports_user_id_fkey(full_name, email),
      expenses(count)
    `)
    .order("created_at", { ascending: false });

  const pendingCount = (reports ?? []).filter((r) => r.status === "open").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Rendiciones — Admin</h1>
          <p className="page-subtitle">
            {(reports ?? []).length} rendiciones · {pendingCount} abiertas
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="text-sm font-medium text-[var(--color-primary)]"
        >
          ← Panel admin
        </Link>
      </div>

      {/* Filtros de estado */}
      <div className="card overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f5f1f8] text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Período</th>
              <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Total</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Gastos</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {reports && reports.length > 0 ? (
              reports.map((r) => {
                const user = r.profiles as { full_name: string; email: string } | null;
                const expenseCount = (r.expenses as { count: number }[])?.[0]?.count ?? 0;
                const isOpen = r.status === "open";
                return (
                  <tr
                    key={r.id}
                    className="border-t border-[#f0ecf4] hover:bg-[#faf7fd] transition-colors"
                  >
                    <td className="px-4 py-3 align-middle">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {user?.full_name ?? "—"}
                      </p>
                      <p className="text-[0.7rem] text-[var(--color-text-muted)]">{user?.email}</p>
                      {r.title && (
                        <p className="text-[0.7rem] font-medium text-[var(--color-primary)] truncate max-w-[180px]">
                          {r.title}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-[var(--color-text-muted)] hidden md:table-cell whitespace-nowrap">
                      {new Date(r.week_start + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short" })}
                      {" – "}
                      {new Date(r.week_end + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-sm font-semibold hidden sm:table-cell whitespace-nowrap">
                      {Number(r.total_amount ?? 0).toLocaleString("es-UY", {
                        minimumFractionDigits: 2, maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-xs font-normal text-[var(--color-text-muted)]">UYU</span>
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-[var(--color-text-muted)] hidden sm:table-cell">
                      {expenseCount} {expenseCount === 1 ? "gasto" : "gastos"}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${
                        isOpen
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      }`}>
                        {isOpen ? "Abierta" : "Cerrada"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <Link
                        href={`/dashboard/admin/reports/${r.id}`}
                        className="rounded-full border border-[#e5e2ea] px-3 py-1 text-[0.7rem] font-medium text-[var(--color-text-primary)] hover:bg-[#f5f1f8]"
                      >
                        Revisar →
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
                  No hay rendiciones aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
