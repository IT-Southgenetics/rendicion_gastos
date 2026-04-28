import { redirect } from "next/navigation";
import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { AdvanceStatusBadge } from "@/components/advances/AdvanceStatusBadge";

export default async function AdminAdvancesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const me = await getMyProfile(supabase, session);
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: advances } = await supabase
    .from("advances")
    .select(`
      id,
      title,
      advance_date,
      advance_end_date,
      requested_amount,
      currency,
      status,
      created_at,
      user_id,
      approver_id,
      requester:profiles!advances_user_id_fkey(full_name, email),
      approver:profiles!advances_approver_id_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false });

  const rows = advances ?? [];
  const submittedCount = rows.filter((advance) => advance.status === "submitted").length;

  return (
    <div className="w-full max-w-full space-y-5">
      <div className="space-y-4">
        <BackButton href="/admin" />
        <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[var(--color-primary)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 8h-3V4.5A2.5 2.5 0 0 0 14.5 2h-5A2.5 2.5 0 0 0 7 4.5V8H4a2 2 0 0 0-2 2v8a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4v-8a2 2 0 0 0-2-2Z"/><path d="M16 8V5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v3"/></svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-[var(--color-text-primary)] sm:text-lg">Anticipos</h1>
                <p className="text-xs text-[var(--color-text-muted)]">Panel de administración</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl bg-[#f5f1f8] px-2 py-2 text-center sm:px-3">
              <p className="text-lg font-bold text-[var(--color-primary)] sm:text-xl">{rows.length}</p>
              <p className="text-[0.6rem] font-semibold uppercase text-[var(--color-text-muted)]">Total</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-2 py-2 text-center sm:px-3">
              <p className="text-lg font-bold text-amber-600 sm:text-xl">{submittedCount}</p>
              <p className="text-[0.6rem] font-semibold uppercase text-[var(--color-text-muted)]">En revisión</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-2 py-2 text-center sm:px-3">
              <p className="text-lg font-bold text-gray-600 sm:text-xl">{rows.length - submittedCount}</p>
              <p className="text-[0.6rem] font-semibold uppercase text-[var(--color-text-muted)]">Resueltos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card w-full overflow-hidden">
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f5f1f8] text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Solicitante</th>
                <th className="px-4 py-3 font-medium">Periodo</th>
                <th className="px-4 py-3 font-medium text-right">Monto</th>
                <th className="px-4 py-3 font-medium">Aprobador</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((advance) => {
                  const requester = advance.requester as { full_name: string; email: string } | null;
                  const approver = advance.approver as { full_name: string; email: string } | null;
                  return (
                    <tr key={advance.id} className="border-t border-[#f0ecf4] transition-colors hover:bg-[#faf7fd]">
                      <td className="px-4 py-3 align-middle">
                        <Link href={`/dashboard/admin/advances/${advance.id}`} className="block">
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            {requester?.full_name ?? "—"}
                          </p>
                          <p className="text-[0.7rem] text-[var(--color-text-muted)]">{requester?.email ?? "—"}</p>
                          <p className="max-w-[180px] truncate text-[0.7rem] font-medium text-[var(--color-primary)]">
                            {advance.title}
                          </p>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-xs text-[var(--color-text-muted)]">
                        {new Date(advance.advance_date + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                        {" - "}
                        {new Date((advance.advance_end_date ?? advance.advance_date) + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-right text-sm font-semibold">
                        {Number(advance.requested_amount).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {" "}
                        <span className="text-xs font-normal text-[var(--color-text-muted)]">{advance.currency}</span>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-[var(--color-text-muted)]">
                        <p className="font-medium text-[var(--color-text-primary)]">{approver?.full_name ?? "Sin asignar"}</p>
                        <p>{approver?.email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <AdvanceStatusBadge status={advance.status ?? "draft"} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
                    No hay anticipos aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[#f0ecf4] lg:hidden">
          {rows.length > 0 ? (
            rows.map((advance) => {
              const requester = advance.requester as { full_name: string; email: string } | null;
              const approver = advance.approver as { full_name: string; email: string } | null;
              return (
                <Link
                  key={advance.id}
                  href={`/dashboard/admin/advances/${advance.id}`}
                  className="flex w-full items-center gap-3 px-4 py-3 transition-colors active:bg-[#f5f1f8] max-[430px]:px-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-[var(--color-primary)]">
                    {(requester?.full_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        {requester?.full_name ?? "—"}
                      </p>
                      <span className="shrink-0">
                        <AdvanceStatusBadge status={advance.status ?? "draft"} />
                      </span>
                    </div>
                    <p className="truncate text-[0.7rem] font-medium text-[var(--color-primary)]">
                      {advance.title}
                    </p>
                    <p className="text-[0.65rem] text-[var(--color-text-muted)]">
                      {new Date(advance.advance_date + "T12:00:00").toLocaleDateString("es-UY")}
                      {" - "}
                      {new Date((advance.advance_end_date ?? advance.advance_date) + "T12:00:00").toLocaleDateString("es-UY")}
                      {" · "}
                      {advance.currency} {Number(advance.requested_amount).toFixed(2)}
                    </p>
                    <p className="truncate text-[0.65rem] text-[var(--color-text-muted)]">
                      Aprobador: {approver?.full_name ?? "Sin asignar"}
                    </p>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
              No hay anticipos aún.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
