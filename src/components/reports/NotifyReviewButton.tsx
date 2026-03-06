'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { sendReportReviewNotification } from '@/lib/n8n/sendReportReviewNotification';

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
    });

    setLoading(false);

    if (!result.success) {
      toast.error('No se pudo notificar la revisión.');
      return;
    }

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

