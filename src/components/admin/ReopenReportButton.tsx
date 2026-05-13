'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ReopenReportButtonProps {
  reportId: string;
  workflowStatus: string;
}

export function ReopenReportButton({ reportId, workflowStatus }: ReopenReportButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPaid = workflowStatus === "paid";
  const isApproved = workflowStatus === "approved";
  const needsExtraWarning = isPaid || isApproved;

  async function handleReopen() {
    setLoading(true);
    const { data, error } = await supabase
      .from("weekly_reports")
      .update({
        status: "open",
        closed_at: null,
        workflow_status: "draft",
      })
      .eq("id", reportId)
      .select("id");
    setLoading(false);

    if (error) {
      toast.error(`Error al reabrir: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error("No se pudo reabrir la rendición (sin permisos).");
      return;
    }

    toast.success("Rendición reabierta.");
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 min-w-[280px] max-w-sm">
        <p className="text-sm font-semibold text-amber-800">Reabrir rendición</p>
        <p className="text-xs text-amber-700">
          La rendición vuelve a estado <strong>abierta</strong> y al empleado le va a
          permitir cargar o corregir gastos. El flujo de aprobación se reinicia.
        </p>
        {needsExtraWarning && (
          <p className="text-xs font-semibold text-red-700">
            {isPaid
              ? "Atención: esta rendición ya está pagada. Reabrirla no revierte el pago en Odoo ni en el anticipo asociado."
              : "Atención: esta rendición ya estaba aprobada. Al reabrirla, vuelve al flujo de revisión."}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleReopen}
            disabled={loading}
            className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Reabriendo..." : "Sí, reabrir"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="flex-1 rounded-lg border border-[#e5e2ea] bg-white px-3 py-2 text-xs font-medium hover:bg-[#f5f1f8]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
    >
      Reabrir rendición
    </button>
  );
}
