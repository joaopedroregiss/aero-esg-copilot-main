import { Sparkles } from "lucide-react";

export default function AIInsight({ text }: { text: string }) {
  return (
    <section
      aria-labelledby="ai-insight-heading"
      className="my-10 border-l-2 border-aevo bg-aevo-soft/60 px-5 py-6 sm:my-12 sm:px-7"
    >
      <header className="mb-2 flex items-center gap-2">
        <Sparkles size={15} className="text-aevo-dark" aria-hidden="true" />
        <h2 id="ai-insight-heading" className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-aevo-dark">
          Leitura da IA
        </h2>
      </header>
      <p className="max-w-3xl text-[15px] leading-relaxed text-charcoal">{text}</p>
    </section>
  );
}
