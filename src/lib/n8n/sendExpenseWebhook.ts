const N8N_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ??
  "https://n8n.srv908725.hstgr.cloud/webhook/factura";

interface ExpenseWebhookPayload {
  id: string;
  report_id: string;
  user_id: string;
  categoria: string;
  descripcion: string;
  monto: number;
  moneda: string;
  fecha: string;
  comprobante_url: string;
  merchant_name?: string;
}

export async function sendExpenseWebhook(expense: ExpenseWebhookPayload) {
  if (!N8N_WEBHOOK_URL) {
    return { success: false as const };
  }

  const payload = {
    body: {
      id: expense.id,
      gasto_id: expense.id,
      categoria: expense.categoria,
      descripcion: expense.descripcion,
      monto: expense.monto,
      moneda: expense.moneda,
      comprobante_url: expense.comprobante_url,
      fecha: expense.fecha,
      rendicion_id: expense.report_id,
      user_id: expense.user_id,
      merchant_name: expense.merchant_name ?? null,
    },
    webhookUrl: N8N_WEBHOOK_URL,
    executionMode: "production",
  };

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("N8N webhook error:", await response.text());
      return { success: false as const };
    }

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // ignore JSON parse errors
    }

    return { success: true as const, data };
  } catch (error) {
    console.error("N8N webhook failed:", error);
    return { success: false as const };
  }
}

