'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface DeleteUserButtonProps {
  userId: string;
  fullName: string;
  isCurrentUser: boolean;
}

export function DeleteUserButton({ userId, fullName, isCurrentUser }: DeleteUserButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isCurrentUser) return null;

  async function handleDelete() {
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("delete_user_completely", {
      target_user_id: userId,
    });

    setLoading(false);
    setConfirming(false);

    if (error) {
      toast.error(`No se pudo eliminar al usuario: ${error.message}`);
      return;
    }

    toast.success(`${fullName} fue eliminado del sistema.`);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <p className="text-[0.6rem] text-red-600 font-medium text-right max-w-[180px]">
          Se eliminarán sus rendiciones, gastos y asignaciones.
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[0.65rem] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading && (
              <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? "Eliminando..." : "Sí, eliminar"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="rounded-full border border-[#e5e2ea] px-2.5 py-0.5 text-[0.65rem] text-[var(--color-text-primary)] hover:bg-[#f5f1f8]"
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
      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-0.5 text-[0.65rem] font-medium text-red-600 transition-colors hover:bg-red-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      Eliminar
    </button>
  );
}
