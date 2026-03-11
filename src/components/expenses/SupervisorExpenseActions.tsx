'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, X, AlertCircle } from "lucide-react";

type ExpenseStatus = "pending" | "approved" | "rejected" | "reviewing";

interface SupervisorExpenseActionsProps {
  expenseId: string;
  currentStatus: ExpenseStatus;
  updateStatus: (
    expenseId: string,
    status: ExpenseStatus,
    comment: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}

type PendingAction = "approve" | "reject" | "review";

export function SupervisorExpenseActions({
  expenseId,
  currentStatus,
  updateStatus,
}: SupervisorExpenseActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const isFinal = currentStatus === "approved" || currentStatus === "rejected";

  async function handleConfirm(action: PendingAction) {
    let nextStatus: ExpenseStatus;
    switch (action) {
      case "approve":
        nextStatus = "approved";
        break;
      case "reject":
        nextStatus = "rejected";
        break;
      case "review":
        // Usamos "reviewing" como equivalente de "needs_review"
        nextStatus = "reviewing";
        break;
    }

    const trimmed = comment.trim();
    if ((action === "reject" || action === "review") && !trimmed) {
      toast.error("Ingresá un comentario para continuar.");
      return;
    }

    setLoading(true);
    const result = await updateStatus(expenseId, nextStatus, trimmed);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error ?? "No se pudo actualizar el gasto.");
      return;
    }

    if (action === "approve") {
      toast.success("Gasto aprobado.");
    } else if (action === "reject") {
      toast.success("Gasto rechazado.");
    } else {
      toast.success("Solicitud de revisión enviada al empleado.");
    }

    setPendingAction(null);
    setComment("");
    setOpen(false);
    router.refresh();
  }

  if (isFinal) {
    return (
      <div className="mt-3 rounded-lg border border-[#e5e2ea] bg-[#faf7ff] px-3 py-2 text-xs text-[var(--color-text-muted)]">
        Este gasto ya fue {currentStatus === "approved" ? "aprobado" : "rechazado"}. No hay más acciones disponibles.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleConfirm("approve")}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Check className="h-3 w-3" />
          Aprobar
        </button>

        <Dialog.Root
          open={open}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setPendingAction(null);
              setComment("");
            }
            setOpen(isOpen);
          }}
        >
          <div className="flex flex-wrap gap-2">
            <Dialog.Trigger asChild>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setPendingAction("review");
                  setOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                <AlertCircle className="h-3 w-3" />
                Solicitar revisión
              </button>
            </Dialog.Trigger>
            <Dialog.Trigger asChild>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setPendingAction("reject");
                  setOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
              >
                <X className="h-3 w-3" />
                Rechazar
              </button>
            </Dialog.Trigger>
          </div>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
            <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-[#e5e2ea] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <Dialog.Title className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {pendingAction === "reject"
                      ? "Rechazar gasto"
                      : "Solicitar revisión del gasto"}
                  </Dialog.Title>
                  <Dialog.Close
                    disabled={loading}
                    className="rounded-full p-1 text-[var(--color-text-muted)] hover:bg-[#f5f1f8]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Dialog.Close>
                </div>

                <Dialog.Description className="text-xs text-[var(--color-text-muted)]">
                  Escribí un comentario claro para que el empleado entienda qué debe corregir o por qué se rechaza el gasto.
                </Dialog.Description>

                <textarea
                  className="input min-h-[96px] text-xs"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={400}
                  placeholder={
                    pendingAction === "reject"
                      ? "Explicá por qué se rechaza este gasto..."
                      : "Indicá qué debe revisar o corregir el empleado..."
                  }
                />
                <p className="text-right text-[0.65rem] text-[var(--color-text-muted)]">
                  {comment.length} / 400
                </p>

                <div className="flex justify-end gap-2 pt-1">
                  <Dialog.Close
                    disabled={loading}
                    className="rounded-lg border border-[#e5e2ea] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[#f5f1f8]"
                    onClick={() => {
                      setPendingAction(null);
                      setComment("");
                    }}
                  >
                    Cancelar
                  </Dialog.Close>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (!pendingAction) return;
                      handleConfirm(pendingAction);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                      pendingAction === "reject"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-amber-600 hover:bg-amber-700"
                    }`}
                  >
                    {loading ? "Guardando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}

