import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExcelExport } from "@/lib/excelGenerator";

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

  const { buffer, fileName } = await generateExcelExport(reportId);

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

