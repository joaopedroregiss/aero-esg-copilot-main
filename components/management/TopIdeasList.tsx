import { ChevronRight, Clock } from "lucide-react";
import { IdeaSummary, ESG_LETTER, ESG_POTENTIAL_LABEL } from "@/lib/esg/types";
import { DimensionAvatar } from "@/components/ui/ESGAtoms";
import { formatRelativeTime } from "@/lib/utils/date";

export default function TopIdeasList({
  ideas,
  onSelect,
}: {
  ideas: IdeaSummary[];
  onSelect: (idea: IdeaSummary) => void;
}) {
  if (ideas.length === 0) {
    return (
      <div className="border-y border-line py-10 text-center">
        <p className="text-[14.5px] font-medium text-charcoal">Nenhuma ideia encontrada para este filtro.</p>
        <p className="mt-1 text-[13.5px] text-charcoal-faint">Ajuste os filtros para ver outras ideias.</p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-line border-y border-line">
      {ideas.map((idea, i) => (
        <li key={idea.id}>
          <button
            onClick={() => onSelect(idea)}
            className="group flex w-full items-center gap-4 py-5 text-left transition-colors hover:bg-canvas-raised sm:gap-6"
          >
            <span className="w-6 shrink-0 font-mono text-[13px] text-charcoal-faint">
              {String(i + 1).padStart(2, "0")}
            </span>

            <span className="flex shrink-0 -space-x-1.5">
              {idea.highlightDimensions.map((d) => (
                <DimensionAvatar key={d} dimension={d} size="sm" />
              ))}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-[15px] font-semibold text-charcoal">{idea.title}</span>
                <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-aevo-dark">
                  {idea.highlightDimensions.map((d) => ESG_LETTER[d]).join(" · ")} ·{" "}
                  {ESG_POTENTIAL_LABEL[idea.potential]}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[13.5px] text-charcoal-faint">
                {idea.summary}
              </span>
            </span>

            <span className="hidden shrink-0 items-center gap-1 font-mono text-[11px] text-charcoal-faint sm:flex">
              <Clock size={12} aria-hidden="true" />
              {formatRelativeTime(idea.createdAt)}
            </span>

            <ChevronRight
              size={16}
              className="shrink-0 text-charcoal-faint transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </li>
      ))}
    </ol>
  );
}
