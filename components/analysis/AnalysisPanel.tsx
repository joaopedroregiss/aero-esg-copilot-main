import Sheet from "@/components/ui/Sheet";
import {
  DimensionAvatar,
  DimensionLabel,
  LevelPill,
} from "@/components/ui/ESGAtoms";
import {
  AnalysisResult,
  ESG_POTENTIAL_LABEL,
} from "@/lib/esg/types";

const ORDER = ["environmental", "social", "governance"] as const;

function getLevelScore(level: string): number {
  switch (level) {
    case "HIGH":
      return 100;
    case "MEDIUM":
      return 65;
    case "LOW":
      return 30;
    default:
      return 0;
  }
}

function calculateIdeaScore(result: AnalysisResult): number {
  /*
   * O score considera mais do que simplesmente "ser ESG".
   *
   * Critérios:
   * - potencial ESG
   * - clareza das dimensões
   * - benefícios identificados
   * - áreas impactadas
   * - próximos passos
   * - existência de mini-projeto
   *
   * Assim, uma ideia não recebe nota alta apenas por possuir
   * algum enquadramento ESG.
   */

  const potentialScore =
    result.potential_esg === "HIGH"
      ? 100
      : result.potential_esg === "MEDIUM"
        ? 65
        : 30;

  const dimensionScores = ORDER.map((key) =>
    getLevelScore(result.dimensions[key]?.level)
  );

  const identifiedDimensions = dimensionScores.filter(
    (score) => score > 0
  );

  const dimensionScore =
    identifiedDimensions.length > 0
      ? identifiedDimensions.reduce((sum, score) => sum + score, 0) /
        identifiedDimensions.length
      : 0;

  const benefitsScore = Math.min(
    100,
    result.benefits.length * 25
  );

  const areasScore = Math.min(
    100,
    result.areas.length * 25
  );

  const nextStepsScore = Math.min(
    100,
    result.next_steps.length * 14
  );

  const miniProjectScore =
    result.mini_project?.title &&
    result.mini_project?.description
      ? 100
      : 0;

  /*
   * ESG não domina o score.
   *
   * A ideia precisa demonstrar qualidade e capacidade
   * de virar um projeto.
   */
  const score = Math.round(
    potentialScore * 0.15 +
      dimensionScore * 0.15 +
      benefitsScore * 0.15 +
      areasScore * 0.10 +
      nextStepsScore * 0.20 +
      miniProjectScore * 0.25
  );

  return Math.max(0, Math.min(100, score));
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excelente";
  if (score >= 65) return "Boa";
  if (score >= 50) return "Promissora";
  if (score >= 35) return "Precisa evoluir";
  return "Baixa maturidade";
}

function getScoreDescription(score: number): string {
  if (score >= 80) {
    return "Ideia bem estruturada e com bom potencial para avançar.";
  }

  if (score >= 65) {
    return "Ideia consistente, mas alguns pontos ainda podem ser fortalecidos.";
  }

  if (score >= 50) {
    return "A ideia tem potencial, porém precisa de mais desenvolvimento.";
  }

  if (score >= 35) {
    return "Existem oportunidades interessantes, mas a ideia ainda precisa amadurecer.";
  }

  return "A ideia ainda precisa ser melhor desenvolvida antes de avançar.";
}

function getScoreBarClass(score: number): string {
  if (score >= 80) {
    return "bg-aevo";
  }

  if (score >= 60) {
    return "bg-aevo/80";
  }

  if (score >= 40) {
    return "bg-charcoal-soft";
  }

  return "bg-charcoal-faint";
}

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
  const ideaScore = result
    ? calculateIdeaScore(result)
    : 0;

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
          {/* =====================================================
              IDEIA
          ===================================================== */}

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
              Ideia
            </p>

            <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug text-charcoal">
              {result.theme}
            </h3>
          </div>

          {/* =====================================================
              SCORE DA IDEIA
          ===================================================== */}

          <div className="rounded-2xl border border-line bg-canvas-raised p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                  Score da ideia
                </p>

                <p className="mt-2 font-display text-5xl font-semibold tracking-tight text-charcoal">
                  {ideaScore}
                  <span className="ml-1 text-2xl text-charcoal-faint">
                    /100
                  </span>
                </p>
              </div>

              <div className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-charcoal">
                {getScoreLabel(ideaScore)}
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full transition-all ${getScoreBarClass(
                  ideaScore
                )}`}
                style={{
                  width: `${ideaScore}%`,
                }}
              />
            </div>

            <p className="mt-3 text-[13.5px] leading-relaxed text-charcoal-soft">
              {getScoreDescription(ideaScore)}
            </p>
          </div>

          {/* =====================================================
              POTENCIAL ESG
          ===================================================== */}

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
              Potencial ESG
            </p>

            <p className="mt-1.5 font-display text-4xl font-semibold text-aevo-dark">
              {ESG_POTENTIAL_LABEL[result.potential_esg]}
            </p>
          </div>

          {/* =====================================================
              DIMENSÕES ESG
          ===================================================== */}

          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
              Dimensões avaliadas
            </p>

            <div className="flex flex-col divide-y divide-line border-y border-line">
              {ORDER.map((key) => {
                const dim = result.dimensions[key];

                return (
                  <div
                    key={key}
                    className="flex items-start gap-3 py-4"
                  >
                    <DimensionAvatar dimension={key} />

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-semibold text-charcoal">
                          <DimensionLabel dimension={key} />
                        </p>

                        <LevelPill
                          level={dim.level}
                          dimension={key}
                        />
                      </div>

                      <p className="mt-1 text-[13.5px] leading-relaxed text-charcoal-soft">
                        {dim.justification}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =====================================================
              RESUMO
          ===================================================== */}

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
              Resumo
            </p>

            <p className="mt-1.5 text-[14.5px] leading-relaxed text-charcoal-soft">
              {result.summary}
            </p>
          </div>

          {/* =====================================================
              BENEFÍCIOS
          ===================================================== */}

          {result.benefits.length > 0 && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Benefícios
              </p>

              <ul className="mt-2.5 flex flex-col gap-2">
                {result.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-2 text-[14px] text-charcoal"
                  >
                    <span
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-aevo"
                      aria-hidden="true"
                    />

                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* =====================================================
              ÁREAS ENVOLVIDAS
          ===================================================== */}

          {result.areas.length > 0 && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Áreas envolvidas
              </p>

              <div className="mt-2.5 flex flex-wrap gap-2">
                {result.areas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full border border-line px-3 py-1.5 text-[13px] text-charcoal-soft"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* =====================================================
              PRÓXIMOS PASSOS
          ===================================================== */}

          {result.next_steps.length > 0 && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Próximos passos
              </p>

              <div className="mt-3 flex flex-col gap-3">
                {result.next_steps.map((step, index) => (
                  <div
                    key={`${index}-${step}`}
                    className="flex items-start gap-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-charcoal text-[11px] font-semibold text-canvas">
                      {index + 1}
                    </span>

                    <p className="pt-0.5 text-[14px] leading-relaxed text-charcoal-soft">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =====================================================
              MINI-PROJETO
          ===================================================== */}

          {result.mini_project && (
            <div className="rounded-2xl border border-line p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Mini-projeto sugerido
              </p>

              <h4 className="mt-2 font-display text-lg font-semibold leading-snug text-charcoal">
                {result.mini_project.title}
              </h4>

              <p className="mt-2 text-[14px] leading-relaxed text-charcoal-soft">
                {result.mini_project.description}
              </p>
            </div>
          )}

          {/* =====================================================
              PRÓXIMO PASSO PRINCIPAL
          ===================================================== */}

          {result.next_steps.length > 0 && (
            <div className="border-t border-line pt-6">
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