import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileDrawerNav } from "@/components/layout/MobileDrawerNav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { WeeklyReportsRealtimeRefresher } from "@/components/realtime/WeeklyReportsRealtimeRefresher";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin      = false;
  let isSupervisor = false;
  let isViewer     = false;
  let isPagador    = false;
  if (user) {
    const me = await getMyProfile(supabase, { user } as any);
    const role = me?.role ?? null;

    isAdmin      = role === "admin";
    isSupervisor = role === "aprobador" || role === "admin";
    // Compatibilidad: algunos entornos usaron "chusma" (singular)
    isViewer     = role === "chusmas" || role === "chusma";
    isPagador    = role === "pagador";
  }

  return (
    <div className="app-shell">
      <Sidebar isAdmin={isAdmin} isSupervisor={isSupervisor} isViewer={isViewer} isPagador={isPagador} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden bg-[var(--color-bg)]">
        <Header mobileLeftSlot={<MobileDrawerNav isAdmin={isAdmin} isSupervisor={isSupervisor} isViewer={isViewer} isPagador={isPagador} />} />
        <main className="min-w-0 flex-1 w-full max-w-full overflow-x-hidden px-4 py-4 xl:px-6 xl:py-6">
          <WeeklyReportsRealtimeRefresher />
          {children}
        </main>
      </div>
    </div>
  );
}
