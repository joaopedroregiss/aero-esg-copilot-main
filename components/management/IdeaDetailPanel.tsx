"use client";

import { useState } from "react";
import { FileText, MessageSquare } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { DimensionAvatar, DimensionLabel, LevelPill } from "@/components/ui/ESGAtoms";
import MiniProjectModal from "@/components/ui/MiniProjectModal";
import ConversationModal from "@/components/management/ConversationModal";
import { IdeaSummary, ESG_POTENTIAL_LABEL } from "@/lib/esg/types";
import { formatDateTime } from "@/lib/utils/date";

const ORDER = ["environmental", "social", "governance"] as const;

export default function IdeaDetailPanel({
  idea,
  onClose,
}: {
  idea: IdeaSummary | null;
  onClose: () => void;
}) {
  const [miniProjectOpen, setMiniProjectOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);

  return (
    <>
      <Sheet
        open={!!idea}
        onClose={onClose}
        title="Análise da ideia"
        footer={
          idea && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMiniProjectOpen(true)}
                className="flex items-center justify-center gap-2 bg-aevo px-5 py-3.5 text-sm font-semibold text-canvas transition-colors hover:bg-aevo-dark"
              >
                <FileText size={16} />
                Ver mini-projeto
              </button>
              <button
                onClick={() => setConversationOpen(true)}
                className="flex items-center justify-center gap-2 border border-line px-5 py-3.5 text-sm font-semibold text-charcoal transition-colors hover:bg-canvas"
              >
                <MessageSquare size={16} />
                Ver conversa
              </button>
            </div>
          )
        }
      >
        {idea && (
          <div className="flex flex-col gap-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Ideia
              </p>
              <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug text-charcoal">
                {idea.title}
              </h3>
              <p className="mt-1.5 font-mono text-[11.5px] text-charcoal-faint">
                Enviada em {formatDateTime(idea.createdAt)}
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Potencial ESG
              </p>
              <p className="mt-1.5 font-display text-4xl font-semibold text-aevo-dark">
                {ESG_POTENTIAL_LABEL[idea.potential]}
              </p>
            </div>

            <div className="flex flex-col divide-y divide-line border-y border-line">
              {ORDER.map((key) => {
                const dim = idea.dimensions[key];
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
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-charcoal-soft">{idea.summary}</p>
            </div>

            {idea.benefits.length > 0 && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                  Benefícios
                </p>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {idea.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[14px] text-charcoal">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-aevo" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {idea.nextSteps.length > 0 && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                  Próximos passos
                </p>
                <ol className="mt-2.5 flex flex-col gap-2">
                  {idea.nextSteps.map((step, i) => (
                    <li key={step} className="flex items-start gap-3 text-[14px] text-charcoal">
                      <span className="font-mono text-[12px] text-aevo-dark">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </Sheet>

      <MiniProjectModal
        open={miniProjectOpen}
        onClose={() => setMiniProjectOpen(false)}
        data={
          idea
            ? {
                title: idea.miniProject.title,
                mainDimension: idea.mainDimension,
                description: idea.miniProject.description,
                benefits: idea.benefits,
                areas: idea.areas,
                nextSteps: idea.nextSteps,
              }
            : null
        }
      />

      <ConversationModal
        open={conversationOpen}
        onClose={() => setConversationOpen(false)}
        data={idea ? { ideaText: idea.ideaText, answers: idea.answers } : null}
      />
    </>
  );
}
