import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL_GASTO_CORREGIDO;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!WEBHOOK_URL) {
    return NextResponse.json(
      { error: "N8N webhook URL for corrected expense not configured" },
      { status: 500 },
    );
  }

  const { expenseId, employeeResponse } = (await req.json()) as {
    expenseId?: string;
    employeeResponse?: string;
  };

  if (!expenseId) {
    return NextResponse.json({ error: "expenseId is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  // Leer gasto y empleado (dueño)
  const { data: expense } = await supabase
    .from("expenses")
    .select("id, user_id, amount")
    .eq("id", expenseId)
    .maybeSingle();

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const [{ data: employee }, { data: assignments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", expense.user_id)
      .single(),
    supabase
      .from("supervision_assignments")
      .select(
        "supervisor_id, profiles!supervision_assignments_supervisor_id_fkey(email)",
      )
      .eq("employee_id", expense.user_id),
  ]);

  const supervisorEmails = (assignments ?? [])
    .map((a) => (a.profiles as { email: string | null } | null)?.email)
    .filter((e): e is string => !!e)
    .join(",");

  const payload = {
    expenseId,
    employeeName: employee?.full_name ?? "",
    amount: Number(expense.amount ?? 0),
    employeeResponse: employeeResponse ?? "",
    supervisorEmails,
  };

  console.log("Payload hacia n8n (gasto corregido):", payload);

  try {
    const response = await fetch(WEBHOOK_URL as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("Status de n8n (gasto corregido):", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error devuelto por n8n (gasto corregido):", errorText);
    }
  } catch (error) {
    console.error("Error enviando webhook de gasto corregido a N8N:", error);
  }

  return NextResponse.json({ ok: true });
}

