import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { GlobalExchangeRateEditor } from "@/components/admin/GlobalExchangeRateEditor";

export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const me = await getMyProfile(supabase, session);
  if (me?.role !== "admin") redirect("/dashboard");

  const [
    { data: users },
    { data: pendingExpenses },
    { data: reviewingExpenses },
    { data: openReports },
    { data: presets },
  ] = await Promise.all([
    supabase.from("profiles").select("id"),
    supabase.from("expenses").select("id").eq("status", "pending"),
    supabase.from("expenses").select("id").eq("status", "reviewing"),
    supabase.from("weekly_reports").select("id").eq("status", "open"),
    supabase.from("exchange_rates").select("currency_code, rate_to_usd"),
  ]);

  const stats = [
    { label: "Usuarios",             value: users?.length ?? 0,             color: "text-[var(--color-primary)]" },
    { label: "Rendiciones abiertas", value: openReports?.length ?? 0,       color: "text-emerald-600" },
    { label: "Gastos pendientes",    value: pendingExpenses?.length ?? 0,   color: "text-amber-600" },
    { label: "En revisión",          value: reviewingExpenses?.length ?? 0, color: "text-blue-600" },
  ];

  const initialRates: Record<string, number> = {};
  for (const p of (presets ?? []) as { currency_code: string; rate_to_usd: number }[]) {
    initialRates[p.currency_code] = Number(p.rate_to_usd);
  }

  return (
    <div className="w-full max-w-full space-y-5">
      <div className="min-w-0">
        <h1 className="page-title">Panel administrador</h1>
        <p className="page-subtitle">Resumen global y configuración.</p>
      </div>

      {/* Stats */}
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card px-2 py-3 text-center sm:p-4">
            <p className="truncate text-[0.55rem] font-semibold uppercase text-[var(--color-text-muted)] sm:text-[0.65rem]">
              {s.label}
            </p>
            <p className={`mt-1 text-xl font-bold sm:text-2xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tipos de cambio globales */}
      <GlobalExchangeRateEditor initialRates={initialRates} />

      {/* Acciones rápidas */}
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <Link
          href="/admin/reports"
          className="card flex w-full min-w-0 items-center gap-2 overflow-hidden p-3 transition-shadow hover:shadow-md sm:gap-3 sm:p-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 sm:h-10 sm:w-10">
            <svg className="h-4 w-4 text-[var(--color-primary)] sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">Revisar rendiciones</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">
              Ver y validar gastos
            </p>
          </div>
          <span className="shrink-0 text-[var(--color-text-muted)]">›</span>
        </Link>

        <Link
          href="/admin/advances"
          className="card flex w-full min-w-0 items-center gap-2 overflow-hidden p-3 transition-shadow hover:shadow-md sm:gap-3 sm:p-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 sm:h-10 sm:w-10">
            <svg className="h-4 w-4 text-[var(--color-primary)] sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 8h-3V4.5A2.5 2.5 0 0014.5 2h-5A2.5 2.5 0 007 4.5V8H4a2 2 0 00-2 2v8a4 4 0 004 4h12a4 4 0 004-4v-8a2 2 0 00-2-2zM9 8V5h6v3" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">Revisar anticipos</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">
              Ver solicitudes de anticipos
            </p>
          </div>
          <span className="shrink-0 text-[var(--color-text-muted)]">›</span>
        </Link>

        <Link
          href="/admin/users"
          className="card flex w-full min-w-0 items-center gap-2 overflow-hidden p-3 transition-shadow hover:shadow-md sm:gap-3 sm:p-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 sm:h-10 sm:w-10">
            <svg className="h-4 w-4 text-[var(--color-secondary)] sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">Gestionar usuarios</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">Roles y asignaciones</p>
          </div>
          <span className="shrink-0 text-[var(--color-text-muted)]">›</span>
        </Link>
      </div>
    </div>
  );
}
