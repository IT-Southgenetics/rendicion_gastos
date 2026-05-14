export type ReportPaymentMethod = "employee_paid" | "corporate_card";

export const REPORT_PAYMENT_METHOD_OPTIONS: {
  value: ReportPaymentMethod;
  label: string;
}[] = [
  { value: "employee_paid", label: "Pagado por el empleado" },
  { value: "corporate_card", label: "Tarjeta de credito" },
];

export function labelForReportPaymentMethod(
  value: string | null | undefined,
): string {
  const found = REPORT_PAYMENT_METHOD_OPTIONS.find((o) => o.value === value);
  return found?.label ?? REPORT_PAYMENT_METHOD_OPTIONS[0].label;
}
