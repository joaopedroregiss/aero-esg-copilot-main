"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Sheet({ open, onClose, title, children, footer }: SheetProps) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end md:items-stretch items-end">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/35 animate-fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-panel-in md:animate-panel-in relative flex h-[88dvh] w-full flex-col border-t border-line bg-canvas-raised shadow-[0_-4px_24px_rgba(0,0,0,0.08)] max-md:animate-sheet-up md:h-dvh md:w-[440px] md:border-l md:border-t-0 md:shadow-[-4px_0_24px_rgba(0,0,0,0.06)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
            {title}
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-charcoal-faint transition-colors hover:text-charcoal"
            aria-label="Fechar painel"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-6 py-5">{footer}</div>}
      </div>
    </div>
  );
}
