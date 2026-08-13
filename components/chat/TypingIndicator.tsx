export default function TypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2" role="status" aria-label={label ?? "IA digitando"}>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-charcoal-faint animate-typing-dot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      {label && <span className="text-xs text-charcoal-faint">{label}</span>}
    </div>
  );
}
