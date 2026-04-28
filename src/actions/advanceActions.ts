"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendAdvanceWebhook } from "@/lib/n8n/sendAdvanceWebhook";
import { getAdvanceWebhookUrl } from "@/lib/n8n/advanceWebhookEnv";
import { ADVANCE_CURRENCIES } from "@/lib/advances";

export type AdvanceActionState =
  | { ok: true; advanceId?: string; createdReportId?: string }
  | { ok: false; error: string };

type Role = "admin" | "employee" | "seller" | "aprobador" | "pagador" | "chusmas" | "supervisor";

const VALID_CURRENCIES = new Set(ADVANCE_CURRENCIES.map((currency) => currency.value));

function ensureDate(value: FormDataEntryValue | null): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : null;
}

function toPositiveNumber(value: FormDataEntryValue | null): number | null {
  const str = typeof value === "string" ? value.trim() : "";
  const number = Number(str);
  return Number.isFinite(number) && number > 0 ? number : null;
}

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!me?.id) {
    return { supabase, session, me: null };
  }
  return { supabase, session, me: me as { id: string; role: Role; email: string | null; full_name: string | null } };
}

async function getEmployeeAndApproverEmails(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  employeeId: string,
) {
  const [{ data: employee }, { data: assignments }, { data: pagadores }, { data: chusmas }, { data: aprobadores }] = await Promise.all([
    supabase.from("profiles").select("email, full_name").eq("id", employeeId).maybeSingle(),
    supabase
      .from("supervision_assignments")
      .select("supervisor_id, profiles!supervision_assignments_supervisor_id_fkey(email)")
      .eq("employee_id", employeeId),
    supabase.from("profiles").select("email").eq("role", "pagador"),
    supabase.from("profiles").select("email").eq("role", "chusmas"),
    supabase.from("profiles").select("id, email").eq("role", "aprobador"),
  ]);

  const assignedApproverEmails = (assignments ?? [])
    .map((item) => (item.profiles as { email: string | null } | null)?.email ?? null)
    .filter((email): email is string => !!email)
    .join(",");
  const fallbackApproverEmails = (aprobadores ?? [])
    .map((item) => item.email)
    .filter((email): email is string => !!email)
    .join(",");
  const approverEmails = assignedApproverEmails || fallbackApproverEmails;

  const pagadorEmails = (pagadores ?? [])
    .map((item) => item.email)
    .filter((email): email is string => !!email)
    .join(",");

  const chusmaEmails = (chusmas ?? [])
    .map((item) => item.email)
    .filter((email): email is string => !!email)
    .join(",");

  return {
    employeeEmail: employee?.email ?? "",
    employeeName: employee?.full_name ?? "",
    approverEmails,
    pagadorEmails,
    chusmaEmails,
    approverId: (assignments ?? [])[0]?.supervisor_id ?? (aprobadores ?? [])[0]?.id ?? null,
  };
}

export async function submitNewAdvanceAction(
  _prevState: AdvanceActionState | null,
  formData: FormData,
): Promise<AdvanceActionState> {
  const { supabase, session, me } = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "No tenes permisos para solicitar anticipos." };
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const advanceDate = ensureDate(formData.get("advanceDate"));
  const advanceEndDate = ensureDate(formData.get("advanceEndDate"));
  const requestedAmount = toPositiveNumber(formData.get("requestedAmount"));
  const currency = ((formData.get("currency") as string | null) ?? "USD").toUpperCase();
  const description = (formData.get("description") as string | null)?.trim() ?? null;

  if (!title || !advanceDate || !advanceEndDate || !requestedAmount || !VALID_CURRENCIES.has(currency as (typeof ADVANCE_CURRENCIES)[number]["value"])) {
    return { ok: false, error: "Completa todos los campos obligatorios del anticipo." };
  }
  if (advanceEndDate < advanceDate) {
    return { ok: false, error: "La fecha de fin no puede ser menor que la fecha de inicio." };
  }

  const recipients = await getEmployeeAndApproverEmails(supabase, session.user.id);
  if (!recipients.approverEmails) {
    return { ok: false, error: "No hay aprobador asignado para tu usuario." };
  }

  const nowIso = new Date().toISOString();
  const { data: inserted, error } = await supabase
    .from("advances")
    .insert({
      user_id: session.user.id,
      approver_id: recipients.approverId,
      title,
      advance_date: advanceDate,
      advance_end_date: advanceEndDate,
      requested_amount: requestedAmount,
      currency,
      description,
      status: "submitted",
      submitted_at: nowIso,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: `No se pudo enviar la solicitud: ${error?.message ?? "Error desconocido"}` };
  }

  await sendAdvanceWebhook(getAdvanceWebhookUrl("submitted"), {
    advanceId: inserted.id,
    employeeId: session.user.id,
    employeeName: recipients.employeeName,
    employeeEmail: recipients.employeeEmail,
    approverEmails: recipients.approverEmails,
    title,
    advanceDate,
    requestedAmount,
    currency,
    description,
    targetEmails: recipients.approverEmails,
  }, "anticipo enviado");

  revalidatePath("/dashboard/advances");
  revalidatePath("/dashboard/aprobador");
  return { ok: true, advanceId: inserted.id };
}

export async function approveAdvanceAction(formData: FormData) {
  const { supabase, session, me } = await getCurrentUser();
  if (!me || (me.role !== "aprobador" && me.role !== "admin")) {
    throw new Error("No tenes permisos para aprobar anticipos.");
  }

  const advanceId = (formData.get("advanceId") as string | null)?.trim();
  if (!advanceId) throw new Error("advanceId requerido.");

  const { data: advance, error: advanceError } = await supabase
    .from("advances")
    .select("id, user_id, status, title, advance_date, requested_amount, currency, description")
    .eq("id", advanceId)
    .single();

  if (advanceError || !advance) throw new Error("No se encontro el anticipo.");
  if (advance.status !== "submitted") throw new Error("Solo se pueden aprobar solicitudes enviadas.");
  if (advance.user_id === session.user.id) {
    throw new Error("No podes aprobar tus propios anticipos.");
  }

  if (me.role === "aprobador") {
    const { data: assignment } = await supabase
      .from("supervision_assignments")
      .select("id")
      .eq("supervisor_id", session.user.id)
      .eq("employee_id", advance.user_id)
      .maybeSingle();
    if (!assignment) throw new Error("No tenes este empleado asignado para aprobacion.");
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("advances")
    .update({
      status: "approved",
      approved_at: nowIso,
      approved_by: session.user.id,
      rejection_reason: null,
      updated_at: nowIso,
    })
    .eq("id", advanceId)
    .eq("status", "submitted");

  if (updateError) throw new Error(`No se pudo aprobar el anticipo: ${updateError.message}`);

  const recipients = await getEmployeeAndApproverEmails(supabase, advance.user_id);

  await sendAdvanceWebhook(getAdvanceWebhookUrl("approved"), {
    advanceId,
    employeeId: advance.user_id,
    employeeName: recipients.employeeName,
    employeeEmail: recipients.employeeEmail,
    approverEmails: recipients.approverEmails,
    pagadorEmails: recipients.pagadorEmails,
    chusmaEmails: recipients.chusmaEmails,
    title: advance.title,
    advanceDate: advance.advance_date,
    amount: advance.requested_amount,
    currency: advance.currency,
    description: advance.description,
    targetEmails: [
      recipients.employeeEmail,
      ...recipients.approverEmails.split(","),
      ...recipients.pagadorEmails.split(","),
      ...recipients.chusmaEmails.split(","),
    ].filter(Boolean).join(","),
  }, "anticipo aprobado");

  revalidatePath("/dashboard/aprobador");
  revalidatePath("/dashboard/aprobador/advances/" + advanceId);
}

export async function rejectAdvanceAction(formData: FormData) {
  const { supabase, session, me } = await getCurrentUser();
  if (!me || (me.role !== "aprobador" && me.role !== "admin")) {
    throw new Error("No tenes permisos para rechazar anticipos.");
  }

  const advanceId = (formData.get("advanceId") as string | null)?.trim();
  const rejectionReason = (formData.get("rejectionReason") as string | null)?.trim() ?? "";
  if (!advanceId) throw new Error("advanceId requerido.");
  if (!rejectionReason) throw new Error("Debes indicar motivo de rechazo.");

  const { data: advance, error: advanceError } = await supabase
    .from("advances")
    .select("id, user_id, status, title, advance_date, requested_amount, currency, description")
    .eq("id", advanceId)
    .single();

  if (advanceError || !advance) throw new Error("No se encontro el anticipo.");
  if (advance.status !== "submitted") throw new Error("Solo se pueden rechazar solicitudes enviadas.");
  if (advance.user_id === session.user.id) {
    throw new Error("No podes rechazar tus propios anticipos.");
  }

  if (me.role === "aprobador") {
    const { data: assignment } = await supabase
      .from("supervision_assignments")
      .select("id")
      .eq("supervisor_id", session.user.id)
      .eq("employee_id", advance.user_id)
      .maybeSingle();
    if (!assignment) throw new Error("No tenes este empleado asignado para aprobacion.");
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("advances")
    .update({
      status: "rejected",
      rejection_reason: rejectionReason,
      updated_at: nowIso,
    })
    .eq("id", advanceId)
    .eq("status", "submitted");

  if (updateError) throw new Error(`No se pudo rechazar el anticipo: ${updateError.message}`);

  const recipients = await getEmployeeAndApproverEmails(supabase, advance.user_id);
  await sendAdvanceWebhook(getAdvanceWebhookUrl("rejected"), {
    advanceId,
    employeeId: advance.user_id,
    employeeName: recipients.employeeName,
    employeeEmail: recipients.employeeEmail,
    rejectionReason,
    title: advance.title,
    advanceDate: advance.advance_date,
    requestedAmount: advance.requested_amount,
    currency: advance.currency,
    description: advance.description,
    targetEmails: recipients.employeeEmail,
  }, "anticipo rechazado");

  revalidatePath("/dashboard/aprobador");
  revalidatePath("/dashboard/aprobador/advances/" + advanceId);
}

export async function payAdvanceAction(
  _prevState: AdvanceActionState | null,
  formData: FormData,
): Promise<AdvanceActionState> {
  const { supabase, session, me } = await getCurrentUser();
  if (!me || (me.role !== "pagador" && me.role !== "admin")) {
    return { ok: false, error: "No tenes permisos para registrar el pago de anticipos." };
  }

  const advanceId = (formData.get("advanceId") as string | null)?.trim();
  const paymentDate = ensureDate(formData.get("paymentDate"));
  const paidAmount = toPositiveNumber(formData.get("paidAmount"));
  const receiptFile = formData.get("receiptFile") as File | null;

  if (!advanceId || !paymentDate || !paidAmount || !receiptFile || receiptFile.size <= 0) {
    return { ok: false, error: "Completa todos los campos de pago y adjunta comprobante." };
  }

  const { data: advance, error: advanceError } = await supabase
    .from("advances")
    .select("id, user_id, title, advance_date, advance_end_date, requested_amount, currency, status, created_report_id, description")
    .eq("id", advanceId)
    .single();

  if (advanceError || !advance) return { ok: false, error: "No se encontro la solicitud de anticipo." };

  if (advance.created_report_id) {
    return { ok: true, advanceId, createdReportId: advance.created_report_id };
  }

  if (advance.status !== "approved") {
    return { ok: false, error: "Solo se pueden pagar anticipos aprobados." };
  }

  const fileName = `${Date.now()}-${(receiptFile.name ?? "comprobante").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const objectKey = `advances/${advanceId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("payment_receipts")
    .upload(objectKey, receiptFile, {
      contentType: receiptFile.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: `No se pudo subir el comprobante: ${uploadError.message}` };
  }

  const { data: publicUrlData } = supabase.storage.from("payment_receipts").getPublicUrl(objectKey);
  const publicUrl = publicUrlData.publicUrl ?? null;

  const { data: presets } = await supabase
    .from("exchange_rates")
    .select("currency_code, rate_to_usd");
  const exchangeRates: Record<string, number> = {};
  for (const preset of (presets ?? []) as { currency_code: string; rate_to_usd: number }[]) {
    exchangeRates[preset.currency_code] = Number(preset.rate_to_usd);
  }

  const rate = advance.currency === "USD" ? 1 : exchangeRates[advance.currency];
  const advanceAmountUsd = rate && rate > 0 ? Number(advance.requested_amount) / rate : null;
  if (advanceAmountUsd === null) {
    return { ok: false, error: `No existe tipo de cambio para ${advance.currency}.` };
  }

  const reportTitle = advance.title?.trim() || "Rendicion por anticipo";
  const nowIso = new Date().toISOString();

  const { data: report, error: reportError } = await supabase
    .from("weekly_reports")
    .insert({
      user_id: advance.user_id,
      title: reportTitle,
      week_start: advance.advance_date,
      week_end: advance.advance_end_date ?? advance.advance_date,
      status: "open",
      workflow_status: "draft",
      notes: `Rendicion creada automaticamente desde anticipo ${advance.id}.`,
      advance_amount: Number(advance.requested_amount),
      budget_max: Number(advance.requested_amount),
      budget_currency: advance.currency,
      exchange_rates: Object.keys(exchangeRates).length ? exchangeRates : null,
      advance_amount_usd: advanceAmountUsd,
    })
    .select("id")
    .single();

  if (reportError || !report) {
    return { ok: false, error: `No se pudo crear la rendicion del anticipo: ${reportError?.message ?? "Error desconocido"}` };
  }

  const { error: linkError } = await supabase
    .from("advances")
    .update({
      status: "paid",
      paid_at: nowIso,
      paid_by: session.user.id,
      payment_date: paymentDate,
      payment_receipt_url: publicUrl,
      payment_receipt_path: objectKey,
      created_report_id: report.id,
      updated_at: nowIso,
    })
    .eq("id", advanceId)
    .eq("status", "approved");

  if (linkError) {
    return { ok: false, error: `No se pudo completar el pago del anticipo: ${linkError.message}` };
  }

  const { error: reportUpdateError } = await supabase
    .from("weekly_reports")
    .update({
      advance_id: advanceId,
      advance_amount_usd: advanceAmountUsd,
      settlement_direction: "company_pays_employee",
      settlement_amount_usd: null,
    })
    .eq("id", report.id);
  if (reportUpdateError) {
    console.error("No se pudo vincular la rendicion al anticipo:", reportUpdateError);
  }

  const recipients = await getEmployeeAndApproverEmails(supabase, advance.user_id);
  await sendAdvanceWebhook(getAdvanceWebhookUrl("paid"), {
    advanceId,
    reportId: report.id,
    employeeId: advance.user_id,
    employeeEmail: recipients.employeeEmail,
    employeeName: recipients.employeeName,
    approverEmails: recipients.approverEmails,
    pagadorEmails: recipients.pagadorEmails,
    chusmaEmails: recipients.chusmaEmails,
    amount: paidAmount,
    paidAt: paymentDate,
    paymentReceiptUrl: publicUrl,
    title: advance.title,
    advanceDate: advance.advance_date,
    currency: advance.currency,
    targetEmails: [
      recipients.employeeEmail,
      ...recipients.approverEmails.split(","),
      ...recipients.pagadorEmails.split(","),
      ...recipients.chusmaEmails.split(","),
    ].filter(Boolean).join(","),
  }, "anticipo pagado");

  revalidatePath("/dashboard/viewer");
  revalidatePath("/dashboard/advances");
  revalidatePath(`/dashboard/reports/${report.id}`);
  return { ok: true, advanceId, createdReportId: report.id };
}
