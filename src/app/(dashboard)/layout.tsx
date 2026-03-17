import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  let isAdmin      = false;
  let isSupervisor = false;
  let isViewer     = false;
  let isPagador    = false;
  if (session) {
    const me = await getMyProfile(supabase, session);
    const role = me?.role ?? null;

    isAdmin      = role === "admin";
    isSupervisor = role === "aprobador";
    // Compatibilidad: algunos entornos usaron "chusma" (singular)
    isViewer     = role === "chusmas" || role === "chusma";
    isPagador    = role === "pagador";
  }

  return (
    <div className="app-shell">
      <Sidebar isAdmin={isAdmin} isSupervisor={isSupervisor} isViewer={isViewer} isPagador={isPagador} />
      <div className="flex min-h-screen flex-1 flex-col bg-[var(--color-bg)] pb-14 md:pb-0">
        <Header />
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          {children}
        </main>
        <MobileNav isAdmin={isAdmin} isSupervisor={isSupervisor} isViewer={isViewer} isPagador={isPagador} />
      </div>
    </div>
  );
}
