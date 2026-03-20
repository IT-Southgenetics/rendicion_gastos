"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Refresca la UI en pantallas de dashboard cuando cambian datos de `weekly_reports`.
 * Esto evita que el usuario tenga que recargar manualmente (F5) para ver estados nuevos.
 */
export function WeeklyReportsRealtimeRefresher() {
  const router = useRouter();
  const pathname = usePathname();

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("weekly-reports-realtime-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "weekly_reports" },
        () => {
          const now = Date.now();
          const THROTTLE_MS = 2000;
          if (now - lastRefreshAtRef.current < THROTTLE_MS) return;
          lastRefreshAtRef.current = now;

          const p = pathnameRef.current ?? "";
          const shouldRefresh =
            p.startsWith("/dashboard/reports") ||
            p.startsWith("/dashboard/aprobador") ||
            p.startsWith("/dashboard/viewer") ||
            p.startsWith("/dashboard/chusma-view");

          if (shouldRefresh) {
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // router es estable; pathname se mantiene en ref para no re-suscribir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return null;
}

