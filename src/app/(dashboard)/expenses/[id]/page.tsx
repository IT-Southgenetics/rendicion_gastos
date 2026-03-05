import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import type { Tables } from "@/types/database";

type Expense = Tables<"expenses">;

const CATEGORY_LABELS: Record<string, string> = {
  transport:       "Transporte",
  food:            "Comida y bebida",
  accommodation:   "Alojamiento",
  fuel:            "Combustible",
  communication:   "Comunicación",
  office_supplies: "Insumos de oficina",
  entertainment:   "Entretenimiento",
  other:           "Otros",
};

interface ExpenseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data: expense } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!expense) notFound();

  const e = expense as Expense;
  const canEdit = e.status === "pending";

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Detalle de gasto</h1>
          <p className="page-subtitle">{e.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExpenseStatusBadge status={e.status ?? "pending"} />
          {canEdit && (
            <Link
              href={`/dashboard/expenses/${e.id}/edit`}
              className="btn-primary text-sm"
            >
              Editar
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr,1fr]">
        {/* Datos del gasto */}
        <div className="card p-5 space-y-3 text-sm">
          <Row label="Descripción" value={e.description} />
          <Row
            label="Monto"
            value={`${Number(e.amount).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${e.currency ?? "UYU"}`}
          />
          <Row
            label="Fecha"
            value={new Date(e.expense_date + "T12:00:00").toLocaleDateString("es-UY")}
          />
          <Row label="Categoría" value={CATEGORY_LABELS[e.category] ?? e.category} />
          {e.rejection_reason && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
              <p className="text-xs font-semibold text-red-600 mb-1">Motivo de rechazo</p>
              <p className="text-sm text-red-700">{e.rejection_reason}</p>
            </div>
          )}
          {e.admin_notes && e.status === "reviewing" && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
              <p className="text-xs font-semibold text-blue-600 mb-1">Comentario del administrador</p>
              <p className="text-sm text-blue-700">{e.admin_notes}</p>
            </div>
          )}
        </div>

        {/* Comprobante(s) */}
        <div className="card p-5 space-y-3 text-sm">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Comprobantes
            {(e.ticket_urls?.length ?? (e.ticket_url ? 1 : 0)) > 1 && (
              <span className="ml-1.5 rounded-full bg-[#f0ecf4] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--color-text-muted)]">
                {e.ticket_urls!.length}
              </span>
            )}
          </h2>
          {(() => {
            const urls = e.ticket_urls ?? (e.ticket_url ? [e.ticket_url] : []);
            if (urls.length === 0) {
              return <p className="text-xs text-[var(--color-text-muted)]">No hay comprobante adjunto.</p>;
            }
            if (urls.length === 1) {
              return (
                <a href={urls[0]} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urls[0]} alt="Comprobante" className="w-full rounded-xl border border-[#e5e2ea] object-cover max-h-64" />
                  <span className="mt-1.5 block text-xs text-[var(--color-primary)] underline underline-offset-2">Ver imagen completa ↗</span>
                </a>
              );
            }
            return (
              <div className="grid grid-cols-2 gap-2">
                {urls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl border border-[#e5e2ea] bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Comprobante ${i + 1}`} className="aspect-square w-full object-cover transition-opacity group-hover:opacity-90" />
                    <span className="absolute bottom-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[0.6rem] text-white">
                      {i + 1} ↗
                    </span>
                  </a>
                ))}
              </div>
            );
          })()}
          {e.ocr_extracted_text && (
            <div>
              <p className="mt-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                Texto extraído (OCR)
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--color-text-muted)]">
                {e.ocr_extracted_text}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard/expenses"
          className="text-sm font-medium text-[var(--color-primary)]"
        >
          ← Volver a mis gastos
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[var(--color-text-muted)] shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
