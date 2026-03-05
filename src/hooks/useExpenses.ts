"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Tables, Enums } from "@/types/database";

export type Expense = Tables<"expenses">;

interface UseExpensesOptions {
  status?: Enums<"expense_status"> | "all";
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const [data, setData] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        if (!mounted) return;
        setError("No hay sesión activa");
        setLoading(false);
        return;
      }

      let query = supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("expense_date", { ascending: false });

      if (options.status && options.status !== "all") {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;

      if (!mounted) return;

      if (error) {
        setError(error.message);
      } else {
        setData(data ?? []);
      }
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [options.status]);

  return { expenses: data, loading, error };
}

