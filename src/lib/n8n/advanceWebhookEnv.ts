/**
 * Advance n8n URLs must be read with dynamic keys so the bundler (Turbopack/Webpack)
 * does not replace `process.env.N8N_*` with `undefined` inside "use server" modules.
 */
export type AdvanceWebhookKind = "submitted" | "approved" | "rejected" | "paid";

export function getAdvanceWebhookUrl(kind: AdvanceWebhookKind): string | undefined {
  let key: string;
  let fallbackUrl: string;
  switch (kind) {
    case "submitted":
      key = "N8N_WEBHOOK_URL_ADVANCE_SUBMITTED";
      fallbackUrl = "https://n8n.srv908725.hstgr.cloud/webhook/advance-submitted";
      break;
    case "approved":
      key = "N8N_WEBHOOK_URL_ADVANCE_APPROVED";
      fallbackUrl = "https://n8n.srv908725.hstgr.cloud/webhook/advance-approved";
      break;
    case "rejected":
      key = "N8N_WEBHOOK_URL_ADVANCE_REJECTED";
      fallbackUrl = "https://n8n.srv908725.hstgr.cloud/webhook/advance-rejected";
      break;
    case "paid":
      key = "N8N_WEBHOOK_URL_ADVANCE_PAID";
      fallbackUrl = "https://n8n.srv908725.hstgr.cloud/webhook/advance-paid";
      break;
    default:
      return undefined;
  }
  const raw = process.env[key];
  if (typeof raw !== "string") return fallbackUrl;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallbackUrl;
}
