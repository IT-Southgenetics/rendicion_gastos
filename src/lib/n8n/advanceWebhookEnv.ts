/**
 * Lee las URLs de webhook de anticipos desde variables de entorno.
 * Si la variable no está configurada retorna undefined — sendAdvanceWebhook
 * loguea un warning y continúa sin enviar, lo que es el comportamiento correcto
 * en lugar de fallar silenciosamente hacia una URL hardcodeada.
 *
 * Variables requeridas en .env.local / Vercel:
 *   N8N_WEBHOOK_URL_ADVANCE_SUBMITTED
 *   N8N_WEBHOOK_URL_ADVANCE_APPROVED
 *   N8N_WEBHOOK_URL_ADVANCE_REJECTED
 *   N8N_WEBHOOK_URL_ADVANCE_PAID
 */
export type AdvanceWebhookKind = "submitted" | "approved" | "rejected" | "paid";

export function getAdvanceWebhookUrl(kind: AdvanceWebhookKind): string | undefined {
  let key: string;
  switch (kind) {
    case "submitted":
      key = "N8N_WEBHOOK_URL_ADVANCE_SUBMITTED";
      break;
    case "approved":
      key = "N8N_WEBHOOK_URL_ADVANCE_APPROVED";
      break;
    case "rejected":
      key = "N8N_WEBHOOK_URL_ADVANCE_REJECTED";
      break;
    case "paid":
      key = "N8N_WEBHOOK_URL_ADVANCE_PAID";
      break;
    default:
      return undefined;
  }
  const raw = process.env[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
