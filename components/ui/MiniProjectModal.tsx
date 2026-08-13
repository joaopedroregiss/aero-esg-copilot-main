"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ESGDimensionKey, ESG_LABEL } from "@/lib/esg/types";

export interface MiniProjectModalData {
  title: string;
  mainDimension: ESGDimensionKey;
  description: string;
  benefits: string[];
  areas: string[];
  nextSteps: string[];
}

export default function MiniProjectModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: MiniProjectModalData | null;
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
        aria-label="Mini-projeto"
        className="relative flex max-h-[90dvh] w-full max-w-lg animate-sheet-up flex-col border border-line bg-canvas-raised md:animate-fade-in"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
            Mini-projeto
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-charcoal-faint transition-colors hover:text-charcoal"
            aria-label="Fechar mini-projeto"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Título
              </p>
              <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug text-charcoal">
                {data.title}
              </h3>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Dimensão ESG primária
              </p>
              <p className="mt-1.5 text-[14.5px] font-medium text-charcoal">
                {ESG_LABEL[data.mainDimension]}
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                Descrição
              </p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-charcoal-soft">
                {data.description}
              </p>
            </div>

            {data.benefits.length > 0 && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                  Benefícios
                </p>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {data.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[14px] text-charcoal">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-aevo" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.areas.length > 0 && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                  Áreas envolvidas
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {data.areas.map((a) => (
                    <span
                      key={a}
                      className="border border-line px-2.5 py-1 text-[12.5px] font-medium text-charcoal-soft"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.nextSteps.length > 0 && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-faint">
                  Próximos passos
                </p>
                <ol className="mt-2.5 flex flex-col gap-2">
                  {data.nextSteps.map((step, i) => (
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
        </div>
      </div>
    </div>
  );
}
