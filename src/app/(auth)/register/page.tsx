"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Cuenta creada. Revisa tu email si es necesario.");
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
          Crear cuenta
        </h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Regístrate para comenzar a rendir tus gastos.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              Nombre completo
            </label>
            <input
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              Email
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              Contraseña
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-[var(--color-primary)]">
            Iniciar sesión
          </a>
        </p>
      </div>
    </div>
  );
}

