'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteAdvanceAction } from "@/actions/advanceActions";

interface DeleteAdvanceButtonProps {
  advanceId: string;
  advanceTitle: string;
}

export function DeleteAdvanceButton({
  advanceId,
  advanceTitle,
}: DeleteAdvanceButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteAdvanceAction(advanceId);
    setDeleting(false);

    if (!result.ok) {
      toast.error(`Error al eliminar: ${result.error}`);
      setConfirming(false);
      return;
    }

    toast.success("Anticipo eliminado.");
    router.push("/dashboard/admin/advances");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
        <p className="text-sm font-medium text-red-700">
          ¿Eliminar &ldquo;{advanceTitle}&rdquo;?
        </p>
        <p className="text-xs text-red-600">
          Esta acción no se puede deshacer.
        </p>
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
      className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
    >
      Eliminar anticipo
    </button>
  );
}
