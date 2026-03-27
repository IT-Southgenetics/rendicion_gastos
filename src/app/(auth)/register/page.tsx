"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function isSouthGeneticsEmail(email: string) {
  return email.endsWith("@southgenetics.com");
}

function friendlyAuthError(message: string) {
  const m = (message || "").toLowerCase();
  if (m.includes("user already registered")) return "Este email ya está registrado.";
  if (m.includes("invalid email")) return "El email no es válido.";
  if (m.includes("password should be at least")) return "La contraseña es muy corta (mínimo 6 caracteres).";
  if (m.includes("signup is disabled")) return "El registro está deshabilitado.";
  return message || "No se pudo crear la cuenta.";
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("Uruguay");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const normalizedEmail = normalizeEmail(email);
    if (!isSouthGeneticsEmail(normalizedEmail)) {
      setFormError("Solo se permiten cuentas con email @southgenetics.com.");
      return;
    }
    if (password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          country,
        },
      },
    });

    setLoading(false);

    if (error) {
      const msg = friendlyAuthError(error.message);
      setFormError(msg);
      toast.error(msg);
      return;
    }

    toast.success("Cuenta creada. Revisa tu email si es necesario.");
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="card p-5 sm:p-6" style={{ width: "100%", maxWidth: 340 }}>
        <h1 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
          Crear cuenta
        </h1>
        <p className="mb-4 text-[0.75rem] text-[var(--color-text-muted)]">
          Regístrate para comenzar a rendir tus gastos.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-primary)]">
              Nombre completo
            </label>
            <input
              type="text"
              className="input !min-h-[38px] !py-2 !text-[0.85rem]"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
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
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-primary)]">
              Contraseña
            </label>
            <input
              type="password"
              className="input !min-h-[38px] !py-2 !text-[0.85rem]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-primary)]">
              Confirmar contraseña
            </label>
            <input
              type="password"
              className="input !min-h-[38px] !py-2 !text-[0.85rem]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-primary)]">
              País
            </label>
            <select
              className="input !min-h-[38px] !py-2 !text-[0.85rem]"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              <option value="Uruguay">Uruguay</option>
              <option value="Argentina">Argentina</option>
              <option value="Chile">Chile</option>
              <option value="Colombia">Colombia</option>
              <option value="México">México</option>
              <option value="Venezuela">Venezuela</option>
              <option value="Regional">Regional (otro)</option>
            </select>
          </div>
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}
          <button
            type="submit"
            className="btn-primary w-full !min-h-[40px] !py-2 !text-[0.8rem]"
            disabled={loading}
          >
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>
        <p className="mt-3 text-center text-[0.7rem] text-[var(--color-text-muted)]">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-[var(--color-primary)]">
            Iniciar sesión
          </a>
        </p>
      </div>
    </div>
  );
}

