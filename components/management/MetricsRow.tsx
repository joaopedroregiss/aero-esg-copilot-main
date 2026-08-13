const METRICS = (data: { totalIdeas: number; withEsgPotential: number; highPotential: number }) => [
  { value: data.totalIdeas, label: "Ideias recebidas" },
  { value: data.withEsgPotential, label: "Com potencial ESG" },
  { value: data.highPotential, label: "Alto potencial", emphasis: true },
];

export default function MetricsRow({
  totalIdeas,
  withEsgPotential,
  highPotential,
}: {
  totalIdeas: number;
  withEsgPotential: number;
  highPotential: number;
}) {
  const metrics = METRICS({ totalIdeas, withEsgPotential, highPotential });
  return (
    <div className="grid grid-cols-3 divide-x divide-line border-y border-line">
      {metrics.map((m) => (
        <div key={m.label} className="px-4 py-6 first:pl-0 sm:px-8 sm:py-8">
          <p
            className={
              "font-display text-4xl font-semibold tabular-nums sm:text-5xl " +
              (m.emphasis ? "text-aevo-dark" : "text-charcoal")
            }
          >
            {m.value}
          </p>
          <p className="mt-1.5 text-[13px] text-charcoal-soft sm:text-sm">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
