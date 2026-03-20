'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SUPPORTED_CURRENCIES = [
  { code: "UYU", label: "Peso uruguayo" },
  { code: "ARS", label: "Peso argentino" },
  { code: "PYG", label: "Guaraní paraguayo" },
  { code: "BRL", label: "Real brasileño" },
];

interface GlobalExchangeRateEditorProps {
  /** Rates actuales { UYU: 43, ARS: 1000, ... } */
  initialRates: Record<string, number>;
}

export function GlobalExchangeRateEditor({ initialRates }: GlobalExchangeRateEditorProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [rates, setRates] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const { code } of SUPPORTED_CURRENCIES) {
      init[code] = initialRates[code] ? String(initialRates[code]) : "";
    }
    return init;
  });

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    for (const { code } of SUPPORTED_CURRENCIES) {
      const val = parseFloat(rates[code] ?? "");
      if (isNaN(val) || val <= 0) {
        toast.error(`Ingresá un tipo de cambio válido para ${code}.`);
        return;
      }
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();

    const upserts = SUPPORTED_CURRENCIES.map(({ code }) => ({
      currency:   code,
      rate:       parseFloat(rates[code]),
      updated_by: session?.user.id ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("exchange_rate_presets")
      .upsert(upserts, { onConflict: "currency" });

    setSaving(false);

    if (error) {
      toast.error(`Error al guardar: ${error.message}`);
      return;
    }
    toast.success("Tipos de cambio globales actualizados.");
    router.refresh();
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Tipos de cambio globales
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Valores predeterminados que se aplican automáticamente a cada nueva rendición.
          Cuántas unidades de cada moneda equivalen a <strong>1 USD</strong>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORTED_CURRENCIES.map(({ code, label }) => (
          <div key={code} className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">
              {code}
              <span className="font-normal text-[var(--color-text-muted)]"> — {label}</span>
            </label>
            <div className="flex h-10 overflow-hidden rounded-xl border border-[#d4cfe0] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 bg-white transition-all">
              <span className="flex items-center bg-[#f5f1f8] px-3 text-xs font-semibold text-[var(--color-text-muted)] border-r border-[#d4cfe0] whitespace-nowrap shrink-0">
                1 USD =
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="flex-1 bg-transparent px-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] min-w-0"
                placeholder="0.00"
                value={rates[code] ?? ""}
                onChange={(e) => setRates((p) => ({ ...p, [code]: e.target.value }))}
              />
              <span className="flex items-center bg-[#f5f1f8] px-3 text-xs font-semibold text-[var(--color-text-muted)] border-l border-[#d4cfe0] shrink-0">
                {code}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full sm:w-auto text-sm"
      >
        {saving ? "Guardando..." : "Guardar tipos de cambio"}
      </button>
    </div>
  );
}
