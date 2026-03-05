export interface N8nExtractedData {
  amount?: number;
  description?: string;
  date?: string;
  category?: string;
  merchant?: string;
  raw_text?: string;
}

export interface N8nWebhookPayload {
  expense_id: string;
  extracted_data: N8nExtractedData;
  status: "success" | "error";
  error?: string;
}

export async function sendToN8n(args: {
  expense_id: string;
  ticket_url: string;
  user_id: string;
}) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
}

