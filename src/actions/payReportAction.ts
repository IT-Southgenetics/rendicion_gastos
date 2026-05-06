"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExcelExport } from "@/lib/excelGenerator";
import { calculateSettlement, totalInUSD } from "@/lib/currency";
import { getMyProfile } from "@/lib/auth/getMyProfile";

export type PayReportState =
  | { ok: true }
  | { ok: false; error: string };

export async function payReportAction(
  _prevState: PayReportState | null,
  formData: FormData,
): Promise<PayReportState> {
  const reportId = formData.get("reportId") as string | null;
  if (!reportId) {
    return { ok: false, error: "reportId requerido" };
  }

  const paymentDate = formData.get("paymentDate") as string | null;
  const amountPaidRaw = formData.get("amountPaid") as string | null;
  const paymentCurrency = (formData.get("paymentCurrency") as string | null) ?? "USD";
  const paymentDestination = formData.get("paymentDestination") as string | null;
  const receiptFile = formData.get("receiptFile") as File | null;

  if (!paymentDate || !paymentDestination || !amountPaidRaw) {
    return { ok: false, error: "Completá todos los campos requeridos." };
  }

  if (!receiptFile || receiptFile.size <= 0) {
    return { ok: false, error: "Subí un comprobante de pago." };
  }

  // Validar monto antes de subir el archivo para evitar uploads huérfanos
  const amountPaid = Number(amountPaidRaw);
  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    return { ok: false, error: "Monto pagado inválido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) redirect("/login");

  const me = await getMyProfile(supabase, { user: { id: user.id, email: user.email } });
  if (!me || !["pagador", "admin"].includes(me.role ?? "")) {
    return { ok: false, error: "No tenés permisos para registrar el pago de rendiciones." };
  }

  const originalName = receiptFile.name ?? "comprobante";
  const safeName = originalName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  const receiptFileName = `${Date.now()}-${safeName}`;
  const objectKey = `${reportId}/${receiptFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("payment_receipts")
    .upload(objectKey, receiptFile, {
      contentType: receiptFile.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: `No se pudo subir el comprobante de pago: ${uploadError.message}` };
  }

  const { data: publicUrlData } = supabase.storage.from("payment_receipts").getPublicUrl(objectKey);
  const publicUrl = publicUrlData.publicUrl;

  const { data: reportBeforePayment } = await supabase
    .from("weekly_reports")
    .select("id, user_id, odoo_move_id, exchange_rates, advance_amount_usd")
    .eq("id", reportId)
    .single();

  // Fetch gastos y perfil del empleado en paralelo (operaciones independientes)
  const userId = reportBeforePayment?.user_id;
  const [{ data: reportExpenses }, { data: employeeData }] = await Promise.all([
    supabase.from("expenses").select("amount, currency, status").eq("report_id", reportId),
    userId
      ? supabase.from("profiles").select("full_name, email").eq("id", userId).single()
      : Promise.resolve({ data: null }),
  ]);

  let settlementDirection: "company_pays_employee" | "employee_returns_company" | "settled_zero" | null = null;
  let settlementAmountUsd: number | null = null;
  if (typeof reportBeforePayment?.advance_amount_usd === "number" && reportExpenses) {
    const nonRejectedExpenses = reportExpenses.filter((expense) => expense.status !== "rejected");
    const totalUsd = totalInUSD(
      nonRejectedExpenses.map((expense) => ({
        amount: Number(expense.amount ?? 0),
        currency: expense.currency ?? "UYU",
      })),
      (reportBeforePayment.exchange_rates ?? {}) as Record<string, number>,
    );

    if (typeof totalUsd === "number") {
      const settlement = calculateSettlement(totalUsd, Number(reportBeforePayment.advance_amount_usd));
      settlementDirection = settlement.direction;
      settlementAmountUsd = settlement.amountUsd;
    }
  }

  const { error: updateError } = await supabase
    .from("weekly_reports")
    .update({
      workflow_status: "paid",
      payment_date: paymentDate,
      amount_paid: amountPaid,
      payment_currency: paymentCurrency,
      payment_destination: paymentDestination,
      payment_receipt_url: publicUrl,
      settlement_direction: settlementDirection,
      settlement_amount_usd: settlementAmountUsd,
    })
    .eq("id", reportId);

  if (updateError) {
    return { ok: false, error: `No se pudo marcar la rendición como pagada: ${updateError.message}` };
  }

  const employeeEmail = employeeData?.email ?? "";
  const employeeName = employeeData?.full_name ?? "";

  const webhookUrl = process.env.N8N_WEBHOOK_URL_RENDICION_PAGADA;
  if (webhookUrl) {
    // Fetch pagadores, chusmas y aprobadores asignados en paralelo
    const [{ data: pagadoresData }, { data: chusmasData }, { data: assignments }] = await Promise.all([
      supabase.from("profiles").select("email").eq("role", "pagador"),
      supabase.from("profiles").select("email").eq("role", "chusmas"),
      userId
        ? supabase
            .from("supervision_assignments")
            .select("supervisor_id, profiles!supervision_assignments_supervisor_id_fkey(email)")
            .eq("employee_id", userId)
        : Promise.resolve({ data: [] }),
    ]);

    const pagadorEmails = (pagadoresData ?? [])
      .map((p) => p.email)
      .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
      .join(",");

    const chusmaEmails = (chusmasData ?? [])
      .map((p) => p.email)
      .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
      .join(",");

    const aprobadorEmails = (assignments ?? [])
      .map((a) => (a.profiles as { email: string | null } | null)?.email ?? null)
      .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
      .join(",");

    const targetEmails = Array.from(
      new Set(
        [
          employeeEmail,
          ...pagadorEmails.split(","),
          ...aprobadorEmails.split(","),
          ...chusmaEmails.split(","),
        ]
          .map((e) => e.trim())
          .filter(Boolean),
      ),
    ).join(",");

    let excelBase64 = "";
    let excelName = `Rendicion_${reportId.slice(0, 6)}.xlsx`;
    try {
      const { buffer, fileName: excelFileName } = await generateExcelExport(reportId);
      excelBase64 = buffer.toString("base64");
      excelName = excelFileName;
    } catch (e) {
      console.error("No se pudo generar Excel para webhook (rendición pagada):", e);
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          paymentDate,
          amountPaid,
          paymentCurrency,
          paymentDestination,
          paymentReceiptUrl: publicUrl,
          settlementDirection,
          settlementAmountUsd,
          employeeEmail,
          employeeName,
          pagadorEmails,
          aprobadorEmails,
          chusmaEmails,
          odooMoveId: reportBeforePayment?.odoo_move_id ?? null,
          // Compatibilidad con flujos n8n anteriores
          targetEmails,
          excelBase64,
          excelName,
        }),
      });
      if (!response.ok) {
        console.error("Error devuelto por n8n (rendición pagada):", await response.text());
      }
    } catch (error) {
      console.error("Error enviando webhook de rendición pagada a N8N:", error);
    }
  }

  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath(`/dashboard/viewer/reports/${reportId}`);

  return { ok: true };
}
