import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { fetchImpactData } from "@/lib/impactMetrics";
import { fmt } from "@/lib/currency";

// ─── Small display helpers ────────────────────────────────────────────────────

function Dash() {
  return <span className="text-[var(--color-text-muted)]">—</span>;
}

function Num({ v, decimals = 1 }: { v: number | null | undefined; decimals?: number }) {
  if (v === null || v === undefined) return <Dash />;
  return <>{v.toLocaleString("es-UY", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

function Usd({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <Dash />;
  return <>USD {fmt(v)}</>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
      {children}
    </h2>
  );
}

function StatCard({
  label,
  value,
  sub,
  color = "text-[var(--color-primary)]",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="card px-3 py-4 text-center">
      <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[0.65rem] text-[var(--color-text-muted)]">{sub}</p>}
    </div>
  );
}

// ─── Mini bar for monthly chart ───────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-xs tabular-nums text-[var(--color-text-muted)]">
        {value}
      </span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ImpactPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const me = await getMyProfile(supabase, session);
  if (me?.role !== "admin") redirect("/dashboard");

  const data = await fetchImpactData(supabase);
  const { summary, cycleTimes, odoo, monthlyVolume, advances, alerts } = data;

  // Monthly chart max (for relative bars)
  const maxMonthlyReports = Math.max(...monthlyVolume.map((m) => m.reports), 1);
  const maxMonthlyExpenses = Math.max(...monthlyVolume.map((m) => m.expenses), 1);

  const statusLabels: Record<string, string> = {
    draft: "Borrador",
    submitted: "Enviada",
    needs_correction: "Corrección",
    approved: "Aprobada",
    paid: "Pagada",
  };

  const advStatusLabels: Record<string, string> = {
    draft: "Borrador",
    submitted: "Enviado",
    approved: "Aprobado",
    paid: "Pagado",
    rejected: "Rechazado",
  };

  const expenseStatusLabels: Record<string, string> = {
    pending: "Pendiente",
    reviewing: "En revisión",
    approved: "Aprobado",
    rejected: "Rechazado",
  };

  const expenseStatusColors: Record<string, string> = {
    pending: "text-amber-600",
    reviewing: "text-blue-600",
    approved: "text-emerald-600",
    rejected: "text-red-600",
  };

  return (
    <div className="w-full max-w-full space-y-8">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="page-title">Impacto de la app</h1>
        <p className="page-subtitle">Métricas del proceso automatizado de rendiciones y anticipos.</p>
      </div>

      {/* ───────────────────────────────────────────────────
          1. RESUMEN
      ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Resumen general</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard label="Total rendiciones" value={summary.totalReports} color="text-[var(--color-primary)]" />
          <StatCard label="Pagadas" value={summary.paidReports} color="text-emerald-600" />
          <StatCard label="Aprobadas" value={summary.approvedReports} sub="pendientes de pago" color="text-blue-600" />
          <StatCard label="En revisión" value={summary.inReviewReports} color="text-amber-600" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard label="Gastos cargados" value={summary.totalExpenses} color="text-[var(--color-text-primary)]" />
          <StatCard label="Usuarios activos" value={summary.activeUsers} sub="con rendiciones" color="text-[var(--color-text-primary)]" />
          <StatCard label="Borrador / sin estado" value={summary.draftReports} color="text-gray-500" />
          <StatCard
            label="Monto total pagado"
            value={<Usd v={summary.totalAmountPaidUSD} />}
            sub={summary.totalAmountPaidUSD === null ? "Faltan tipos de cambio" : undefined}
            color="text-[var(--color-secondary)]"
          />
        </div>
      </section>

      {/* ───────────────────────────────────────────────────
          2. TIEMPOS DE CICLO
      ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Tiempos de ciclo</SectionTitle>
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          Solo rendiciones pagadas con fechas disponibles ({cycleTimes.reportsWithFullDates} de{" "}
          {cycleTimes.totalPaidReports} pagadas tienen created_at, closed_at y payment_date completos).
          weekly_reports no tiene submitted_at; se usa created_at como punto de inicio.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-3">
          <div className="card p-3 sm:p-4">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Creación → Aprobación
            </p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">Promedio</p>
            <p className="text-lg font-bold text-[var(--color-primary)]">
              <Num v={cycleTimes.avgDaysToApproval} /> d
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Mediana</p>
            <p className="font-semibold text-[var(--color-text-primary)]">
              <Num v={cycleTimes.medianDaysToApproval} /> d
            </p>
            <div className="mt-2 flex gap-3 text-[0.65rem] text-[var(--color-text-muted)]">
              <span>Min: <Num v={cycleTimes.minDaysToApproval} />d</span>
              <span>Max: <Num v={cycleTimes.maxDaysToApproval} />d</span>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Creación → Pago
            </p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">Promedio</p>
            <p className="text-lg font-bold text-[var(--color-primary)]">
              <Num v={cycleTimes.avgDaysToPayment} /> d
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Mediana</p>
            <p className="font-semibold text-[var(--color-text-primary)]">
              <Num v={cycleTimes.medianDaysToPayment} /> d
            </p>
          </div>

          <div className="card p-3 sm:p-4">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Aprobación → Pago
            </p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">Promedio</p>
            <p className="text-lg font-bold text-[var(--color-primary)]">
              <Num v={cycleTimes.avgDaysApprovalToPayment} /> d
            </p>
            <p className="mt-2 text-[0.65rem] text-[var(--color-text-muted)]">
              Desde closed_at hasta payment_date
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────
          3. AUTOMATIZACIÓN ODOO
      ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Automatización Odoo</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Sync rate card */}
          <div className="card p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Tasa de sync Odoo
            </p>
            <p className="mt-1 text-3xl font-bold text-[var(--color-primary)]">
              {odoo.syncRate !== null ? `${odoo.syncRate.toFixed(0)}%` : <Dash />}
            </p>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                style={{ width: `${odoo.syncRate ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              {odoo.eligibleForOdoo - odoo.withoutAsiento} de {odoo.eligibleForOdoo} elegibles (employee_paid, aprobadas/pagadas)
            </p>
          </div>

          <div className="card p-4">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Asientos en Odoo
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-primary)]">Con asiento (total)</span>
                <span className="font-bold text-emerald-600">{odoo.totalWithAsiento}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-primary)]">Sin asiento (elegibles)</span>
                <span className={`font-bold ${odoo.withoutAsiento > 0 ? "text-amber-600" : "text-gray-400"}`}>
                  {odoo.withoutAsiento}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-primary)]">Tarjeta corporativa</span>
                <span className="font-bold text-[var(--color-text-primary)]">{odoo.corporateCard}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────
          4. VOLUMEN MENSUAL
      ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Volumen por período (últimos 12 meses)</SectionTitle>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Mes
                </th>
                <th className="px-4 py-3 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Rendiciones creadas
                </th>
                <th className="px-4 py-3 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Rendiciones pagadas
                </th>
                <th className="px-4 py-3 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Gastos cargados
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyVolume.map((m, i) => (
                <tr
                  key={m.month}
                  className={`border-b border-[var(--color-border)] last:border-0 ${
                    i % 2 === 0 ? "" : "bg-gray-50/50"
                  }`}
                >
                  <td className="px-4 py-2.5 text-xs font-medium capitalize text-[var(--color-text-primary)]">
                    {m.label}
                  </td>
                  <td className="px-4 py-2.5">
                    <MiniBar value={m.reports} max={maxMonthlyReports} color="bg-[var(--color-primary)]" />
                  </td>
                  <td className="px-4 py-2.5">
                    <MiniBar value={m.paidReports} max={maxMonthlyReports} color="bg-emerald-500" />
                  </td>
                  <td className="px-4 py-2.5">
                    <MiniBar value={m.expenses} max={maxMonthlyExpenses} color="bg-[var(--color-secondary)]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────
          5. ANTICIPOS
      ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Anticipos</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard label="Total anticipos" value={advances.total} color="text-[var(--color-primary)]" />
          <StatCard label="Pagados" value={advances.paid} color="text-emerald-600" />
          <StatCard label="Vinculados a rendición" value={advances.linkedToReport} color="text-blue-600" />
          <StatCard
            label="Tiempo solicitud → pago"
            value={
              advances.avgDaysToPayment !== null ? (
                <><Num v={advances.avgDaysToPayment} /> d</>
              ) : (
                <Dash />
              )
            }
            sub={
              advances.countWithTimingData > 0
                ? `${advances.countWithTimingData} anticipos con fechas`
                : "Sin datos suficientes"
            }
            color="text-[var(--color-text-primary)]"
          />
        </div>

        {/* Status breakdown */}
        {advances.total > 0 && (
          <div className="card mt-3 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Por estado
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(advances.byStatus).map(([status, count]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)]"
                >
                  {advStatusLabels[status] ?? status}
                  <span className="font-bold text-[var(--color-primary)]">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────
          6. DESGLOSE OPERATIVO
      ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Desglose operativo</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Top empleados */}
          <div className="card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Top 5 empleados (rendiciones pagadas)
            </p>
            {data.topEmployees.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Sin datos</p>
            ) : (
              <ol className="space-y-2">
                {data.topEmployees.map((e, i) => (
                  <li key={e.userId} className="flex items-center gap-2 text-sm">
                    <span className="w-4 shrink-0 text-[0.65rem] font-bold text-[var(--color-text-muted)]">
                      {i + 1}.
                    </span>
                    <span className="flex-1 truncate text-[var(--color-text-primary)]">{e.name}</span>
                    <span className="font-bold text-[var(--color-primary)]">{e.paidCount}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Top países */}
          <div className="card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Top 5 países (por rendiciones)
            </p>
            {data.topCountries.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Sin datos</p>
            ) : (
              <ol className="space-y-2">
                {data.topCountries.map((c, i) => (
                  <li key={c.country} className="flex items-center gap-2 text-sm">
                    <span className="w-4 shrink-0 text-[0.65rem] font-bold text-[var(--color-text-muted)]">
                      {i + 1}.
                    </span>
                    <span className="flex-1 truncate text-[var(--color-text-primary)]">{c.country}</span>
                    <span className="font-bold text-[var(--color-primary)]">{c.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Medio de pago + gastos */}
          <div className="card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Medio de pago
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-primary)]">Empleado paga</span>
                <span className="font-bold text-[var(--color-primary)]">
                  {data.paymentMethodSplit.employeePaid}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-primary)]">Tarjeta corporativa</span>
                <span className="font-bold text-[var(--color-primary)]">
                  {data.paymentMethodSplit.corporateCard}
                </span>
              </div>
            </div>

            <p className="mb-3 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Estado de gastos
            </p>
            <div className="space-y-1.5">
              {Object.entries(data.expenseStatusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className={expenseStatusColors[status] ?? "text-[var(--color-text-primary)]"}>
                    {expenseStatusLabels[status] ?? status}
                  </span>
                  <span className="font-bold text-[var(--color-text-primary)]">{count}</span>
                </div>
              ))}
              {Object.keys(data.expenseStatusBreakdown).length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">Sin datos</p>
              )}
            </div>
          </div>
        </div>

        {/* Workflow status summary */}
        <div className="card mt-3 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Rendiciones por estado de workflow
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "draft", count: summary.draftReports, color: "text-gray-500" },
                { key: "submitted", count: summary.inReviewReports, color: "text-blue-600" },
                { key: "approved", count: summary.approvedReports, color: "text-amber-600" },
                { key: "paid", count: summary.paidReports, color: "text-emerald-600" },
              ] as const
            ).map(({ key, count, color }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)]"
              >
                {statusLabels[key] ?? key}
                <span className={`font-bold ${color}`}>{count}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────
          7. ALERTAS
      ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Salud del proceso</SectionTitle>
        {alerts.length === 0 ? (
          <div className="card flex items-center gap-3 p-4">
            <span className="text-lg">✓</span>
            <p className="text-sm text-emerald-600 font-medium">Sin alertas activas. El proceso está al día.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.type}
                className={`card flex items-start gap-3 p-4 ${
                  alert.severity === "warning"
                    ? "border-l-4 border-l-amber-400"
                    : "border-l-4 border-l-blue-400"
                }`}
              >
                <span className="mt-0.5 shrink-0 text-base">
                  {alert.severity === "warning" ? "⚠" : "ℹ"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {alert.label}
                    <span
                      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                        alert.severity === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {alert.count}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
