"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";

export type IdeaFilter = "all" | "environmental" | "social" | "governance" | "high";

const OPTIONS: { key: IdeaFilter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "environmental", label: "E" },
  { key: "social", label: "S" },
  { key: "governance", label: "G" },
  { key: "high", label: "Alto potencial" },
];

export default function Filters({
  value,
  onChange,
}: {
  value: IdeaFilter;
  onChange: (v: IdeaFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar ideias">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          aria-pressed={value === opt.key}
          className={clsx(
            "border px-3 py-1.5 text-[13px] font-medium transition-colors",
            value === opt.key
              ? "border-aevo bg-aevo-soft text-aevo-dark"
              : "border-line text-charcoal-soft hover:border-line-strong"
          )}
        >
          {opt.label}
        </button>
      ))}
      <button className="ml-auto flex items-center gap-1.5 border border-line px-3 py-1.5 text-[13px] font-medium text-charcoal-soft hover:border-line-strong">
        Últimos 30 dias
        <ChevronDown size={14} />
      </button>
    </div>
  );
}
