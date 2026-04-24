import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { BackButton } from "@/components/ui/BackButton";
import { AdvanceStatusBadge } from "@/components/advances/AdvanceStatusBadge";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdvanceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const me = await getMyProfile(supabase, session);
  const isAdmin = me?.role === "admin";
  const isOwnerRole = me?.role === "employee" || me?.role === "seller";
  if (!isAdmin && !isOwnerRole) redirect("/dashboard");

  const query = supabase
    .from("advances")
    .select("*, profiles!advances_approver_id_fkey(full_name, email)")
    .eq("id", id);
  if (!isAdmin) query.eq("user_id", session.user.id);

  const { data: advance } = await query.maybeSingle();
  if (!advance) notFound();

  const approver = advance.profiles as { full_name: string; email: string } | null;

  return (
    <div className="space-y-4">
      <BackButton href="/dashboard/advances" />

      <div className="card p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{advance.title}</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              Periodo solicitado: {new Date(advance.advance_date + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" })}
              {" - "}
              {new Date((advance.advance_end_date ?? advance.advance_date) + "T12:00:00").toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <AdvanceStatusBadge status={advance.status ?? "draft"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#f0ecf4] bg-[#faf8fc] px-4 py-3">
            <p className="text-[0.6rem] font-semibold uppercase text-[var(--color-text-muted)]">Monto solicitado</p>
            <p className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">
              {advance.currency} {Number(advance.requested_amount).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl border border-[#f0ecf4] bg-[#faf8fc] px-4 py-3">
            <p className="text-[0.6rem] font-semibold uppercase text-[var(--color-text-muted)]">Aprobador</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{approver?.full_name ?? "Sin asignar"}</p>
            <p className="text-[0.7rem] text-[var(--color-text-muted)]">{approver?.email ?? "—"}</p>
          </div>
        </div>

        {advance.description && (
          <div>
            <p className="text-[0.6rem] font-semibold uppercase text-[var(--color-text-muted)]">Descripcion</p>
            <p className="mt-1 text-sm text-[var(--color-text-primary)]">{advance.description}</p>
          </div>
        )}

        {advance.rejection_reason && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[0.6rem] font-semibold uppercase text-red-600">Motivo de rechazo</p>
            <p className="mt-1 text-sm font-medium text-red-700">{advance.rejection_reason}</p>
          </div>
        )}

        {advance.created_report_id && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[0.6rem] font-semibold uppercase text-emerald-700">Rendicion asociada</p>
            <Link href={`/dashboard/reports/${advance.created_report_id}`} className="mt-1 inline-flex text-sm font-semibold text-emerald-700 underline">
              Ver rendicion creada automaticamente
            </Link>
          </div>
        )}

        {advance.payment_receipt_url && (
          <a
            href={advance.payment_receipt_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
          >
            Ver comprobante de pago
          </a>
        )}
      </div>
    </div>
  );
}
