type AdvanceWebhookPayload = Record<string, unknown>;

export async function sendAdvanceWebhook(
  webhookUrl: string | undefined,
  payload: AdvanceWebhookPayload,
  context: string,
) {
  if (!webhookUrl) return;
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`Error devuelto por n8n (${context}):`, await response.text());
    }
  } catch (error) {
    console.error(`Error enviando webhook (${context}) a N8N:`, error);
  }
}
