import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { AdvanceStatusBadge } from "@/components/advances/AdvanceStatusBadge";

export default async function AdvancesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const me = await getMyProfile(supabase, session);
  const role = me?.role ?? "";
  if (!["employee", "seller", "admin"].includes(role)) {
    redirect("/dashboard");
  }

  const query = supabase
    .from("advances")
    .select("id, title, advance_date, advance_end_date, requested_amount, currency, status, created_at")
    .order("created_at", { ascending: false });

  if (role !== "admin") {
    query.eq("user_id", session.user.id);
  }

  const { data: advances } = await query;

  return (
    <div className="w-full max-w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Anticipos</h1>
          <p className="page-subtitle">Solicita y hace seguimiento de tus anticipos.</p>
        </div>
        <Link href="/dashboard/advances/new" className="btn-primary btn-shimmer w-full text-center text-sm sm:w-auto">
          Solicitar anticipo
        </Link>
      </div>

      <div className="card w-full overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f5f1f8] text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Periodo</th>
                <th className="px-4 py-3 font-medium text-right">Monto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(advances ?? []).length > 0 ? (
                (advances ?? []).map((advance) => (
                  <tr key={advance.id} className="border-t border-[#f0ecf4] transition-colors hover:bg-[#faf7fd]">
                    <td className="px-4 py-3 align-middle">
                      <Link href={`/dashboard/advances/${advance.id}`} className="font-medium text-[var(--color-text-primary)]">
                        {advance.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle text-xs text-[var(--color-text-muted)]">
                      {new Date(advance.advance_date + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                      {" - "}
                      {new Date((advance.advance_end_date ?? advance.advance_date) + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right align-middle text-sm font-semibold">
                      {Number(advance.requested_amount).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                      <span className="text-xs font-normal text-[var(--color-text-muted)]">{advance.currency}</span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <AdvanceStatusBadge status={advance.status ?? "draft"} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
                    Aun no hay solicitudes de anticipo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[#f0ecf4] md:hidden">
          {(advances ?? []).length > 0 ? (
            (advances ?? []).map((advance) => (
              <Link
                key={advance.id}
                href={`/dashboard/advances/${advance.id}`}
                className="flex w-full items-center gap-3 px-4 py-3 transition-colors active:bg-[#f5f1f8]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{advance.title}</p>
                  <p className="text-[0.65rem] text-[var(--color-text-muted)]">
                    {new Date(advance.advance_date + "T12:00:00").toLocaleDateString("es-UY")}
                    {" - "}
                    {new Date((advance.advance_end_date ?? advance.advance_date) + "T12:00:00").toLocaleDateString("es-UY")}
                    {" · "}
                    {advance.currency} {Number(advance.requested_amount).toFixed(2)}
                  </p>
                </div>
                <AdvanceStatusBadge status={advance.status ?? "draft"} />
              </Link>
            ))
          ) : (
            <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
              Aun no hay solicitudes de anticipo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
