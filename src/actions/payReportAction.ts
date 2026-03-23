 "use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExcelExport } from "@/lib/excelGenerator";

export type PayReportState =
  | { ok: true }
  | { ok: false; error: string };

export async function payReportAction(
  _prevState: PayReportState | null,
  formData: FormData,
): Promise<PayReportState> {

  const reportId = formData.get("reportId") as string | null;
  if (!reportId) {
    return { ok: false as const, error: "reportId requerido" };
  }

  const paymentDate = formData.get("paymentDate") as string | null;
  const amountPaidRaw = formData.get("amountPaid") as string | null;
  const paymentDestination = formData.get("paymentDestination") as string | null;
  const receiptFile = formData.get("receiptFile") as File | null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  if (!paymentDate || !paymentDestination || !amountPaidRaw) {
    return { ok: false as const, error: "Completá todos los campos requeridos." };
  }

  if (!receiptFile || receiptFile.size <= 0) {
    return { ok: false as const, error: "Subí un comprobante de pago." };
  }

  let publicUrl: string | null = null;

  if (receiptFile.size > 0) {
    const originalName = receiptFile.name ?? "comprobante";
    const safeName = originalName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // quita acentos/diacríticos
      .replace(/[^a-zA-Z0-9._-]/g, "_"); // evita caracteres inválidos (ej: [ ])

    const fileName = `${Date.now()}-${safeName}`;
    const objectKey = `${reportId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("payment_receipts")
      .upload(objectKey, receiptFile, {
        contentType: receiptFile.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      return {
        ok: false as const,
        error: `No se pudo subir el comprobante de pago: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from("payment_receipts")
      .getPublicUrl(objectKey);

    publicUrl = publicUrlData.publicUrl ?? null;
  }

  const amountPaid = Number(amountPaidRaw);
  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    return { ok: false as const, error: "Monto pagado inválido." };
  }

  const { error: updateError } = await supabase
    .from("weekly_reports")
    .update({
      workflow_status: "paid",
      payment_date: paymentDate,
      amount_paid: amountPaid,
      payment_destination: paymentDestination,
      payment_receipt_url: publicUrl,
    })
    .eq("id", reportId);

  if (updateError) {
    return {
      ok: false as const,
      error: `No se pudo marcar la rendición como pagada: ${updateError.message}`,
    };
  }

  // Obtener datos del empleado dueño de la rendición
  let employeeEmail = "";
  let employeeName = "";

  const { data: reportData } = await supabase
    .from("weekly_reports")
    .select("user_id, odoo_move_id")
    .eq("id", reportId)
    .single();

  if (reportData?.user_id) {
    const { data: employeeData } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", reportData.user_id)
      .single();

    employeeEmail = employeeData?.email ?? "";
    employeeName = employeeData?.full_name ?? "";
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL_RENDICION_PAGADA;
  if (webhookUrl) {
    // Obtener correos de todos los usuarios con rol "pagador"
    const { data: pagadoresData } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "pagador");

    const pagadorEmails = (pagadoresData ?? [])
      .map((p) => p.email)
      .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
      .join(",");

    // Correos de usuarios auditor/chusma
    const { data: chusmasData } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "chusmas");

    const chusmaEmails = (chusmasData ?? [])
      .map((p) => p.email)
      .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
      .join(",");

    // Emails de aprobadores asignados al empleado (pueden ser varios)
    let aprobadorEmails = "";
    if (reportData?.user_id) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from("supervision_assignments")
        .select("supervisor_id, profiles!supervision_assignments_supervisor_id_fkey(email)")
        .eq("employee_id", reportData.user_id);

      if (assignmentsError) {
        console.error(
          "No se pudieron obtener aprobadores asignados (supervision_assignments) para el pago de rendición:",
          assignmentsError,
        );
      } else {
        aprobadorEmails = (assignments ?? [])
          .map((a) => (a.profiles as { email: string | null } | null)?.email ?? null)
          .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
          .join(",");
      }
    }

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
      const { buffer, fileName } = await generateExcelExport(reportId);
      excelBase64 = buffer.toString("base64");
      excelName = fileName;
    } catch (e) {
      console.error("No se pudo generar Excel para webhook (rendición pagada):", e);
    }

    try {
      console.log("Payload hacia n8n (rendición pagada):", {
        reportId,
        employeeEmail,
        pagadorEmails,
        aprobadorEmails,
        chusmaEmails,
        odooMoveId: reportData?.odoo_move_id ?? null,
        targetEmails,
      });
      const response = await fetch(webhookUrl as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          paymentDate,
          amountPaid,
          paymentDestination,
          paymentReceiptUrl: publicUrl,
          employeeEmail,
          employeeName,
          pagadorEmails,
          aprobadorEmails,
          chusmaEmails,
          odooMoveId: reportData?.odoo_move_id ?? null,
          // Compatibilidad con flujos n8n antiguos
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

  return { ok: true as const };
}

