import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reportId = id;
  if (!reportId) {
    return NextResponse.json({ error: "reportId requerido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as
    | { odooMoveId?: unknown }
    | null;

  const rawOdooMoveId = body?.odooMoveId;
  const odooMoveIdNum = typeof rawOdooMoveId === "number" ? rawOdooMoveId : Number(rawOdooMoveId);

  if (!Number.isFinite(odooMoveIdNum)) {
    return NextResponse.json(
      { error: "odooMoveId debe ser un número" },
      { status: 400 },
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor" },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabaseAdmin
    .from("weekly_reports")
    .update({ odoo_move_id: odooMoveIdNum })
    .eq("id", reportId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Error actualizando rendición" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Rendición no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, reportId });
}

