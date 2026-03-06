'use client';

const N8N_NOTIFY_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_NOTIFY_WEBHOOK_URL ??
  'https://n8n.srv908725.hstgr.cloud/webhook/notificaciones';

interface UserInfo {
  id: string;
  full_name: string;
  email: string;
}

interface ReportReviewPayload {
  reportId: string;
  employee: UserInfo;
  supervisor: UserInfo;
  summary: {
    total: number;
    approved: number;
    rejected: number;
    reviewing: number;
    pending: number;
    allApproved: boolean;
    hasRejectedOrReviewing: boolean;
  };
}

export async function sendReportReviewNotification(payload: ReportReviewPayload) {
  if (!N8N_NOTIFY_WEBHOOK_URL) {
    return { success: false as const };
  }

  const body = {
    type: 'noti_revision',
    noti_revision: true,
    report_id: payload.reportId,
    employee: {
      id: payload.employee.id,
      nombre: payload.employee.full_name,
      email: payload.employee.email,
    },
    supervisor: {
      id: payload.supervisor.id,
      nombre: payload.supervisor.full_name,
      email: payload.supervisor.email,
    },
    resumen_gastos: {
      total: payload.summary.total,
      aprobados: payload.summary.approved,
      rechazados: payload.summary.rejected,
      en_revision: payload.summary.reviewing,
      pendientes: payload.summary.pending,
      todos_aprobados: payload.summary.allApproved,
      hay_rechazados_o_revision: payload.summary.hasRejectedOrReviewing,
    },
  };

  try {
    const response = await fetch(N8N_NOTIFY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('N8N review webhook error:', await response.text());
      return { success: false as const };
    }

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // ignore JSON parse errors
    }

    return { success: true as const, data };
  } catch (error) {
    console.error('N8N review webhook failed:', error);
    return { success: false as const };
  }
}

