"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
    toast.success("Te enviamos un correo para recuperar tu contraseña.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="card p-5 sm:p-6" style={{ width: "100%", maxWidth: 340 }}>
        <h1 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
          Recuperar contraseña
        </h1>
        <p className="mb-4 text-[0.75rem] text-[var(--color-text-muted)]">
          Ingresá tu email y te enviaremos un enlace para cambiar tu contraseña.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-primary)]">
              Email
            </label>
            <input
              type="email"
              className="input !min-h-[38px] !py-2 !text-[0.85rem]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full !min-h-[40px] !py-2 !text-[0.8rem]" disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>
        </form>

        {sent && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Revisá tu email. El enlace te llevará a la pantalla para definir una nueva contraseña.
          </p>
        )}

        <p className="mt-3 text-center text-[0.7rem] text-[var(--color-text-muted)]">
          <Link href="/login" className="text-[var(--color-primary)] hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

