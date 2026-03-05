"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Enums } from "@/types/database";
import { TicketUploader } from "./TicketUploader";
import toast from "react-hot-toast";
import { sendToN8n } from "@/lib/n8n/webhook";

type ExpenseCategory = Enums<"expense_category">;

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "transport", label: "Transporte" },
  { value: "food", label: "Comida" },
  { value: "accommodation", label: "Alojamiento" },
  { value: "communication", label: "Comunicación" },
  { value: "office_supplies", label: "Insumos oficina" },
  { value: "entertainment", label: "Entretenimiento" },
  { value: "fuel", label: "Combustible" },
  { value: "other", label: "Otros" },
];

export function ExpenseForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [currency, setCurrency] = useState("UYU");
  const [ticketStoragePath, setTicketStoragePath] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      toast.error("No hay sesión activa");
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    // buscar o crear rendición semanal actual
    const today = new Date(date || new Date().toISOString().slice(0, 10));
    const day = today.getDay();
    const diffToMonday = (day + 6) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diffToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    let { data: report } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStartStr)
      .maybeSingle();

    if (!report) {
      const { data: inserted, error: insertError } = await supabase
        .from("weekly_reports")
        .insert({
          user_id: userId,
          week_start: weekStartStr,
          week_end: weekEndStr,
        })
        .select("*")
        .single();

      if (insertError) {
        toast.error("No se pudo crear la rendición semanal");
        setLoading(false);
        return;
      }
      report = inserted;
    }

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        report_id: report.id,
        user_id: userId,
        description,
        amount: Number(amount),
        currency,
        expense_date: date || new Date().toISOString().slice(0, 10),
        category,
        ticket_url: ticketUrl,
        ticket_storage_path: ticketStoragePath,
      })
      .select("*")
      .single();

    if (expenseError || !expense) {
      toast.error("No se pudo guardar el gasto");
      setLoading(false);
      return;
    }

    // Disparar N8N
    if (ticketUrl) {
      sendToN8n({
        expense_id: expense.id,
        ticket_url: ticketUrl,
        user_id: userId,
      }).catch(() => {
        // silencioso; N8N es auxiliar
      });
    }

    toast.success("Gasto creado");
    router.push("/dashboard/expenses");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">
            Monto
          </label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">
            Moneda
          </label>
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="UYU">UYU</option>
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
            <option value="BRL">BRL</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">
            Fecha del gasto
          </label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">
            Categoría
          </label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">
          Descripción
        </label>
        <textarea
          className="input min-h-[80px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          Ticket / comprobante
        </p>
        <TicketUploader
          onUploaded={({ storagePath, publicUrl }) => {
            setTicketStoragePath(storagePath);
            setTicketUrl(publicUrl);
          }}
        />
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={loading}
      >
        {loading ? "Guardando..." : "Guardar gasto"}
      </button>
    </form>
  );
}

