'use client';
import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Receipt, FileSpreadsheet, Users, Eye, LogOut, CreditCard, HandCoins } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly: boolean;
  supervisorOnly: boolean;
  viewerOnly: boolean;
  pagadorOnly?: boolean;
  employeeOnly?: boolean;
};

const baseNavItems: NavItem[] = [
  { href: "/dashboard",            label: "Resumen",     icon: LayoutDashboard, adminOnly: false, supervisorOnly: false, viewerOnly: false },
  { href: "/dashboard/reports",    label: "Rendiciones", icon: FileSpreadsheet, adminOnly: false, supervisorOnly: false, viewerOnly: false },
  { href: "/dashboard/advances",   label: "Anticipos",   icon: HandCoins,       adminOnly: false, supervisorOnly: false, viewerOnly: false, employeeOnly: true },
  { href: "/dashboard/expenses",   label: "Histórico",   icon: Receipt,         adminOnly: false, supervisorOnly: false, viewerOnly: false },
  { href: "/dashboard/aprobador",  label: "Aprobaciones",icon: Eye,             adminOnly: false, supervisorOnly: true,  viewerOnly: false },
  { href: "/dashboard/chusma-view",label: "Auditoría",   icon: Eye,             adminOnly: false, supervisorOnly: false, viewerOnly: true  },
  { href: "/dashboard/viewer",     label: "Pagos",       icon: CreditCard,      adminOnly: false, supervisorOnly: false, viewerOnly: false, pagadorOnly: true },
  { href: "/admin",               label: "Admin",       icon: Users,           adminOnly: true,  supervisorOnly: false, viewerOnly: false },
];

export function MobileNav({
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
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createSupabaseBrowserClient();

  const navItems = baseNavItems.filter((item) => {
    if (item.adminOnly)       return isAdmin;
    if (item.supervisorOnly)  return isSupervisor;
    if (item.viewerOnly)      return isViewer;
    if (item.pagadorOnly)     return isPagador;
    if (item.employeeOnly)    return !isSupervisor && !isViewer && !isPagador;
    return true;
  });

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      <button
        onClick={handleSignOut}
        className="fixed right-3 top-3 z-40 inline-flex items-center gap-1 rounded-full border border-[#e5e2ea] bg-white/95 px-2.5 py-1.5 text-[0.65rem] font-medium text-[var(--color-text-muted)] shadow-sm lg:hidden"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span>Salir</span>
      </button>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t border-[#e5e2ea] bg-white/95 px-2 py-2.5 lg:hidden sm:grid-cols-6"
      >
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
              className={`flex min-w-0 flex-col items-center text-[10px] sm:text-xs ${
                active ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              <span
                className={`mb-1 flex h-8 w-8 items-center justify-center rounded-full ${
                  active ? "bg-[var(--color-bg)]" : ""
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
