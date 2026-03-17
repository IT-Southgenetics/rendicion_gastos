import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";

export default async function ChusmaViewPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const me = await getMyProfile(supabase, session);

  const isChusma = me?.role === "chusmas" || me?.role === "chusma";
  const isAdmin = me?.role === "admin";
  if (!isChusma && !isAdmin) redirect("/dashboard");

  let employeeIds: string[] = [];
  if (isAdmin) {
    const { data: employees } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["employee", "seller", "aprobador", "chusmas", "pagador"]);
    employeeIds = (employees ?? []).map((e) => e.id);
  } else {
    const { data: assignments } = await supabase
      .from("viewer_assignments")
      .select("employee_id")
      .eq("viewer_id", session.user.id);
    employeeIds = (assignments ?? [])
      .map((a) => a.employee_id as string)
      .filter(Boolean);
  }

  if (employeeIds.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">Panel de rendiciones asignadas.</p>
        </div>
        <div className="card p-10 text-center space-y-2">
          <p className="text-2xl">👀</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            No tenés empleados asignados aún para auditoría.
          </p>
        </div>
      </div>
    );
  }

  const { data: reports } = await supabase
    .from("weekly_reports")
    .select(
      `
      id,
      title,
      created_at,
      closed_at,
      total_amount,
      workflow_status,
      user_id,
      employee:profiles!weekly_reports_user_id_fkey(full_name, country),
      approver:profiles!weekly_reports_closed_by_fkey(full_name)
      `,
    )
    .in("user_id", employeeIds)
    .in("workflow_status", ["approved", "paid"])
    .order("created_at", { ascending: false });

  const reportList = (reports ?? []) as Array<{
    id: string;
    title: string | null;
    created_at: string | null;
    closed_at: string | null;
    total_amount: number | null;
    workflow_status: string | null;
    user_id: string;
    employee: { full_name: string; country: string | null } | null;
    approver: { full_name: string } | null;
  }>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Auditoría</h1>
        <p className="page-subtitle">
          Rendiciones aprobadas o pagadas (solo lectura).
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Título</th>
                <th className="px-4 py-3 font-semibold">Empleado</th>
                <th className="px-4 py-3 font-semibold">Aprobador</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">País</th>
                <th className="px-4 py-3 font-semibold text-right">Monto total</th>
                <th className="px-4 py-3 font-semibold text-center">Pagada</th>
              </tr>
            </thead>
            <tbody>
              {reportList.map((r) => {
                const ws = (r.workflow_status ?? "approved") as "approved" | "paid";
                const dateStr = (r.closed_at ?? r.created_at)
                  ? new Date((r.closed_at ?? r.created_at) as string).toLocaleDateString("es-UY")
                  : "—";

                return (
                  <tr
                    key={r.id}
                    className="border-t border-[#f0ecf4] hover:bg-[#fdfbff] transition-colors"
                  >
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/dashboard/reports/${r.id}`}
                        className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
                      >
                        {r.title ?? "Sin título"}
                      </Link>
                      <p className="text-[0.7rem] text-[var(--color-text-muted)]">
                        {r.id}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {r.employee?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {r.approver?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap text-xs text-[var(--color-text-muted)]">
                      {dateStr}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-[var(--color-text-muted)]">
                      {r.employee?.country ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-semibold whitespace-nowrap">
                      {typeof r.total_amount === "number"
                        ? r.total_amount.toLocaleString("es-UY", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 align-middle text-center">
                      {ws === "paid" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                          Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {reportList.length === 0 && (
                <tr className="border-t border-[#f0ecf4]">
                  <td className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]" colSpan={7}>
                    No hay rendiciones aprobadas o pagadas para auditar.
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

