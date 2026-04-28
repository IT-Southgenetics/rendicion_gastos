'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { createPortal } from "react-dom";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { baseNavItems } from "@/components/layout/navItems";

export function MobileDrawerNav({
  isAdmin = false,
  isSupervisor = false,
  isViewer = false,
  isPagador = false,
}: {
  isAdmin?: boolean;
  isSupervisor?: boolean;
  isViewer?: boolean;
  isPagador?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const navItems = baseNavItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.supervisorOnly) return isSupervisor || isAdmin;
    if (item.viewerOnly) return isViewer;
    if (item.pagadorOnly) return isPagador;
    return true;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
  }

  return (
    <>
      <button
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[#f5f1f8] hover:text-[var(--color-text-primary)] xl:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && open && createPortal(
        <>
          <button
            aria-label="Close navigation backdrop"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] bg-black/40 xl:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-[100] flex w-[18rem] max-w-[85vw] flex-col bg-[var(--color-primary)] px-4 py-4 text-[var(--color-text-on-primary)] shadow-2xl xl:hidden">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold tracking-tight">Rendición SG</p>
                <p className="text-xs text-white/70">Control de gastos</p>
              </div>
              <button
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isRootDashboard = item.href === "/dashboard";
                const active = isRootDashboard
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-white text-[var(--color-primary)]"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-white/20 pt-3">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </>
  );
}

