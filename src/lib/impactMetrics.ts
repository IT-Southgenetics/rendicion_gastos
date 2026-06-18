/**
 * Impact metrics — lógica de cálculo para el dashboard de administradores.
 * Todas las funciones son puras (sin side effects) y reciben el cliente Supabase como parámetro.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toUSD } from "@/lib/currency";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// ─────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────

export type MonthlyVolume = {
  month: string;   // "YYYY-MM"
  label: string;   // "ene. 2025"
  reports: number;
  paidReports: number;
  expenses: number;
};

export type CycleTimes = {
  avgDaysToApproval: number | null;
  medianDaysToApproval: number | null;
  minDaysToApproval: number | null;
  maxDaysToApproval: number | null;
  avgDaysToPayment: number | null;
  medianDaysToPayment: number | null;
  avgDaysApprovalToPayment: number | null;
  reportsWithFullDates: number;
  totalPaidReports: number;
};

export type OdooMetrics = {
  totalWithAsiento: number;
  withoutAsiento: number;
  eligibleForOdoo: number;
  syncRate: number | null;
  corporateCard: number;
};

export type AdvanceMetrics = {
  total: number;
  byStatus: Record<string, number>;
  paid: number;
  linkedToReport: number;
  avgDaysToPayment: number | null;
  countWithTimingData: number;
};

export type TopEmployee = {
  userId: string;
  name: string;
  paidCount: number;
};

export type TopCountry = {
  country: string;
  count: number;
};

export type AlertItem = {
  type: "odoo_missing" | "approval_stale" | "submission_stale";
  count: number;
  label: string;
  description: string;
  severity: "warning" | "info";
};

export type ImpactDashboardData = {
  summary: {
    totalReports: number;
    paidReports: number;
    approvedReports: number;
    inReviewReports: number;
    draftReports: number;
    totalExpenses: number;
    activeUsers: number;
    totalAmountPaidUSD: number | null;
  };
  cycleTimes: CycleTimes;
  odoo: OdooMetrics;
  monthlyVolume: MonthlyVolume[];
  advances: AdvanceMetrics;
  topEmployees: TopEmployee[];
  topCountries: TopCountry[];
  paymentMethodSplit: { employeePaid: number; corporateCard: number };
  expenseStatusBreakdown: Record<string, number>;
  alerts: AlertItem[];
};

// ─────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────

function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function med(arr: number[]): number | null {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function daysDiff(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
}

function toMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-UY", {
    month: "short",
    year: "numeric",
  });
}

function last12Months(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

// ─────────────────────────────────────────────
// Main fetch function
// ─────────────────────────────────────────────

export async function fetchImpactData(supabase: SupabaseClient): Promise<ImpactDashboardData> {
  const [
    { data: reportsRaw },
    { data: expensesRaw },
    { data: advancesRaw },
    { data: profilesRaw },
    { data: ratesRaw },
  ] = await Promise.all([
    supabase
      .from("weekly_reports")
      .select(
        "id, user_id, workflow_status, payment_method, odoo_move_id, created_at, closed_at, payment_date, amount_paid, payment_currency, updated_at",
      ),
    supabase
      .from("expenses")
      .select("id, status, currency, amount, created_at"),
    supabase
      .from("advances")
      .select("id, user_id, status, submitted_at, payment_date, created_report_id"),
    supabase
      .from("profiles")
      .select("id, full_name, country"),
    supabase
      .from("exchange_rates")
      .select("currency_code, rate_to_usd"),
  ]);

  const R = reportsRaw ?? [];
  const E = expensesRaw ?? [];
  const A = advancesRaw ?? [];

  const profileMap = new Map<string, { full_name: string; country: string | null }>();
  for (const p of profilesRaw ?? []) profileMap.set(p.id, p);

  const exchangeRates: Record<string, number> = {};
  for (const r of ratesRaw ?? []) exchangeRates[r.currency_code] = Number(r.rate_to_usd);

  // ─── 1. Summary ───────────────────────────
  const paidReports = R.filter((r) => r.workflow_status === "paid");
  const approvedReports = R.filter((r) => r.workflow_status === "approved");
  const inReviewReports = R.filter(
    (r) => r.workflow_status === "submitted" || r.workflow_status === "needs_correction",
  );
  const draftReports = R.filter(
    (r) => !r.workflow_status || r.workflow_status === "draft",
  );

  const activeUsers = new Set(R.map((r) => r.user_id)).size;

  let totalAmountPaidUSD: number | null = 0;
  for (const r of paidReports) {
    if (!r.amount_paid) continue;
    const usd = toUSD(Number(r.amount_paid), r.payment_currency ?? "USD", exchangeRates);
    if (usd === null) {
      totalAmountPaidUSD = null;
      break;
    }
    totalAmountPaidUSD = (totalAmountPaidUSD ?? 0) + usd;
  }

  // ─── 2. Cycle times ───────────────────────
  const daysToApproval: number[] = [];
  const daysToPayment: number[] = [];
  const daysApprToPayment: number[] = [];
  let fullDateCount = 0;

  for (const r of paidReports) {
    if (!r.created_at) continue;
    if (r.closed_at) {
      const d = daysDiff(r.created_at, r.closed_at);
      if (d >= 0) daysToApproval.push(d);
    }
    if (r.payment_date) {
      const d = daysDiff(r.created_at, r.payment_date);
      if (d >= 0) daysToPayment.push(d);
    }
    if (r.closed_at && r.payment_date) {
      const d = daysDiff(r.closed_at, r.payment_date);
      if (d >= 0) {
        daysApprToPayment.push(d);
        fullDateCount++;
      }
    }
  }

  const cycleTimes: CycleTimes = {
    avgDaysToApproval: avg(daysToApproval),
    medianDaysToApproval: med(daysToApproval),
    minDaysToApproval: daysToApproval.length ? Math.min(...daysToApproval) : null,
    maxDaysToApproval: daysToApproval.length ? Math.max(...daysToApproval) : null,
    avgDaysToPayment: avg(daysToPayment),
    medianDaysToPayment: med(daysToPayment),
    avgDaysApprovalToPayment: avg(daysApprToPayment),
    reportsWithFullDates: fullDateCount,
    totalPaidReports: paidReports.length,
  };

  // ─── 3. Odoo ──────────────────────────────
  const totalWithAsiento = R.filter((r) => r.odoo_move_id !== null).length;
  const corporateCard = R.filter((r) => r.payment_method === "corporate_card").length;
  const eligible = R.filter(
    (r) =>
      r.payment_method === "employee_paid" &&
      (r.workflow_status === "approved" || r.workflow_status === "paid"),
  );
  const eligibleWithAsiento = eligible.filter((r) => r.odoo_move_id !== null).length;
  const withoutAsiento = eligible.filter((r) => r.odoo_move_id === null).length;
  const syncRate = eligible.length > 0 ? (eligibleWithAsiento / eligible.length) * 100 : null;

  const odoo: OdooMetrics = {
    totalWithAsiento,
    withoutAsiento,
    eligibleForOdoo: eligible.length,
    syncRate,
    corporateCard,
  };

  // ─── 4. Monthly volume ────────────────────
  const months = last12Months();
  const reportsByMonth: Record<string, number> = {};
  const paidByMonth: Record<string, number> = {};
  const expensesByMonth: Record<string, number> = {};

  for (const r of R) {
    if (!r.created_at) continue;
    const key = toMonthKey(r.created_at);
    if (!months.includes(key)) continue;
    reportsByMonth[key] = (reportsByMonth[key] ?? 0) + 1;
    if (r.workflow_status === "paid") paidByMonth[key] = (paidByMonth[key] ?? 0) + 1;
  }
  for (const e of E) {
    if (!e.created_at) continue;
    const key = toMonthKey(e.created_at);
    if (!months.includes(key)) continue;
    expensesByMonth[key] = (expensesByMonth[key] ?? 0) + 1;
  }

  const monthlyVolume: MonthlyVolume[] = months.map((m) => ({
    month: m,
    label: monthLabel(m),
    reports: reportsByMonth[m] ?? 0,
    paidReports: paidByMonth[m] ?? 0,
    expenses: expensesByMonth[m] ?? 0,
  }));

  // ─── 5. Advances ──────────────────────────
  const byStatus: Record<string, number> = {};
  for (const a of A) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

  const paidAdvances = A.filter((a) => a.status === "paid");
  const linkedToReport = A.filter((a) => a.created_report_id !== null).length;

  const advDays: number[] = [];
  for (const a of paidAdvances) {
    if (a.submitted_at && a.payment_date) {
      const d = daysDiff(a.submitted_at, a.payment_date);
      if (d >= 0) advDays.push(d);
    }
  }

  const advances: AdvanceMetrics = {
    total: A.length,
    byStatus,
    paid: paidAdvances.length,
    linkedToReport,
    avgDaysToPayment: avg(advDays),
    countWithTimingData: advDays.length,
  };

  // ─── 6. Desglose operativo ─────────────────
  const paidByUser: Record<string, number> = {};
  for (const r of paidReports) paidByUser[r.user_id] = (paidByUser[r.user_id] ?? 0) + 1;

  const topEmployees: TopEmployee[] = Object.entries(paidByUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, paidCount]) => ({
      userId,
      name: profileMap.get(userId)?.full_name ?? "Desconocido",
      paidCount,
    }));

  const countByCountry: Record<string, number> = {};
  for (const r of R) {
    const country = profileMap.get(r.user_id)?.country ?? "Sin datos";
    countByCountry[country] = (countByCountry[country] ?? 0) + 1;
  }

  const topCountries: TopCountry[] = Object.entries(countByCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }));

  const employeePaid = R.filter((r) => r.payment_method === "employee_paid").length;
  const corpCard = R.filter((r) => r.payment_method === "corporate_card").length;

  const expenseStatusBreakdown: Record<string, number> = {};
  for (const e of E) {
    const s = e.status ?? "pending";
    expenseStatusBreakdown[s] = (expenseStatusBreakdown[s] ?? 0) + 1;
  }

  // ─── 7. Alertas ───────────────────────────
  const now = Date.now();
  const SEVEN_DAYS = 7 * 86_400_000;
  const TEN_DAYS = 10 * 86_400_000;
  const alerts: AlertItem[] = [];

  if (withoutAsiento > 0) {
    alerts.push({
      type: "odoo_missing",
      count: withoutAsiento,
      label: "Sin asiento Odoo",
      description: `${withoutAsiento} rendición${withoutAsiento !== 1 ? "es" : ""} aprobada${withoutAsiento !== 1 ? "s" : ""}/pagada${withoutAsiento !== 1 ? "s" : ""} (employee_paid) sin asiento en Odoo.`,
      severity: "warning",
    });
  }

  const staleApproved = approvedReports.filter((r) => {
    const ref = r.closed_at ?? r.updated_at ?? r.created_at;
    return ref ? now - new Date(ref).getTime() > SEVEN_DAYS : false;
  });
  if (staleApproved.length > 0) {
    alerts.push({
      type: "approval_stale",
      count: staleApproved.length,
      label: "Aprobadas sin pago (+7 días)",
      description: `${staleApproved.length} rendición${staleApproved.length !== 1 ? "es" : ""} aprobada${staleApproved.length !== 1 ? "s" : ""} esperan pago hace más de 7 días.`,
      severity: "warning",
    });
  }

  const staleSubmitted = inReviewReports.filter((r) => {
    const ref = r.updated_at ?? r.created_at;
    return ref ? now - new Date(ref).getTime() > TEN_DAYS : false;
  });
  if (staleSubmitted.length > 0) {
    alerts.push({
      type: "submission_stale",
      count: staleSubmitted.length,
      label: "En revisión (+10 días)",
      description: `${staleSubmitted.length} rendición${staleSubmitted.length !== 1 ? "es" : ""} en revisión sin cerrar hace más de 10 días (usando updated_at como proxy de actividad).`,
      severity: "info",
    });
  }

  return {
    summary: {
      totalReports: R.length,
      paidReports: paidReports.length,
      approvedReports: approvedReports.length,
      inReviewReports: inReviewReports.length,
      draftReports: draftReports.length,
      totalExpenses: E.length,
      activeUsers,
      totalAmountPaidUSD,
    },
    cycleTimes,
    odoo,
    monthlyVolume,
    advances,
    topEmployees,
    topCountries,
    paymentMethodSplit: { employeePaid, corporateCard: corpCard },
    expenseStatusBreakdown,
    alerts,
  };
}
