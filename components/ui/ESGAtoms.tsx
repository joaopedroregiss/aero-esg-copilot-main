import { Leaf, Users, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { ESGDimensionKey, ESGLevel, ESG_LABEL, ESG_LEVEL_LABEL } from "@/lib/esg/types";

const DIMENSION_ICON: Record<ESGDimensionKey, React.ElementType> = {
  environmental: Leaf,
  social: Users,
  governance: ShieldCheck,
};

const DIMENSION_COLOR: Record<ESGDimensionKey, { text: string; bg: string; ring: string }> = {
  environmental: { text: "text-environmental", bg: "bg-environmental-soft", ring: "ring-environmental/25" },
  social: { text: "text-social", bg: "bg-social-soft", ring: "ring-social/25" },
  governance: { text: "text-governance", bg: "bg-governance-soft", ring: "ring-governance/25" },
};

export function DimensionIcon({
  dimension,
  size = 18,
  className,
}: {
  dimension: ESGDimensionKey;
  size?: number;
  className?: string;
}) {
  const Icon = DIMENSION_ICON[dimension];
  return <Icon size={size} className={className} strokeWidth={1.8} aria-hidden="true" />;
}

export function DimensionAvatar({ dimension, size = "md" }: { dimension: ESGDimensionKey; size?: "sm" | "md" | "lg" }) {
  const colors = DIMENSION_COLOR[dimension];
  const dims = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const iconSize = size === "sm" ? 15 : size === "lg" ? 24 : 18;
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full ring-1",
        colors.bg,
        colors.text,
        colors.ring,
        dims
      )}
      aria-hidden="true"
    >
      <DimensionIcon dimension={dimension} size={iconSize} />
    </span>
  );
}

export function LevelPill({ level, dimension }: { level: ESGLevel; dimension?: ESGDimensionKey }) {
  const emphasis = level === "HIGH" || level === "MEDIUM";
  const colors = dimension ? DIMENSION_COLOR[dimension] : null;
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide",
        !emphasis && "border-line text-charcoal-faint",
        emphasis && colors && `border-transparent ${colors.bg} ${colors.text}`,
        emphasis && !colors && "border-aevo/30 bg-aevo-soft text-aevo-dark"
      )}
    >
      {ESG_LEVEL_LABEL[level]}
    </span>
  );
}

export function DimensionLabel({ dimension }: { dimension: ESGDimensionKey }) {
  return <span>{ESG_LABEL[dimension]}</span>;
}
