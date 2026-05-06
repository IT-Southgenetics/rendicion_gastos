import type { ReactNode } from "react";

export function Header({ mobileLeftSlot }: { mobileLeftSlot?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#e5e2ea] bg-white/90 px-4 py-3 backdrop-blur-md xl:px-6">
      {/* Logo visible solo en mobile (el sidebar está oculto) */}
      <div className="flex items-center gap-2 xl:hidden">
        {mobileLeftSlot}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold">
          R
        </div>
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          Rendición SG
        </span>
      </div>
      {/* Espacio en desktop (el título lo pone cada página) */}
      <div className="hidden xl:block" />
    </header>
  );
}
