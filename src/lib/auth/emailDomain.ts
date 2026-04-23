const ALLOWED_EMAIL_DOMAINS = ["southgenetics.com", "pacificgenomics.cl"] as const;

export function isAllowedCorporateEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return false;
  const domain = normalized.split("@").pop() ?? "";
  return ALLOWED_EMAIL_DOMAINS.includes(domain as (typeof ALLOWED_EMAIL_DOMAINS)[number]);
}

export function allowedCorporateEmailMessage() {
  return "Solo se permite registro con emails @southgenetics.com o @pacificgenomics.cl.";
}
