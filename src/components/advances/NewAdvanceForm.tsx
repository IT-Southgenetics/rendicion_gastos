'use client';

import { useEffect, useMemo, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { submitNewAdvanceAction, type AdvanceActionState } from "@/actions/advanceActions";
import { ADVANCE_CURRENCIES } from "@/lib/advances";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full sm:w-auto disabled:opacity-70"
    >
      {pending ? "Enviando..." : "Enviar Solicitud"}
    </button>
  );
}

export function NewAdvanceForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<AdvanceActionState | null, FormData>(submitNewAdvanceAction, null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Solicitud de anticipo enviada.");
      router.push("/dashboard/advances");
      router.refresh();
      return;
    }
    toast.error(state.error || "No se pudo enviar la solicitud.");
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          required
          maxLength={100}
          placeholder="Ej: Viaje comercial Montevideo"
          className="input"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">
          Fecha de anticipo <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          name="advanceDate"
          defaultValue={today}
          required
          className="input"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">
          Anticipo requerido <span className="text-red-500">*</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-[1fr,240px]">
          <div className="flex h-11 overflow-hidden rounded-xl border border-[#d4cfe0] bg-white">
            <span className="flex items-center border-r border-[#d4cfe0] bg-[#f5f1f8] px-3 text-xs font-semibold text-[var(--color-text-muted)]">
              {selectedCurrency}
            </span>
            <input
              type="number"
              name="requestedAmount"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              className="flex-1 bg-transparent px-3 text-sm outline-none"
            />
            <span className="flex items-center border-l border-[#d4cfe0] bg-[#f5f1f8] px-3 text-[0.65rem] text-[var(--color-text-muted)]">
              max.
            </span>
          </div>
          <select
            name="currency"
            className="input"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
          >
            {ADVANCE_CURRENCIES.map((currency) => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">
          Descripcion <span className="font-normal text-[var(--color-text-muted)]">(opcional)</span>
        </label>
        <textarea
          name="description"
          className="input min-h-[90px]"
          placeholder="Ej: Viaje para visita de clientes y actividades comerciales."
          maxLength={500}
        />
      </div>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="text-sm font-medium text-[var(--color-primary)]"
          onClick={() => router.back()}
        >
          Cancelar
        </button>
        <SubmitButton />
      </div>
    </form>
  );
}
