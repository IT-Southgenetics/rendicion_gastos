import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { N8nWebhookPayload } from "@/lib/n8n/webhook";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const payload = (await req.json()) as N8nWebhookPayload;

  try {
    const { expense_id, extracted_data, status, error } = payload;

    const { data: expense } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", expense_id)
      .maybeSingle();

    if (!expense) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    const update: any = {
      n8n_processed: true,
      n8n_raw_data: extracted_data as any,
      ocr_extracted_text: extracted_data.raw_text ?? null,
    };

    if (status === "success") {
      if (typeof extracted_data.amount === "number") {
        update.amount = extracted_data.amount;
      }
      if (extracted_data.description) {
        update.description = extracted_data.description;
      }
      if (extracted_data.date) {
        update.expense_date = extracted_data.date;
      }
      if (
        extracted_data.merchant ||
        (extracted_data as any).merchant_name ||
        (extracted_data as any).vendor_name
      ) {
        update.merchant_name =
          (extracted_data as any).merchant_name ??
          (extracted_data as any).vendor_name ??
          extracted_data.merchant ??
          null;
      }
    }

    await supabase
      .from("expenses")
      .update(update)
      .eq("id", expense_id);

    await supabase.from("n8n_webhooks_log").insert({
      expense_id,
      webhook_payload: payload as any,
      response_data: null,
      status,
      error_message: error ?? null,
    });

    await supabase.from("notifications").insert({
      user_id: expense.user_id,
      title:
        status === "success"
          ? "Ticket procesado"
          : "Error al procesar ticket",
      message:
        status === "success"
          ? "Hemos leído automáticamente la información de tu ticket."
          : "Hubo un problema al leer tu ticket. Revisa los datos del gasto.",
      type: status === "success" ? "info" : "error",
      related_expense_id: expense.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error al procesar webhook" },
      { status: 500 }
    );
  }
}

