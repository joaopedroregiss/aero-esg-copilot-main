export default function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-display text-xl font-semibold text-charcoal">
        Ainda não existem ideias analisadas.
      </p>
      <p className="mt-2 max-w-sm text-[14.5px] text-charcoal-soft">
        Quando os colaboradores começarem a conversar com o Copiloto, os principais insights
        aparecerão aqui.
      </p>
    </div>
  );
}
