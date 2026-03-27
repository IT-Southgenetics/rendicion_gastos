'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { sendReportReviewNotification } from '@/lib/n8n/sendReportReviewNotification';
import { toUSD, totalInUSD } from '@/lib/currency';

interface NotifyReviewButtonProps {
  reportId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
}

export function NotifyReviewButton({
  reportId,
  employeeId,
  employeeName,
  employeeEmail,
}: NotifyReviewButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      toast.error('No hay sesión activa.');
      return;
    }

    const { data: supervisorProfile, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', session.user.id)
      .single();

    if (error || !supervisorProfile) {
      setLoading(false);
      toast.error('No se pudo obtener el perfil del supervisor.');
      return;
    }

    if (supervisorProfile.role !== 'supervisor' && supervisorProfile.role !== 'admin') {
      setLoading(false);
      toast.error('Solo un supervisor puede notificar la revisión.');
      return;
    }

    // Optional: verificar que realmente supervise a este empleado
    try {
      const { data: assignment } = await supabase
        .from('supervision_assignments')
        .select('id')
        .eq('supervisor_id', supervisorProfile.id)
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (!assignment && supervisorProfile.role !== 'admin') {
        setLoading(false);
        toast.error('No estás asignado como supervisor de este empleado.');
        return;
      }
    } catch {
      // si falla el check, seguimos igual; la API de N8N seguirá recibiendo datos
    }
    // Obtener estados y montos de los gastos de esta rendición
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('status, amount, currency')
      .eq('report_id', reportId);

    if (expensesError) {
      setLoading(false);
      toast.error('No se pudieron leer los gastos para la notificación.');
      return;
    }

    const statuses = (expenses ?? []).map((e) => e.status ?? 'pending');
    const total = statuses.length;
    const approved = statuses.filter((s) => s === 'approved').length;
    const rejected = statuses.filter((s) => s === 'rejected').length;
    const reviewing = statuses.filter((s) => s === 'reviewing').length;
    const pending = statuses.filter((s) => s === 'pending').length;

    const allApproved = total > 0 && approved === total;
    const hasRejectedOrReviewing = rejected > 0 || reviewing > 0;

    // Calcular totales solo cuando todos están aprobados
    let totalOriginal: number | null = null;
    let originalCurrency: string | null = null;
    let totalUsd: number | null = null;
    let singleCurrency = false;

    if (allApproved && expenses && expenses.length > 0) {
      const currencies = new Set<string>();
      const amountsByCurrency: Record<string, number> = {};

      for (const e of expenses) {
        const cur = e.currency ?? 'UYU';
        currencies.add(cur);
        amountsByCurrency[cur] = (amountsByCurrency[cur] ?? 0) + Number(e.amount ?? 0);
      }

      singleCurrency = currencies.size === 1;

      // Necesitamos tipos de cambio para convertir a USD cuando haga falta
      const [{ data: report }, { data: presets }] = await Promise.all([
        supabase
          .from('weekly_reports')
          .select('exchange_rates')
          .eq('id', reportId)
          .single(),
        supabase.from('exchange_rates').select('currency_code, rate_to_usd'),
      ]);

      const globalPresets: Record<string, number> = {};
      for (const p of (presets ?? []) as { currency_code: string; rate_to_usd: number }[]) {
        globalPresets[p.currency_code] = Number(p.rate_to_usd);
      }
      const reportRates = (report?.exchange_rates ?? {}) as Record<string, number>;
      const rates: Record<string, number> = { ...globalPresets, ...reportRates };

      if (singleCurrency) {
        const cur = Array.from(currencies)[0]!;
        originalCurrency = cur;
        totalOriginal = amountsByCurrency[cur] ?? 0;

        if (cur === 'USD') {
          totalUsd = totalOriginal;
        } else {
          totalUsd = toUSD(totalOriginal, cur, rates);
        }
      } else {
        totalUsd = totalInUSD(
          (expenses ?? []).map((e) => ({
            amount: Number(e.amount ?? 0),
            currency: e.currency ?? 'UYU',
          })),
          rates,
        );
      }
    }

    const result = await sendReportReviewNotification({
      reportId,
      employee: {
        id: employeeId,
        full_name: employeeName,
        email: employeeEmail,
      },
      supervisor: {
        id: supervisorProfile.id,
        full_name: supervisorProfile.full_name,
        email: supervisorProfile.email,
      },
      summary: {
        total,
        approved,
        rejected,
        reviewing,
        pending,
        allApproved,
        hasRejectedOrReviewing,
        totalOriginal,
        originalCurrency,
        totalUsd,
        singleCurrency,
      },
    });

    if (!result.success) {
      setLoading(false);
      toast.error('No se pudo notificar la revisión.');
      return;
    }

    // Si no todos los gastos están aprobados, reabrir automáticamente la rendición
    if (!allApproved) {
      const { error: reopenError } = await supabase
        .from('weekly_reports')
        .update({ status: 'open', closed_at: null })
        .eq('id', reportId);

      if (reopenError) {
        setLoading(false);
        toast.error('Se envió la notificación pero no se pudo reabrir la rendición.');
        router.refresh();
        return;
      }
    }

    setLoading(false);
    toast.success('Revisión notificada.');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-full border border-[#e5e2ea] bg-white px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[#f5f1f8] disabled:opacity-60"
    >
      {loading ? 'Notificando…' : 'Notificar revisión'}
    </button>
  );
}

