import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { AdvanceStatusBadge } from "@/components/advances/AdvanceStatusBadge";
import { approveAdvanceAction, rejectAdvanceAction } from "@/actions/advanceActions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AprobadorAdvanceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const me = await getMyProfile(supabase, session);
  const isAdmin = me?.role === "admin";
  const isAprobador = me?.role === "aprobador";
  if (!isAdmin && !isAprobador) redirect("/dashboard");

  const { data: advance } = await supabase
    .from("advances")
    .select("*, profiles!advances_user_id_fkey(full_name, email), profiles_approver:profiles!advances_approver_id_fkey(full_name, email)")
    .eq("id", id)
    .maybeSingle();

  if (!advance) notFound();

  if (isAprobador) {
    const { data: assignment } = await supabase
      .from("supervision_assignments")
      .select("id")
      .eq("supervisor_id", session.user.id)
      .eq("employee_id", advance.user_id)
      .maybeSingle();
    if (!assignment) redirect("/dashboard/aprobador");
  }

  const owner = advance.profiles as { full_name: string; email: string } | null;
  const approver = advance.profiles_approver as { full_name: string; email: string } | null;
  const isPendingApproval = advance.status === "submitted";

  return (
    <div className="space-y-4">
      <BackButton href="/dashboard/aprobador" />

      <div className="card p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{advance.title}</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              Solicitud del {new Date(advance.created_at).toLocaleDateString("es-UY")}
            </p>
          </div>
          <AdvanceStatusBadge status={advance.status ?? "draft"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#f0ecf4] bg-[#faf8fc] px-4 py-3">
            <p className="text-[0.6rem] font-semibold uppercase text-[var(--color-text-muted)]">Empleado</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{owner?.full_name ?? "—"}</p>
            <p className="text-[0.7rem] text-[var(--color-text-muted)]">{owner?.email ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-[#f0ecf4] bg-[#faf8fc] px-4 py-3">
            <p className="text-[0.6rem] font-semibold uppercase text-[var(--color-text-muted)]">Aprobador asignado</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{approver?.full_name ?? "Sin asignar"}</p>
            <p className="text-[0.7rem] text-[var(--color-text-muted)]">{approver?.email ?? "—"}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#f0ecf4] bg-white px-4 py-3">
          <p className="text-[0.6rem] font-semibold uppercase text-[var(--color-text-muted)]">Monto solicitado</p>
          <p className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">
            {advance.currency} {Number(advance.requested_amount).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[0.7rem] text-[var(--color-text-muted)]">
            Fecha de anticipo: {new Date(advance.advance_date + "T12:00:00").toLocaleDateString("es-UY")}
          </p>
        </div>

        {advance.description && (
          <div>
            <p className="text-[0.6rem] font-semibold uppercase text-[var(--color-text-muted)]">Descripcion</p>
            <p className="mt-1 text-sm text-[var(--color-text-primary)]">{advance.description}</p>
          </div>
        )}

        {advance.rejection_reason && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[0.6rem] font-semibold uppercase text-red-600">Ultimo motivo de rechazo</p>
            <p className="mt-1 text-sm font-medium text-red-700">{advance.rejection_reason}</p>
          </div>
        )}

        {isPendingApproval && (
          <div className="grid gap-3 border-t border-[#f0ecf4] pt-4 sm:grid-cols-2">
            <form action={approveAdvanceAction} className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <input type="hidden" name="advanceId" value={advance.id} />
              <p className="text-xs font-semibold text-emerald-700">Aprobar solicitud</p>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Aprobar
              </button>
            </form>

            <form action={rejectAdvanceAction} className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <input type="hidden" name="advanceId" value={advance.id} />
              <label className="block text-xs font-semibold text-red-700">Motivo de rechazo</label>
              <textarea
                name="rejectionReason"
                required
                className="input min-h-[80px] border-red-200 bg-white"
                placeholder="Explica por que se rechaza la solicitud."
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Rechazar
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
