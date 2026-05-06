import type { ComponentType } from "react";
import { LayoutDashboard, Receipt, FileSpreadsheet, Users, Eye, CreditCard, HandCoins } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly: boolean;
  supervisorOnly: boolean;
  viewerOnly: boolean;
  pagadorOnly?: boolean;
};

export const baseNavItems: NavItem[] = [
  { href: "/dashboard",             label: "Resumen",      icon: LayoutDashboard, adminOnly: false, supervisorOnly: false, viewerOnly: false },
  { href: "/dashboard/reports",     label: "Rendiciones",  icon: FileSpreadsheet, adminOnly: false, supervisorOnly: false, viewerOnly: false },
  { href: "/dashboard/advances",    label: "Anticipos",    icon: HandCoins,       adminOnly: false, supervisorOnly: false, viewerOnly: false },
  { href: "/dashboard/expenses",    label: "Histórico",    icon: Receipt,         adminOnly: false, supervisorOnly: false, viewerOnly: false },
  { href: "/dashboard/aprobador",   label: "Aprobaciones", icon: Eye,             adminOnly: false, supervisorOnly: true,  viewerOnly: false },
  { href: "/dashboard/chusma-view", label: "Auditoría",    icon: Eye,             adminOnly: false, supervisorOnly: false, viewerOnly: true  },
  { href: "/dashboard/viewer",      label: "Pagos",        icon: CreditCard,      adminOnly: false, supervisorOnly: false, viewerOnly: false, pagadorOnly: true },
  { href: "/admin",                 label: "Admin",        icon: Users,           adminOnly: true,  supervisorOnly: false, viewerOnly: false },
];

