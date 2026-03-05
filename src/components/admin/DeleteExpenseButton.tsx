'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface DeleteExpenseButtonProps {
  expenseId:   string;
  description: string;
  /** URL a la que redirigir tras eliminar */
  returnTo?:   string;
}

export function DeleteExpenseButton({ expenseId, description, returnTo }: DeleteExpenseButtonProps) {
  const supabase = createSupabaseBrowserClient();
  const router   = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
    setDeleting(false);

    if (error) {
      toast.error(`Error al eliminar: ${error.message}`);
      setConfirming(false);
      return;
    }

    toast.success("Gasto eliminado.");
    if (returnTo) router.push(returnTo);
    else router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[180px]">
          ¿Eliminar &ldquo;{description}&rdquo;?
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {deleting ? "Eliminando..." : "Confirmar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="rounded-lg border border-[#e5e2ea] px-3 py-1.5 text-xs font-medium hover:bg-[#f5f1f8]"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
    >
      Eliminar
    </button>
  );
}
