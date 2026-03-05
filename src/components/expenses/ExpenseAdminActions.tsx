'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Action = "approve" | "reject" | "reviewing";

interface ExpenseAdminActionsProps {
  expenseId: string;
  currentStatus: string;
}

export function ExpenseAdminActions({ expenseId, currentStatus }: ExpenseAdminActionsProps) {
  const router   = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [note,          setNote]          = useState("");
  const [saving,        setSaving]        = useState(false);

  const isFinal = currentStatus === "approved" || currentStatus === "rejected";

  async function applyAction(action: Action) {
    if (action === "reject" && !note.trim()) {
      toast.error("Ingresá el motivo de rechazo.");
      return;
    }

    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();

    const updates: Record<string, unknown> = {
      status:           action === "approve" ? "approved" : action === "reject" ? "rejected" : "reviewing",
      reviewed_by:      session?.user.id ?? null,
      reviewed_at:      new Date().toISOString(),
      rejection_reason: action === "reject"    ? note.trim() : null,
      admin_notes:      action === "reviewing" ? note.trim() || null : null,
    };

    const { error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", expenseId);

    setSaving(false);

    if (error) {
      toast.error(`Error al actualizar: ${error.message}`);
      return;
    }

    const messages: Record<Action, string> = {
      approve:   "Gasto aprobado.",
      reject:    "Gasto rechazado.",
      reviewing: "Gasto marcado en revisión.",
    };
    toast.success(messages[action]);
    setPendingAction(null);
    setNote("");
    router.refresh();
  }

  if (isFinal) {
    return (
      <span className="text-xs text-[var(--color-text-muted)] italic">Sin acciones disponibles</span>
    );
  }

  // Panel de confirmación (rechazo o revisión con nota)
  if (pendingAction === "reject" || pendingAction === "reviewing") {
    const isReject = pendingAction === "reject";
    return (
      <div className="flex flex-col gap-2 min-w-[220px]">
        <textarea
          className="input min-h-[60px] text-xs"
          placeholder={isReject ? "Motivo de rechazo (obligatorio)..." : "Comentario para el empleado (opcional)..."}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={400}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={() => applyAction(pendingAction)}
            disabled={saving}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
              isReject ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving ? "Guardando..." : isReject ? "Confirmar rechazo" : "Confirmar revisión"}
          </button>
          <button
            onClick={() => { setPendingAction(null); setNote(""); }}
            disabled={saving}
            className="rounded-lg border border-[#e5e2ea] px-3 py-1.5 text-xs font-medium hover:bg-[#f5f1f8]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {currentStatus !== "approved" && (
        <button
          onClick={() => applyAction("approve")}
          disabled={saving}
          className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          ✓ Aprobar
        </button>
      )}
      {currentStatus !== "reviewing" && (
        <button
          onClick={() => setPendingAction("reviewing")}
          disabled={saving}
          className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          ↺ Revisión
        </button>
      )}
      <button
        onClick={() => setPendingAction("reject")}
        disabled={saving}
        className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
      >
        ✕ Rechazar
      </button>
    </div>
  );
}
