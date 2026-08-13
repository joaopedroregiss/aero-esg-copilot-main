import { ArrowUpRight, AlertTriangle } from "lucide-react";
import { AnalysisResult, ESG_POTENTIAL_LABEL } from "@/lib/esg/types";
import { DimensionAvatar } from "@/components/ui/ESGAtoms";

const ORDER = ["environmental", "social", "governance"] as const;

export default function AnalysisAttachmentCard({
  result,
  onOpen,
}: {
  result: AnalysisResult;
  onOpen: () => void;
}) {
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <button
        onClick={onOpen}
        className="group flex w-full animate-message-in flex-col gap-3 border border-line bg-canvas-raised px-4 py-4 text-left transition-colors hover:border-aevo/40"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
            Análise concluída
          </span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-aevo-dark">
            Potencial {ESG_POTENTIAL_LABEL[result.potential_esg]}
          </span>
        </div>
        <p className="font-display text-[15px] font-medium leading-snug text-charcoal">{result.theme}</p>
        <div className="flex items-center gap-2">
          {ORDER.map((key) => (
            <DimensionAvatar key={key} dimension={key} size="sm" />
          ))}
          <span className="ml-1 inline-flex items-center gap-1 text-[13px] font-medium text-aevo-dark transition-transform group-hover:translate-x-0.5">
            Ver análise
            <ArrowUpRight size={14} />
          </span>
        </div>
      </button>

      {result.persisted === false && (
        <div className="flex items-start gap-2 border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[12.5px] leading-snug text-danger">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Esta ideia <strong>não foi salva</strong> no histórico e não vai aparecer na Visão
            Gerencial.{" "}
            {result.persistError ?? "Não foi possível gravar no banco de dados agora."}
          </span>
        </div>
      )}
    </div>
  );
}
