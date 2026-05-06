import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExcelExport } from "@/lib/excelGenerator";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { calculateSettlement, totalInUSD } from "@/lib/currency";
import { getMyProfile } from "@/lib/auth/getMyProfile";

export async function approveReportAction(formData: FormData) {
  "use server";

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

  const [{ data: report, error: reportError }, { data: expenses, error: expensesError }] =
    await Promise.all([
      supabase
        .from("weekly_reports")
        .select("id, user_id, title, total_amount, budget_currency, exchange_rates, advance_amount_usd")
        .eq("id", reportId)
        .single(),
      supabase
        .from("expenses")
        .select("id, status, amount, currency, description, category, merchant_name, expense_date")
        .eq("report_id", reportId),
    ]);

  if (reportError || !report) {
    throw new Error("No se encontró la rendición.");
  }
  if (report.user_id === user.id) {
    throw new Error("No podés aprobar tus propias rendiciones.");
  }

  if (expensesError) {
    throw new Error("No se pudieron obtener los gastos de la rendición.");
  }

  const expenseList = expenses ?? [];
  const hasAnyNotApproved = expenseList.some(
    (e) => e.status !== "approved",
  );

  if (expenseList.length === 0 || hasAnyNotApproved) {
    throw new Error(
      "No se puede aprobar la rendición si hay gastos pendientes o rechazados.",
    );
  }

  const { data: employeeData, error: ownerError } = await supabase
    .from("profiles")
    .select("full_name, email, country")
    .eq("id", report.user_id)
    .single();

  if (ownerError) {
    throw new Error("No se pudo obtener el dueño de la rendición.");
  }

  const closedAtIso = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("weekly_reports")
    .update({
      workflow_status: "approved",
      status: "closed",
      closed_by: user.id,
      closed_at: closedAtIso,
    })
    .eq("id", reportId);

  if (updateError) {
    throw new Error("No se pudo aprobar la rendición.");
  }

  const webhookUrl =
    process.env.N8N_WEBHOOK_URL_APROBAR_CIERRE ??
    process.env.N8N_WEBHOOK_URL_RENDICION_APROBADA ??
    "https://n8n.srv908725.hstgr.cloud/webhook/aprobar-cierre";

  if (webhookUrl) {
    // Fetch chusmas y pagadores en paralelo
    const [{ data: chusmasData, error: chusmasError }, { data: payers, error: payersError }] = await Promise.all([
      supabase.from("profiles").select("email").eq("role", "chusmas"),
      supabase.from("profiles").select("email").eq("role", "pagador"),
    ]);

    if (chusmasError) {
      console.error(
        "No se pudieron obtener usuarios chusmas para la notificación de rendición aprobada:",
        chusmasError,
      );
    }

    const chusmaEmailsList = Array.from(
      new Set(
        (chusmasData ?? [])
          .map((c) => c.email)
          .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
          .map((e) => e.trim().toLowerCase()),
      ),
    );
    const defaultChusmaEmail = (process.env.N8N_DEFAULT_CHUSMA_EMAIL ?? "").trim().toLowerCase();
    const effectiveChusmaEmailsList =
      chusmaEmailsList.length > 0
        ? chusmaEmailsList
        : (defaultChusmaEmail ? [defaultChusmaEmail] : []);

    const chusmaEmails = effectiveChusmaEmailsList.join(",");

    let effectivePayers = payers ?? [];
    // Si por RLS no devolvió filas, intentar fallback con service role (si está configurado).
    if (effectivePayers.length === 0) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (serviceRoleKey && supabaseUrl) {
        const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);
        const { data: adminPayers, error: adminPayersError } = await adminClient
          .from("profiles")
          .select("email")
          .eq("role", "pagador");
        if (adminPayersError) {
          console.error(
            "Fallback service role: no se pudieron obtener pagadores para aprobación:",
            adminPayersError,
          );
        } else {
          effectivePayers = adminPayers ?? [];
        }
      } else {
        console.warn(
          "No se pudo usar fallback de service role para pagadores: faltan SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL.",
        );
      }
    }

    if (payersError) {
      console.error(
        "No se pudieron obtener los usuarios con rol pagador para la notificación de rendición aprobada:",
        payersError,
      );
    }

    const payerEmailArray = Array.from(
      new Set(
        effectivePayers
          .map((p) => p.email)
          .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
          .map((e) => e.trim().toLowerCase()),
      ),
    );

    const pagadorEmails = payerEmailArray.join(",");
    const employeeEmail =
      typeof employeeData?.email === "string" ? employeeData.email : "";

    const targetEmails = Array.from(
      new Set(
        [employeeEmail, ...pagadorEmails.split(",")]
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
      console.error("No se pudo generar Excel para webhook (rendición aprobada):", e);
    }

    const budgetCurrency = report.budget_currency ?? "USD";
    const reportExchangeRates = (report.exchange_rates ?? {}) as Record<string, number>;

    const currencies = new Set(expenseList.map((e) => e.currency ?? "UYU"));
    const isMulticurrency = currencies.size > 1 || (currencies.size === 1 && !currencies.has(budgetCurrency));

    const expenseDetails = expenseList.map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      currency: e.currency ?? "UYU",
      description: e.description ?? "",
      category: e.category ?? "",
      merchant_name: e.merchant_name ?? "",
      expense_date: e.expense_date ?? "",
    }));

    const reportTotalUsd = totalInUSD(
      expenseList.map((e) => ({ amount: Number(e.amount ?? 0), currency: e.currency ?? "UYU" })),
      reportExchangeRates,
    );
    const advanceAmountUsd = typeof report.advance_amount_usd === "number"
      ? Number(report.advance_amount_usd)
      : null;
    const settlement = (typeof reportTotalUsd === "number" && typeof advanceAmountUsd === "number")
      ? calculateSettlement(reportTotalUsd, advanceAmountUsd)
      : null;

    const payload = {
      reportId,
      reportTitle: report.title ?? "",
      employeeName: employeeData?.full_name || "Empleado",
      country: employeeData?.country ?? "",
      amount: report.total_amount ?? 0,
      budgetCurrency,
      exchangeRates: reportExchangeRates,
      isMulticurrency,
      expenseDetails,
      reportTotalUsd,
      advanceAmountUsd,
      settlementDirection: settlement?.direction ?? null,
      settlementAmountUsd: settlement?.amountUsd ?? null,
      closingDate: closedAtIso.slice(0, 10),
      closedAt: closedAtIso,
      employeeEmail,
      pagadorEmails,
      pagadorEmailList: payerEmailArray,
      ...(chusmaEmails ? { chusmaEmails, chusmaEmailList: effectiveChusmaEmailsList } : {}),
      targetEmails,
      excelBase64,
      excelName,
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.error("Error devuelto por n8n (rendición aprobada):", await response.text());
      }
    } catch (error) {
      console.error("Error enviando webhook de rendición aprobada a N8N:", error);
    }
  }

  revalidatePath(`/dashboard/reports/${reportId}`);
}
