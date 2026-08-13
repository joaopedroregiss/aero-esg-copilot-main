const PROMPTS = ["Reduzir o consumo de água", "Melhorar a segurança", "Reduzir desperdícios"];

export default function SuggestedPrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROMPTS.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className="border border-line px-3.5 py-2 text-[13px] font-medium text-charcoal-soft transition-colors hover:border-aevo/50 hover:text-aevo-dark"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
