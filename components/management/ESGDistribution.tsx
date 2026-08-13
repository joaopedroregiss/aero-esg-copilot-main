import { ESGDimensionKey, ESG_LABEL } from "@/lib/esg/types";
import { DimensionIcon } from "@/components/ui/ESGAtoms";

interface Slice {
  dimension: ESGDimensionKey;
  count: number;
  percent: number;
}

const BAR_COLOR: Record<ESGDimensionKey, string> = {
  environmental: "bg-environmental",
  social: "bg-social",
  governance: "bg-governance",
};

const TEXT_COLOR: Record<ESGDimensionKey, string> = {
  environmental: "text-environmental",
  social: "text-social",
  governance: "text-governance",
};

export default function ESGDistribution({ data }: { data: Slice[] }) {
  return (
    <section aria-labelledby="esg-distribution-heading" className="py-10 sm:py-12">
      <header className="mb-6">
        <h2 id="esg-distribution-heading" className="font-display text-xl font-semibold text-charcoal">
          Onde estão as ideias?
        </h2>
        <p className="mt-1 text-[14px] text-charcoal-soft">
          Distribuição das ideias por dimensão ESG.
        </p>
      </header>

      <div className="flex h-3 w-full overflow-hidden" role="img" aria-label="Distribuição ESG das ideias">
        {data.map((slice) => (
          <div
            key={slice.dimension}
            className={BAR_COLOR[slice.dimension]}
            style={{ width: `${slice.percent}%` }}
            title={`${ESG_LABEL[slice.dimension]}: ${slice.percent}%`}
          />
        ))}
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {data.map((slice) => (
          <div key={slice.dimension} className="flex items-start gap-3">
            <span className={`mt-0.5 ${TEXT_COLOR[slice.dimension]}`} aria-hidden="true">
              <DimensionIcon dimension={slice.dimension} size={18} />
            </span>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-charcoal-faint">
                {ESG_LABEL[slice.dimension] === "Governança" ? "GOVERNANÇA" : ESG_LABEL[slice.dimension].toUpperCase()}
              </dt>
              <dd className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold text-charcoal">
                  {slice.percent}%
                </span>
                <span className="text-[13px] text-charcoal-faint">{slice.count} ideias</span>
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <p className="mt-6 text-[13px] text-charcoal-faint">
        Uma ideia pode contribuir para mais de uma dimensão.
      </p>
    </section>
  );
}
