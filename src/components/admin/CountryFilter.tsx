"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { COUNTRY_OPTIONS } from "@/lib/countries";

interface Props {
  basePath: string;
  label?: string;
}

export function CountryFilter({ basePath, label = "Filtrar por país" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("country")?.split(",").filter(Boolean) ?? [];

  function toggle(country: string) {
    const next = current.includes(country)
      ? current.filter((c) => c !== country)
      : [...current, country];
    const q = next.length ? `?country=${encodeURIComponent(next.join(","))}` : "";
    router.push(`${basePath}${q}`);
  }

  function clear() {
    router.push(basePath);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}:</span>
      <div className="flex flex-wrap gap-1.5">
        {COUNTRY_OPTIONS.map((country) => (
          <button
            key={country}
            type="button"
            onClick={() => toggle(country)}
            className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${
              current.includes(country)
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-[#e5e2ea] bg-white text-[var(--color-text-primary)] hover:bg-[#f5f1f8]"
            }`}
          >
            {country}
          </button>
        ))}
      </div>
      {current.length > 0 && (
        <button
          type="button"
          onClick={clear}
          className="text-[0.7rem] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
        >
          Ver todos
        </button>
      )}
    </div>
  );
}
