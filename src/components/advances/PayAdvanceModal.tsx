'use client';

import { useActionState, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { X, CreditCard } from "lucide-react";
import { payAdvanceAction, type AdvanceActionState } from "@/actions/advanceActions";
import { fmt } from "@/lib/currency";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
    >
      {pending ? "Pagando..." : "Pagar"}
    </button>
  );
}

export function PayAdvanceModal({
  advanceId,
  amount,
  currency,
  advanceDate,
}: {
  advanceId: string;
  amount: number;
  currency: string;
  advanceDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<AdvanceActionState | null, FormData>(payAdvanceAction, null);
  const todayDefault = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Pago de anticipo registrado.");
      setOpen(false);
      router.refresh();
      return;
    }
    toast.error(state.error || "No se pudo registrar el pago del anticipo.");
  }, [state, router]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <CreditCard className="h-3 w-3" />
          Pagar
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="relative w-full max-w-md space-y-4 rounded-2xl border border-[#e5e2ea] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="text-sm font-semibold text-[var(--color-text-primary)]">
                Registrar pago de anticipo
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-1 text-[var(--color-text-muted)] hover:bg-[#f5f1f8]">
                <X className="h-3.5 w-3.5" />
              </Dialog.Close>
            </div>

            <form action={formAction} className="space-y-3">
              <input type="hidden" name="advanceId" value={advanceId} />

              <div className="rounded-xl border border-[#e5e2ea] bg-[#faf8fc] p-3">
                <p className="text-[0.65rem] font-semibold uppercase text-[var(--color-text-muted)]">Monto solicitado</p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{currency} {fmt(Number(amount))}</p>
                <p className="mt-1 text-[0.7rem] text-[var(--color-text-muted)]">Fecha del anticipo: {new Date(advanceDate + "T12:00:00").toLocaleDateString("es-UY")}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[var(--color-text-primary)]">
                  Fecha de pago
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  required
                  defaultValue={todayDefault}
                  className="input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[var(--color-text-primary)]">
                  Monto pagado
                </label>
                <input
                  type="number"
                  name="paidAmount"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={String(amount)}
                  className="input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[var(--color-text-primary)]">
                  Comprobante de pago
                </label>
                <input
                  type="file"
                  name="receiptFile"
                  accept="image/*,application/pdf"
                  required
                  className="block w-full text-[0.7rem] text-[var(--color-text-muted)] file:mr-2 file:rounded-full file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-[var(--color-primary-dark)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close className="rounded-full border border-[#e5e2ea] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[#f5f1f8]">
                  Cancelar
                </Dialog.Close>
                <SubmitButton />
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
