"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { runReportApprovedClosure } from "./runReportApprovedClosure";

export async function approveReportAction(formData: FormData) {
  const reportId = formData.get("reportId") as string | null;
  if (!reportId) {
    throw new Error("reportId requerido");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) redirect("/login");

  const me = await getMyProfile(supabase, { user: { id: user.id, email: user.email } });
  if (!me || !["aprobador", "admin"].includes(me.role ?? "")) {
    throw new Error("No tenés permisos para aprobar rendiciones.");
  }

  await runReportApprovedClosure(supabase, user.id, reportId);
}

/**
 * Cuando un admin aprueba el último gasto pendiente desde el detalle de admin,
 * la rendición debe pasar a `approved` (antes solo cambiaban los gastos y el workflow quedaba en `submitted`).
 */
export async function tryAutoFinalizeReportAfterAllExpensesApprovedAction(
  reportId: string,
): Promise<{ ok: boolean; finalized?: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return { ok: false, error: "No hay sesión." };
  }

  const me = await getMyProfile(supabase, { user: { id: user.id, email: user.email } });
  if (me?.role !== "admin") {
    return { ok: false, error: "Solo administradores pueden usar esta acción." };
  }

  const { data: report } = await supabase
    .from("weekly_reports")
    .select("workflow_status, user_id")
    .eq("id", reportId)
    .maybeSingle();

  if (!report) {
    return { ok: false, error: "Rendición no encontrada." };
  }

  const ws = report.workflow_status ?? "";
  if (ws === "approved" || ws === "paid") {
    return { ok: true, finalized: false };
  }
  if (ws !== "submitted" && ws !== "needs_correction") {
    return { ok: true, finalized: false };
  }

  const { data: expenseRows, error: expErr } = await supabase
    .from("expenses")
    .select("status")
    .eq("report_id", reportId);

  if (expErr) {
    return { ok: false, error: expErr.message };
  }

  const list = expenseRows ?? [];
  if (list.length === 0 || list.some((e) => e.status !== "approved")) {
    return { ok: true, finalized: false };
  }

  try {
    await runReportApprovedClosure(supabase, user.id, reportId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo cerrar la rendición.";
    return { ok: false, error: message };
  }

  return { ok: true, finalized: true };
}
