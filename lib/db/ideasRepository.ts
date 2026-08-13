import { getDb } from "./client";
import {
  AnalysisResult,
  ESGDimensionKey,
  IdeaQualityLabel,
  IdeaRecommendation,
  IdeaSummary,
} from "@/lib/esg/types";

function uid() {
  return `idea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface IdeaRow {
  id: string;
  idea_text: string;
  answers: string[];
  status: string;
  potential_esg: string;
  main_dimension: ESGDimensionKey;
  theme: string;
  summary: string;
  environmental_level: string;
  environmental_just: string;
  social_level: string;
  social_just: string;
  governance_level: string;
  governance_just: string;
  benefits: string[];
  areas: string[];
  next_steps: string[];
  mini_project_title: string;
  mini_project_desc: string;
  quality_overall: number;
  quality_label: IdeaQualityLabel;
  quality_clarity: number;
  quality_feasibility: number;
  quality_impact: number;
  quality_specificity: number;
  quality_justification: string;
  recommendation: IdeaRecommendation;
  created_at: string;
}

export interface StoredIdea {
  id: string;
  ideaText: string;
  answers: string[];
  result: AnalysisResult;
  createdAt: string;
}

/** Persiste uma ideia analisada. Chamado a partir de `/api/analyze` após uma análise bem-sucedida. */
export async function saveAnalyzedIdea(params: {
  ideaText: string;
  answers: string[];
  result: AnalysisResult;
}): Promise<StoredIdea> {
  const db = getDb();
  const id = uid();
  const { ideaText, answers, result } = params;

  const { data, error } = await db
    .from("ideas")
    .insert({
      id,
      idea_text: ideaText,
      answers,
      status: result.status,
      potential_esg: result.potential_esg,
      main_dimension: result.main_dimension,
      theme: result.theme,
      summary: result.summary,
      environmental_level: result.dimensions.environmental.level,
      environmental_just: result.dimensions.environmental.justification ?? "",
      social_level: result.dimensions.social.level,
      social_just: result.dimensions.social.justification ?? "",
      governance_level: result.dimensions.governance.level,
      governance_just: result.dimensions.governance.justification ?? "",
      benefits: result.benefits ?? [],
      areas: result.areas ?? [],
      next_steps: result.next_steps ?? [],
      mini_project_title: result.mini_project?.title ?? "",
      mini_project_desc: result.mini_project?.description ?? "",
      quality_overall: result.quality?.overall ?? 0,
      quality_label: result.quality?.label ?? "FRACA",
      quality_clarity: result.quality?.criteria?.clarity ?? 0,
      quality_feasibility: result.quality?.criteria?.feasibility ?? 0,
      quality_impact: result.quality?.criteria?.impact ?? 0,
      quality_specificity: result.quality?.criteria?.specificity ?? 0,
      quality_justification: result.quality?.justification ?? "",
      recommendation: result.recommendation ?? "REFINAR",
    })
    .select("*")
    .single();

  if (error) throw new Error(`[db] falha ao salvar ideia: ${error.message}`);

  return rowToStoredIdea(data as IdeaRow);
}

export async function listIdeas(): Promise<StoredIdea[]> {
  const db = getDb();
  const { data, error } = await db
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`[db] falha ao listar ideias: ${error.message}`);

  return (data as IdeaRow[]).map(rowToStoredIdea);
}

function rowToStoredIdea(row: IdeaRow): StoredIdea {
  return {
    id: row.id,
    ideaText: row.idea_text,
    answers: row.answers ?? [],
    createdAt: row.created_at,
    result: {
      status: "completed",
      potential_esg: row.potential_esg as AnalysisResult["potential_esg"],
      main_dimension: row.main_dimension,
      theme: row.theme,
      summary: row.summary,
      dimensions: {
        environmental: {
          level: row.environmental_level as AnalysisResult["dimensions"]["environmental"]["level"],
          justification: row.environmental_just,
        },
        social: {
          level: row.social_level as AnalysisResult["dimensions"]["social"]["level"],
          justification: row.social_just,
        },
        governance: {
          level: row.governance_level as AnalysisResult["dimensions"]["governance"]["level"],
          justification: row.governance_just,
        },
      },
      benefits: row.benefits ?? [],
      areas: row.areas ?? [],
      next_steps: row.next_steps ?? [],
      mini_project: {
        title: row.mini_project_title,
        description: row.mini_project_desc,
      },
      quality: {
        overall: row.quality_overall ?? 0,
        label: row.quality_label ?? "FRACA",
        criteria: {
          clarity: row.quality_clarity ?? 0,
          feasibility: row.quality_feasibility ?? 0,
          impact: row.quality_impact ?? 0,
          specificity: row.quality_specificity ?? 0,
        },
        justification: row.quality_justification ?? "",
      },
      recommendation: row.recommendation ?? "REFINAR",
    },
  };
}

/* =========================================================
   Agregações para a Visão Gerencial
========================================================= */

export interface ManagementMetrics {
  totalIdeas: number;
  withEsgPotential: number;
  highPotential: number;
  /** Ideias com nota de qualidade FORTE — boas ideias, não só bem classificadas em ESG. */
  strongQuality: number;
  lastUpdated: string | null;
}

export interface DimensionSlice {
  dimension: ESGDimensionKey;
  count: number;
  percent: number;
}

const DIMENSION_ORDER: ESGDimensionKey[] = ["environmental", "social", "governance"];

function ideaContributesTo(idea: StoredIdea, dim: ESGDimensionKey): boolean {
  const level = idea.result.dimensions[dim].level;
  return level === "HIGH" || level === "MEDIUM";
}

export function getManagementMetrics(ideas: StoredIdea[]): ManagementMetrics {
  const withEsgPotential = ideas.filter((i) => DIMENSION_ORDER.some((d) => ideaContributesTo(i, d))).length;
  const highPotential = ideas.filter((i) => i.result.potential_esg === "HIGH").length;
  const strongQuality = ideas.filter((i) => i.result.quality?.label === "FORTE").length;

  return {
    totalIdeas: ideas.length,
    withEsgPotential,
    highPotential,
    strongQuality,
    lastUpdated: ideas[0]?.createdAt ?? null,
  };
}

export function getEsgDistribution(ideas: StoredIdea[]): DimensionSlice[] {
  const counts: Record<ESGDimensionKey, number> = { environmental: 0, social: 0, governance: 0 };

  for (const idea of ideas) {
    for (const dim of DIMENSION_ORDER) {
      if (ideaContributesTo(idea, dim)) counts[dim] += 1;
    }
  }

  const total = DIMENSION_ORDER.reduce((sum, d) => sum + counts[d], 0);

  return DIMENSION_ORDER.map((dimension) => ({
    dimension,
    count: counts[dimension],
    percent: total > 0 ? Math.round((counts[dimension] / total) * 100) : 0,
  }));
}

const POTENTIAL_RANK: Record<AnalysisResult["potential_esg"], number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/**
 * Ideias são ordenadas primeiro pela recomendação (priorizar > refinar >
 * descartar) e, dentro dela, pelo potencial ESG — assim uma ideia bem
 * encaixada em ESG mas de baixa qualidade não aparece à frente de uma
 * ideia realmente boa.
 */
const RECOMMENDATION_RANK: Record<AnalysisResult["recommendation"], number> = {
  PRIORIZAR: 3,
  REFINAR: 2,
  DESCARTAR: 1,
};

export function getTopIdeas(ideas: StoredIdea[], limit = 20): IdeaSummary[] {
  const sorted = [...ideas].sort((a, b) => {
    const recDiff = RECOMMENDATION_RANK[b.result.recommendation] - RECOMMENDATION_RANK[a.result.recommendation];
    if (recDiff !== 0) return recDiff;
    return POTENTIAL_RANK[b.result.potential_esg] - POTENTIAL_RANK[a.result.potential_esg];
  });

  return sorted.slice(0, limit).map((idea) => {
    const highlightDimensions = DIMENSION_ORDER.filter((d) => ideaContributesTo(idea, d));

    return {
      id: idea.id,
      title: idea.result.mini_project?.title || idea.result.theme || idea.ideaText.slice(0, 60),
      highlightDimensions: highlightDimensions.length ? highlightDimensions : [idea.result.main_dimension],
      potential: idea.result.potential_esg,
      summary: idea.result.summary,
      dimensions: idea.result.dimensions,
      mainDimension: idea.result.main_dimension,
      benefits: idea.result.benefits,
      areas: idea.result.areas,
      nextSteps: idea.result.next_steps,
      miniProject: idea.result.mini_project,
      quality: idea.result.quality,
      recommendation: idea.result.recommendation,
      createdAt: idea.createdAt,
      ideaText: idea.ideaText,
      answers: idea.answers,
    };
  });
}

export function buildAiInsight(ideas: StoredIdea[], distribution: DimensionSlice[]): string {
  if (ideas.length === 0) {
    return "Ainda não há ideias suficientes para gerar uma leitura da IA. Assim que novas ideias forem analisadas pelo Copiloto, este painel é atualizado automaticamente.";
  }

  const top = [...distribution].sort((a, b) => b.percent - a.percent)[0];
  const label: Record<ESGDimensionKey, string> = {
    environmental: "ambiental",
    social: "social",
    governance: "de governança",
  };

  if (!top || top.count === 0) {
    return "As ideias recebidas ainda não possuem impacto ESG claramente identificado pela entrevista do Copiloto.";
  }

  return `${top.percent}% das ideias analisadas possuem impacto ${label[top.dimension]}. As oportunidades de maior potencial estão concentradas nessa dimensão, com base nas análises geradas pelo Copiloto.`;
}
