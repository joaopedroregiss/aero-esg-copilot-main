"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ConversationModalData {
  ideaText: string;
  answers: string[];
}

export default function ConversationModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: ConversationModalData | null;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/40 animate-fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Conversa"
        className="relative flex max-h-[90dvh] w-full max-w-lg animate-sheet-up flex-col border border-line bg-canvas-raised md:animate-fade-in"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
            Como o Copiloto chegou aqui
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-charcoal-faint transition-colors hover:text-charcoal"
            aria-label="Fechar conversa"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-6">
            <p className="text-[13px] text-charcoal-faint">
              Conversa original entre o colaborador e o Copiloto, na íntegra — útil para auditar o
              raciocínio por trás da análise.
            </p>

            <div className="flex flex-col gap-3">
              <div className="border-l-2 border-aevo bg-aevo-soft/50 px-4 py-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-aevo-dark">
                  Ideia original do colaborador
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-charcoal">
                  “{data.ideaText}”
                </p>
              </div>

              {data.answers.map((answer, i) => (
                <div key={i} className="border-l-2 border-line-strong bg-canvas px-4 py-3">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-charcoal-faint">
                    Resposta {i + 1} do colaborador
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-charcoal">
                    {answer}
                  </p>
                </div>
              ))}

              {data.answers.length === 0 && (
                <p className="text-[13px] text-charcoal-faint">
                  O Copiloto concluiu a análise sem precisar de perguntas adicionais.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
