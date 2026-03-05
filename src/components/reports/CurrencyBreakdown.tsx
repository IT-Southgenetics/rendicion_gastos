'use client';

import { useState } from "react";
import { fmt } from "@/lib/currency";

interface CurrencyBreakdownProps {
  /** Total por moneda, ej: { UYU: 59000, ARS: 30000 } */
  totalsByCurrency: Record<string, number>;
  /** Total convertido a USD (null si faltan tipos de cambio) */
  totalUSD: number | null;
  budgetMax?: number | null;
  budgetOverrun?: boolean;
  /** Mostrar en modo compacto (para la card de stats del usuario) */
  compact?: boolean;
}

const CURRENCY_FLAGS: Record<string, string> = {
  UYU: "🇺🇾",
  ARS: "🇦🇷",
  USD: "🇺🇸",
  PYG: "🇵🇾",
  BRL: "🇧🇷",
};

export function CurrencyBreakdown({
  totalsByCurrency,
  totalUSD,
  budgetMax,
  budgetOverrun,
  compact = false,
}: CurrencyBreakdownProps) {
  const [open, setOpen] = useState(false);

  const currencies = Object.keys(totalsByCurrency);
  const hasMultiple = currencies.length > 0;

  if (!hasMultiple) return null;

  return (
    <div className={compact ? "" : "space-y-1"}>
      {/* Fila principal: total USD + botón */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-[#f5f1f8] transition-colors -mx-3"
      >
        <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
          Desglose por moneda
        </span>
        <div className="flex items-center gap-2">
          {totalUSD !== null ? (
            <span className={`text-sm font-bold ${budgetOverrun ? "text-red-600" : "text-[var(--color-primary)]"}`}>
              USD {fmt(totalUSD)}
              {budgetMax && (
                <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">
                  / {fmt(budgetMax)} {budgetOverrun && "⚠️"}
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)] italic">Sin conversión</span>
          )}
          <svg
            className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {/* Panel desplegable */}
      {open && (
        <div className="rounded-xl border border-[#e5e2ea] bg-[#fdfbff] px-4 py-3 space-y-2">
          {currencies.map((currency) => (
            <div key={currency} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                <span>{CURRENCY_FLAGS[currency] ?? "💱"}</span>
                <span className="font-medium text-[var(--color-text-primary)]">{currency}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                {fmt(totalsByCurrency[currency])}
              </span>
            </div>
          ))}
          {totalUSD !== null && currencies.some((c) => c !== "USD") && (
            <>
              <div className="border-t border-[#e5e2ea] pt-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                  <span>🇺🇸</span>
                  <span className="font-semibold text-[var(--color-primary)]">Total USD</span>
                </span>
                <span className={`text-sm font-bold tabular-nums ${budgetOverrun ? "text-red-600" : "text-[var(--color-primary)]"}`}>
                  {fmt(totalUSD)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
