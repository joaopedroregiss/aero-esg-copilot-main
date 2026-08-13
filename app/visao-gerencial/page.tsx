"use client";

import { useEffect, useMemo, useState } from "react";
import MetricsRow from "@/components/management/MetricsRow";
import ESGDistribution from "@/components/management/ESGDistribution";
import Filters, { IdeaFilter } from "@/components/management/Filters";
import TopIdeasList from "@/components/management/TopIdeasList";
import AIInsight from "@/components/management/AIInsight";
import IdeaDetailPanel from "@/components/management/IdeaDetailPanel";
import EmptyState from "@/components/management/EmptyState";
import DbSetupNotice from "@/components/management/DbSetupNotice";
import ErrorNotice from "@/components/chat/ErrorNotice";
import { ESGDimensionKey, IdeaSummary } from "@/lib/esg/types";
import { formatDateTime } from "@/lib/utils/date";

interface ManagementData {
  metrics: {
    totalIdeas: number;
    withEsgPotential: number;
    highPotential: number;
    lastUpdated: string | null;
  };
  distribution: { dimension: ESGDimensionKey; count: number; percent: number }[];
  topIdeas: IdeaSummary[];
  aiInsight: string;
  hasData: boolean;
  dbConfigured: boolean;
}

export default function VisaoGerencialPage() {
  const [filter, setFilter] = useState<IdeaFilter>("all");
  const [selected, setSelected] = useState<IdeaSummary | null>(null);
  const [data, setData] = useState<ManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/management", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json: ManagementData = await res.json();
      setData(json);
    } catch {
      setError("Não foi possível carregar a Visão Gerencial agora.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredIdeas = useMemo(() => {
    const ideas = data?.topIdeas ?? [];
    if (filter === "all") return ideas;
    if (filter === "high") return ideas.filter((i) => i.potential === "HIGH");
    return ideas.filter((i) => i.highlightDimensions.includes(filter));
  }, [data, filter]);

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24 text-center">
        <p className="text-[14.5px] text-charcoal-soft">Carregando Visão Gerencial…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto w-full max-w-md px-6 py-24">
        <ErrorNotice message={error} onRetry={load} />
      </div>
    );
  }

  if (!data || !data.dbConfigured) {
    return <DbSetupNotice />;
  }

  if (!data.hasData) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[1000px]">
        <header>
          <h1 className="font-display text-2xl font-semibold text-charcoal sm:text-[28px]">
            Visão Gerencial
          </h1>
          <p className="mt-1.5 text-[14.5px] text-charcoal-soft">
            Panorama das ideias e dos impactos ESG identificados pelo Copiloto.
          </p>
          <p className="mt-3 font-mono text-[11.5px] uppercase tracking-[0.1em] text-charcoal-faint">
            Última atualização · {formatDateTime(data.metrics.lastUpdated)}
          </p>
        </header>

        <div className="mt-8">
          <MetricsRow
            totalIdeas={data.metrics.totalIdeas}
            withEsgPotential={data.metrics.withEsgPotential}
            highPotential={data.metrics.highPotential}
          />
        </div>

        <ESGDistribution data={data.distribution} />

        <section aria-labelledby="top-ideas-heading" className="py-2 sm:py-4">
          <header className="mb-5">
            <h2 id="top-ideas-heading" className="font-display text-xl font-semibold text-charcoal">
              Ideias que se destacam
            </h2>
            <p className="mt-1 text-[14px] text-charcoal-soft">
              Maiores potenciais identificados pelo Copiloto.
            </p>
          </header>

          <div className="mb-5">
            <Filters value={filter} onChange={setFilter} />
          </div>

          <TopIdeasList ideas={filteredIdeas} onSelect={setSelected} />
        </section>

        <AIInsight text={data.aiInsight} />
      </div>

      <IdeaDetailPanel idea={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
