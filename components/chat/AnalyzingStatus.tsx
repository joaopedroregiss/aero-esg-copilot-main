import { Sparkles } from "lucide-react";

export default function AnalyzingStatus() {
  return (
    <div className="flex animate-message-in items-center gap-3 border border-line bg-canvas-raised px-4 py-3.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aevo-soft text-aevo-dark"
        aria-hidden="true"
      >
        <Sparkles size={15} />
      </span>
      <div>
        <p className="text-[14px] font-medium text-charcoal">Analisando ideia…</p>
        <p className="mt-0.5 font-mono text-[11px] tracking-[0.2em] text-charcoal-faint">
          <span className="text-environmental">E</span>
          <span className="mx-1.5 text-line-strong">·</span>
          <span className="text-social">S</span>
          <span className="mx-1.5 text-line-strong">·</span>
          <span className="text-governance">G</span>
        </p>
      </div>
    </div>
  );
}
