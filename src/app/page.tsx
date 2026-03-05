export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="card w-full max-w-xl p-8 text-center">
        <h1 className="mb-2 text-2xl font-semibold text-[var(--color-text-primary)]">
          Rendición SG
        </h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Gestión moderna de rendición de gastos para empleados y vendedores.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
          <a href="/login" className="btn-primary w-full sm:w-auto">
            Iniciar sesión
          </a>
          <a
            href="/register"
            className="w-full rounded-full border border-[#e5e2ea] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[#f5f1f8] sm:w-auto"
          >
            Crear cuenta
          </a>
        </div>
      </div>
    </div>
  );
}
