import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateReportWorkbook } from "@/lib/excel/generateReport";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const reportId = url.searchParams.get("report_id");

  if (!reportId) {
    return NextResponse.json(
      { error: "report_id es requerido" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: report, error: reportError } = await supabase
    .from("weekly_reports")
    .select("*, profiles!weekly_reports_user_id_fkey(full_name)")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError || !report) {
    return NextResponse.json(
      { error: "Rendición no encontrada" },
      { status: 404 }
    );
  }

  const { data: expenses, error: expensesError } = await supabase
    .from("expenses")
    .select("expense_date, category, description, amount, currency, status, ticket_url, rejection_reason")
    .eq("report_id", reportId)
    .order("expense_date", { ascending: true });

  if (expensesError) {
    return NextResponse.json(
      { error: "No se pudieron obtener los gastos" },
      { status: 500 }
    );
  }

  // Fetch global presets as fallback for reports without per-report rates
  const { data: presets } = await supabase
    .from("exchange_rate_presets")
    .select("currency, rate");

  const globalPresets: Record<string, number> = {};
  for (const p of presets ?? []) globalPresets[p.currency] = Number(p.rate);

  const reportRates   = (report.exchange_rates ?? {}) as Record<string, number>;
  const exchangeRates: Record<string, number> = { ...globalPresets, ...reportRates };

  const employeeName = (report as any).profiles?.full_name ?? "";
  const title = report.title ?? null;

  // Build safe filename from title or dates
  const safeTitle = title
    ? title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_").slice(0, 40)
    : `${report.week_start}_${report.week_end}`;

  const buffer = generateReportWorkbook({
    employeeName,
    title,
    weekStart: report.week_start,
    weekEnd: report.week_end,
    closedAt: report.closed_at,
    exchangeRates,
    expenses: (expenses ?? []) as any,
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rendicion_${safeTitle}.xlsx"`,
    },
  });
}

