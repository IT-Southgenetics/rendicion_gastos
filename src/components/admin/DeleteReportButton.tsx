'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface DeleteReportButtonProps {
  reportId:    string;
  reportTitle: string;
  expenseCount: number;
}

export function DeleteReportButton({ reportId, reportTitle, expenseCount }: DeleteReportButtonProps) {
  const supabase = createSupabaseBrowserClient();
  const router   = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  async function handleDelete() {
    setDeleting(true);
    // Los gastos se eliminan por CASCADE
    const { error } = await supabase.from("weekly_reports").delete().eq("id", reportId);
    setDeleting(false);

    if (error) {
      toast.error(`Error al eliminar: ${error.message}`);
      setConfirming(false);
      return;
    }

    toast.success("Rendición eliminada.");
    router.push("/dashboard/admin/reports");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
        <p className="text-sm font-medium text-red-700">
          ¿Eliminar &ldquo;{reportTitle}&rdquo;?
        </p>
        {expenseCount > 0 && (
          <p className="text-xs text-red-600">
            Se eliminarán también los <strong>{expenseCount} gastos</strong> asociados. Esta acción no se puede deshacer.
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? "Eliminando..." : "Sí, eliminar"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="flex-1 rounded-lg border border-[#e5e2ea] bg-white px-3 py-2 text-sm font-medium hover:bg-[#f5f1f8]"
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
      className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
    >
      Eliminar rendición
    </button>
  );
}
