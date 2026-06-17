'use client';

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ExternalLink, CreditCard, Wallet } from "lucide-react";

export function PlatformUpdateAnnouncement() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <Dialog.Root open modal>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          onEscapeKeyDown={() => setOpen(false)}
          onInteractOutside={() => setOpen(false)}
          aria-describedby="announcement-description"
        >
          <div className="relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-[#e5e2ea] bg-white shadow-2xl overflow-hidden">

            {/* ── Header ── */}
            <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-[#f0ecf5]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase"
                    style={{ backgroundColor: "rgba(130,3,138,0.1)", color: "var(--color-primary)" }}
                  >
                    Novedades
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-shrink-0 rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[#f5f1f8] transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Dialog.Title className="mt-2 text-base font-bold text-[var(--color-text-primary)] leading-snug">
                Actualización importante en Rendición SG
              </Dialog.Title>
            </div>

            {/* ── Contenido scrollable ── */}
            <div id="announcement-description" className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Sección 1: Nuevo enlace */}
              <section
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "linear-gradient(135deg, rgba(130,3,138,0.06) 0%, rgba(130,3,138,0.02) 100%)",
                  border: "1.5px solid rgba(130,3,138,0.18)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    1
                  </span>
                  <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Nuevo enlace de acceso
                  </h2>
                </div>

                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  A partir de ahora, ingresá a través de:
                </p>

                <a
                  href="https://rendicion.southgenetics.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "#fff",
                  }}
                >
                  <span>rendicion.southgenetics.com</span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0 opacity-80" />
                </a>

                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Actualizá tus marcadores con este nuevo enlace.
                </p>

                {/* Nota tranquilizadora */}
                <div
                  className="flex items-start gap-2 rounded-lg px-3 py-2.5"
                  style={{ backgroundColor: "rgba(130,3,138,0.06)" }}
                >
                  <span className="mt-0.5 text-base leading-none flex-shrink-0">✅</span>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-primary)" }}>
                    <strong className="font-semibold">Solo cambia la URL.</strong>{" "}
                    Tu usuario, contraseña, historial de rendiciones y toda la información quedan exactamente igual — no se pierde nada.
                  </p>
                </div>
              </section>

              {/* Sección 2: Nuevas funcionalidades */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Nuevas funcionalidades
                </h2>

                {/* 2a: Tarjeta corporativa */}
                <div className="rounded-xl border border-[#e8dff0] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "rgba(255,113,18,0.1)" }}
                    >
                      <CreditCard className="h-3.5 w-3.5" style={{ color: "var(--color-secondary)" }} />
                    </span>
                    <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Pago con tarjeta de crédito corporativa
                    </h3>
                  </div>
                  <p className="text-[0.7rem] text-[var(--color-text-muted)] leading-relaxed">
                    Al crear una nueva rendición, podés indicar el medio de pago:
                  </p>
                  <ul className="space-y-1">
                    <li className="flex items-start gap-1.5 text-[0.7rem] text-[var(--color-text-muted)]">
                      <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                      <span>
                        <strong className="font-semibold text-[var(--color-text-primary)]">Pagado por el empleado</strong>
                        {" "}— gastos que pagaste vos y luego rendís
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5 text-[0.7rem] text-[var(--color-text-muted)]">
                      <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                      <span>
                        <strong className="font-semibold text-[var(--color-text-primary)]">Tarjeta de crédito corporativa</strong>
                        {" "}— gastos abonados con la tarjeta de la empresa
                      </span>
                    </li>
                  </ul>
                  <p className="text-[0.7rem] text-[var(--color-text-muted)] leading-relaxed">
                    Elegí la opción correcta al armar la rendición para que el flujo quede alineado con cómo se pagaron los gastos.
                  </p>
                </div>

                {/* 2b: Anticipos */}
                <div className="rounded-xl border border-[#e8dff0] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "rgba(130,3,138,0.1)" }}
                    >
                      <Wallet className="h-3.5 w-3.5" style={{ color: "var(--color-primary)" }} />
                    </span>
                    <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Nueva sección de Anticipos
                    </h3>
                  </div>
                  <p className="text-[0.7rem] text-[var(--color-text-muted)] leading-relaxed">
                    En el menú lateral encontrás el módulo <strong className="font-semibold text-[var(--color-text-primary)]">Anticipos</strong>, donde podés:
                  </p>
                  <ul className="space-y-1">
                    {[
                      "Solicitar un anticipo antes de un viaje o actividad",
                      "Hacer seguimiento del estado (enviada, aprobada, pagada, etc.)",
                      "Vincular el anticipo con la rendición para calcular la liquidación",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-1.5 text-[0.7rem] text-[var(--color-text-muted)]">
                        <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[0.7rem] text-[var(--color-text-muted)] leading-relaxed">
                    Si tenés viaje o gastos previstos, usá Anticipos{" "}
                    <strong className="font-semibold text-[var(--color-text-primary)]">antes</strong> de la rendición final.
                  </p>
                </div>
              </div>

              {/* Cierre */}
              <p className="text-[0.7rem] text-[var(--color-text-muted)] leading-relaxed">
                Si tenés dudas o inconvenientes para ingresar, contactá al equipo de Rendiciones.
              </p>
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-[#f0ecf5] flex items-center justify-between gap-3">
              <p className="text-[0.65rem] text-[var(--color-text-muted)]">
                Sistema — Requisitos técnicos
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-primary btn-shimmer text-sm px-5 py-2 min-h-0"
              >
                Entendido
              </button>
            </div>

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
