import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { CountryFilter } from "@/components/admin/CountryFilter";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const countryFilter = params.country
    ? params.country.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // Verificar que sea admin
  const me = await getMyProfile(supabase, session);
  if (me?.role !== "admin") redirect("/dashboard");

  // Traer todas las rendiciones con datos del usuario (incl. país) y conteo de gastos
  const { data: rawReports } = await supabase
    .from("weekly_reports")
    .select(`
      *,
      profiles!weekly_reports_user_id_fkey(full_name, email, country),
      expenses(count)
    `)
    .order("created_at", { ascending: false });

  const reports = (rawReports ?? []).filter((r) => {
    if (!countryFilter?.length) return true;
    const user = r.profiles as { full_name?: string; email?: string; country?: string } | null;
    const country = user?.country ?? "";
    return country && countryFilter.includes(country);
  });

  const pendingCount = reports.filter((r) => r.status === "open").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Rendiciones — Admin</h1>
          <p className="page-subtitle">
            {reports.length} rendiciones · {pendingCount} abiertas
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="text-sm font-medium text-[var(--color-primary)]"
        >
          ← Panel admin
        </Link>
      </div>

      <Suspense fallback={null}>
        <CountryFilter basePath="/dashboard/admin/reports" />
      </Suspense>

      <div className="card overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f5f1f8] text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">País</th>
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
                const user = r.profiles as { full_name: string; email: string; country?: string } | null;
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
                    <td className="px-4 py-3 align-middle text-xs text-[var(--color-text-muted)] hidden lg:table-cell">
                      {user?.country ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-[var(--color-text-muted)] hidden md:table-cell whitespace-nowrap">
                      {new Date(r.week_start + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short" })}
                      {" – "}
                      {new Date(r.week_end + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-sm font-semibold hidden sm:table-cell whitespace-nowrap">
                      {Number(r.total_amount ?? 0).toLocaleString("es-UY", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-xs font-normal text-[var(--color-text-muted)]">USD</span>
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
                        className="inline-flex w-full items-center justify-center rounded-full border border-[#e5e2ea] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[#f5f1f8] sm:w-auto sm:text-[0.7rem]"
                      >
                        Revisar →
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
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
