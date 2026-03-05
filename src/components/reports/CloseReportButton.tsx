'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ReportStatusButtonProps {
  reportId: string;
  currentStatus: "open" | "closed";
}

export function CloseReportButton({ reportId, currentStatus }: ReportStatusButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading]       = useState(false);

  const isOpen = currentStatus === "open";

  async function handleToggle() {
    setLoading(true);

    const updates = isOpen
      ? { status: "closed" as const, closed_at: new Date().toISOString() }
      : { status: "open"   as const, closed_at: null };

    const { error } = await supabase
      .from("weekly_reports")
      .update(updates)
      .eq("id", reportId);

    setLoading(false);
    setConfirming(false);

    if (error) {
      toast.error(`Error: ${error.message ?? "No se pudo actualizar la rendición."}`);
      return;
    }

    toast.success(isOpen ? "Rendición cerrada." : "Rendición reabierta.");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">
          {isOpen ? "¿Confirmar cierre?" : "¿Reabrir la rendición?"}
        </span>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`rounded-full px-3 py-1 text-xs font-semibold text-white disabled:opacity-60 ${
            isOpen ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {loading ? "Guardando..." : "Confirmar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="rounded-full border border-[#e5e2ea] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[#f5f1f8]"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-full border border-[#e5e2ea] bg-white px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[#f5f1f8]"
    >
      {isOpen ? "Cerrar rendición" : "Reabrir rendición"}
    </button>
  );
}
