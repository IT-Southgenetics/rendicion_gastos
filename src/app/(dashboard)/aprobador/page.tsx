import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { AdvanceStatusBadge } from "@/components/advances/AdvanceStatusBadge";

const ROLE_LABELS: Record<string, string> = {
  employee:   "Empleado",
  seller:     "Vendedor",
  aprobador:  "Aprobador",
};

export default async function AprobadorHomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const me = await getMyProfile(supabase, session);
  if (me?.role !== "aprobador" && me?.role !== "admin") redirect("/dashboard");
  const isAdmin = me.role === "admin";

  type EmployeeProfile = {
    id: string;
    full_name: string;
    email: string;
    role: string;
    department: string | null;
  };

  const { data: assignments } = await supabase
    .from("supervision_assignments")
    .select("employee_id, profiles!supervision_assignments_employee_id_fkey(id, full_name, email, role, department)")
    .eq("supervisor_id", session.user.id);

  const employees: EmployeeProfile[] = (assignments ?? [])
    .map((a) => a.profiles as EmployeeProfile)
    .filter(Boolean);

  let reports: Array<{
    id: string;
    user_id: string;
    workflow_status: string | null;
  }> = [];

  const employeeIds = employees.map((e) => e.id);
  if (employeeIds.length > 0) {
    const { data: scopedReports } = await supabase
      .from("weekly_reports")
      .select("id, user_id, workflow_status")
      .in("user_id", employeeIds)
      .in("workflow_status", ["submitted", "needs_correction", "approved", "paid"])
      .order("created_at", { ascending: false });
    reports = scopedReports ?? [];
  }

  const { data: advanceRequests } = employeeIds.length > 0
    ? await supabase
      .from("advances")
      .select("id, user_id, title, advance_date, requested_amount, currency, status, approver_id, profiles!advances_user_id_fkey(id, full_name, email, role, department)")
      .in("user_id", employeeIds)
      .in("status", ["submitted", "approved", "rejected", "paid"])
      .order("created_at", { ascending: false })
      .limit(12)
    : { data: [] as Array<{
      id: string;
      user_id: string;
      title: string;
      advance_date: string;
      requested_amount: number;
      currency: string;
      status: string;
      approver_id: string | null;
      profiles: { id: string; full_name: string; email: string; role: string; department: string | null } | null;
    }> };
  const advanceRows = advanceRequests ?? [];
  const pendingAdvanceCount = advanceRows.filter((advance) => advance.status === "submitted").length;

  // Group reports by employee
  const reportsByEmployee: Record<string, typeof reports> = {};
  for (const r of reports ?? []) {
    if (!reportsByEmployee[r.user_id]) reportsByEmployee[r.user_id] = [];
    reportsByEmployee[r.user_id]!.push(r);
  }

  return (
    <div className="w-full max-w-full space-y-5">
      <div className="min-w-0">
        <h1 className="page-title">Aprobaciones</h1>
        <p className="page-subtitle">
          {isAdmin
            ? `Como admin aprobador, ves rendiciones de ${employees.length} ${employees.length === 1 ? "persona" : "personas"} asignadas.`
            : `Aprobás rendiciones de ${employees.length} ${employees.length === 1 ? "persona" : "personas"}.`}
        </p>
      </div>

      {employees.length > 0 ? (
      <div className="grid w-full gap-3 sm:gap-4 xl:grid-cols-2">
        {employees.map((emp) => {
          const empReports = reportsByEmployee[emp.id] ?? [];
          const paidReports = empReports.filter((r) => (r as any).workflow_status === "paid").length;
          const approvedReports = empReports.filter(
            (r) => (r as any).workflow_status === "approved",
          ).length;
          const pendingReports = empReports.filter((r) => {
            const ws = ((r as any).workflow_status ?? "draft") as string;
            return ws === "submitted" || ws === "needs_correction";
          }).length;

          return (
            <Link
              key={emp.id}
              href={`/dashboard/aprobador/employee/${emp.id}`}
              className="card w-full space-y-3 p-3 transition-colors hover:bg-[#f5f1f8] sm:p-4"
            >
              {/* Employee header */}
              <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700 sm:h-10 sm:w-10">
                  {emp.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {emp.full_name}
                  </p>
                  <p className="truncate text-[0.65rem] text-[var(--color-text-muted)]">{emp.email}</p>
                </div>
                <span className="hidden shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[0.6rem] font-medium text-blue-700 min-[460px]:inline-flex">
                  {ROLE_LABELS[emp.role] ?? emp.role}
                </span>
              </div>
              <span className="inline-flex w-fit rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[0.6rem] font-medium text-blue-700 min-[460px]:hidden">
                {ROLE_LABELS[emp.role] ?? emp.role}
              </span>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-1.5 text-center sm:gap-2">
                <div className="rounded-lg bg-blue-50 px-1 py-2 sm:p-2">
                  <p className="truncate text-[0.5rem] font-semibold uppercase text-blue-600 sm:text-[0.6rem]">Pagadas</p>
                  <p className="text-sm font-bold text-blue-700 sm:text-base">{paidReports}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-1 py-2 sm:p-2">
                  <p className="truncate text-[0.5rem] font-semibold uppercase text-emerald-600 sm:text-[0.6rem]">Aprobadas</p>
                  <p className="text-sm font-bold text-emerald-700 sm:text-base">{approvedReports}</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-1 py-2 sm:p-2">
                  <p className="truncate text-[0.5rem] font-semibold uppercase text-amber-600 sm:text-[0.6rem]">Pendientes</p>
                  <p className="text-sm font-bold text-amber-700 sm:text-base">{pendingReports}</p>
                </div>
              </div>

              {/* Recent reports */}
              {empReports.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">
                    Resumen
                  </p>
                  <p className="text-[0.65rem] text-[var(--color-text-muted)]">
                    {empReports.length} rendiciones · {paidReports} pagadas · {approvedReports} aprobadas · {pendingReports} pendientes
                  </p>
                </div>
              )}

              {empReports.length === 0 && (
                <p className="py-2 text-center text-xs italic text-[var(--color-text-muted)]">
                  Sin rendiciones aún.
                </p>
              )}
            </Link>
          );
        })}
      </div>
      ) : (
        <div className="card p-10 text-center space-y-2">
          <p className="text-2xl">👁</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {isAdmin
              ? "No tenés personas asignadas para aprobación."
              : "No tenés empleados asignados aún. El administrador debe asignarte empleados a supervisar."}
          </p>
        </div>
      )}

      <div className="card w-full overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-[#f0ecf4] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Solicitudes de anticipo</h2>
            <p className="text-[0.7rem] text-[var(--color-text-muted)]">
              Revisa anticipos de tus personas asignadas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
              {pendingAdvanceCount} pendientes
            </span>
            <span className="rounded-full bg-[#f5f1f8] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--color-text-muted)]">
              {advanceRows.length} solicitudes
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-[#f5f1f8] text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Fechas</th>
                <th className="px-4 py-3 font-medium text-right">Monto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {advanceRows.length > 0 ? (
                advanceRows.map((advance) => {
                  const owner = advance.profiles as { full_name: string; email: string } | null;
                  return (
                    <tr key={advance.id} className="border-t border-[#f0ecf4] transition-colors hover:bg-[#faf7fd]">
                      <td className="px-4 py-3 align-middle">
                        <Link href={`/dashboard/aprobador/advances/${advance.id}`} className="block">
                          <p className="font-medium text-[var(--color-text-primary)]">{advance.title || "Sin título"}</p>
                          <p className="text-[0.7rem] text-[var(--color-text-muted)]">{owner?.full_name ?? "—"}</p>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-xs text-[var(--color-text-muted)]">
                        {new Date(advance.advance_date + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-right text-sm font-semibold">
                        {Number(advance.requested_amount).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                        <span className="text-xs font-normal text-[var(--color-text-muted)]">{advance.currency}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <AdvanceStatusBadge status={advance.status ?? "draft"} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                    No hay solicitudes de anticipo para revisar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
