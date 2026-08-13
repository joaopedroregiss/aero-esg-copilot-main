import Sheet from "@/components/ui/Sheet";
import { DimensionAvatar, DimensionLabel, LevelPill } from "@/components/ui/ESGAtoms";
import { AnalysisResult, ESG_POTENTIAL_LABEL } from "@/lib/esg/types";

const ORDER = ["environmental", "social", "governance"] as const;

export default function AnalysisPanel({
  open,
  onClose,
  result,
  onOpenMiniProject,
}: {
  open: boolean;
  onClose: () => void;
  result: AnalysisResult | null;
  onOpenMiniProject: () => void;
}) {
  return (
    <Sheet
      open={open && !!result}
      onClose={onClose}
      title="Análise da ideia"
      footer={
        result && (
          <button
            onClick={onOpenMiniProject}
            className="flex w-full items-center justify-center gap-2 bg-aevo px-5 py-3.5 text-sm font-semibold text-canvas transition-colors hover:bg-aevo-dark"
          >
            Ver mini-projeto
          </button>
        )
      }
    >
      {result && (
        <div className="flex flex-col gap-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
              Ideia
            </p>
            <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug text-charcoal">
              {result.theme}
            </h3>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
              Potencial ESG
            </p>
            <p className="mt-1.5 font-display text-4xl font-semibold text-aevo-dark">
              {ESG_POTENTIAL_LABEL[result.potential_esg]}
            </p>
          </div>

          <div className="flex flex-col divide-y divide-line border-y border-line">
            {ORDER.map((key) => {
              const dim = result.dimensions[key];
              return (
                <div key={key} className="flex items-start gap-3 py-4">
                  <DimensionAvatar dimension={key} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-charcoal">
                        <DimensionLabel dimension={key} />
                      </p>
                      <LevelPill level={dim.level} dimension={key} />
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-charcoal-soft">
                      {dim.justification}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
              Resumo
            </p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-charcoal-soft">{result.summary}</p>
          </div>

          {result.benefits.length > 0 && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Benefícios
              </p>
              <ul className="mt-2.5 flex flex-col gap-2">
                {result.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[14px] text-charcoal">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-aevo" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.next_steps.length > 0 && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Próximo passo sugerido
              </p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-charcoal-soft">
                {result.next_steps[0]}
              </p>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
