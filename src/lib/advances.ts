export const ADVANCE_CURRENCIES = [
  { value: "USD", label: "Dolar (USD)" },
  { value: "UYU", label: "Peso uruguayo (UYU)" },
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "CLP", label: "Peso chileno (CLP)" },
  { value: "GTQ", label: "Quetzal guatemalteco (GTQ)" },
  { value: "HNL", label: "Lempira hondureno (HNL)" },
] as const;

export type AdvanceCurrency = (typeof ADVANCE_CURRENCIES)[number]["value"];

export const ADVANCE_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  approved: "Aprobado",
  rejected: "Rechazado",
  paid: "Pagado",
};

export function getAdvanceStatusClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-blue-100 text-blue-700";
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "submitted":
      return "bg-amber-100 text-amber-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
