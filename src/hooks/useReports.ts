"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Tables, Enums } from "@/types/database";

export type WeeklyReport = Tables<"weekly_reports">;

interface UseReportsOptions {
  status?: Enums<"report_status"> | "all";
}

export function useReports(options: UseReportsOptions = {}) {
  const [data, setData] = useState<WeeklyReport[]>([]);
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
        .from("weekly_reports")
        .select("*")
        .eq("user_id", session.user.id)
        .order("week_start", { ascending: false });

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

  return { reports: data, loading, error };
}

