import { getDb } from "./client";
import {
  AnalysisResult,
  ESGDimensionKey,
  IdeaSummary,
} from "@/lib/esg/types";

function uid() {
  return `idea-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
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

  idea_score: AnalysisResult["idea_score"];
  priority_score: AnalysisResult["priority_score"];

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

  created_at: string;
}

export interface StoredIdea {
  id: string;
  ideaText: string;
  answers: string[];
  result: AnalysisResult;
  createdAt: string;
}

/* =========================================================
   SALVAR
========================================================= */

export async function saveAnalyzedIdea(params: {
  ideaText: string;
  answers: string[];
  result: AnalysisResult;
}): Promise<StoredIdea> {
  const db = getDb();

  const id = uid();

  const {
    ideaText,
    answers,
    result,
  } = params;

  const { data, error } = await db
    .from("ideas")
    .insert({
      id,
      idea_text: ideaText,
      answers,

      status: result.status,

      potential_esg:
        result.potential_esg,

      main_dimension:
        result.main_dimension,

      theme: result.theme,

      summary: result.summary,

      idea_score:
        result.idea_score,

      priority_score:
        result.priority_score,

      environmental_level:
        result.dimensions.environmental
          .level,

      environmental_just:
        result.dimensions.environmental
          .justification ?? "",

      social_level:
        result.dimensions.social.level,

      social_just:
        result.dimensions.social
          .justification ?? "",

      governance_level:
        result.dimensions.governance
          .level,

      governance_just:
        result.dimensions.governance
          .justification ?? "",

      benefits:
        result.benefits ?? [],

      areas:
        result.areas ?? [],

      next_steps:
        result.next_steps ?? [],

      mini_project_title:
        result.mini_project?.title ?? "",

      mini_project_desc:
        result.mini_project?.description ??
        "",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `[db] falha ao salvar ideia: ${error.message}`
    );
  }

  return rowToStoredIdea(
    data as IdeaRow
  );
}

/* =========================================================
   LISTAR
========================================================= */

export async function listIdeas(): Promise<
  StoredIdea[]
> {
  const db = getDb();

  const { data, error } = await db
    .from("ideas")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `[db] falha ao listar ideias: ${error.message}`
    );
  }

  return (data as IdeaRow[]).map(
    rowToStoredIdea
  );
}

/* =========================================================
   CONVERTER BANCO
========================================================= */

function rowToStoredIdea(
  row: IdeaRow
): StoredIdea {
  return {
    id: row.id,

    ideaText:
      row.idea_text,

    answers:
      row.answers ?? [],

    createdAt:
      row.created_at,

    result: {
      status: "completed",

      potential_esg:
        row.potential_esg as AnalysisResult["potential_esg"],

      main_dimension:
        row.main_dimension,

      idea_score:
        row.idea_score,

      priority_score:
        row.priority_score,

      theme:
        row.theme,

      summary:
        row.summary,

      dimensions: {
        environmental: {
          level:
            row.environmental_level as AnalysisResult["dimensions"]["environmental"]["level"],

          justification:
            row.environmental_just,
        },

        social: {
          level:
            row.social_level as AnalysisResult["dimensions"]["social"]["level"],

          justification:
            row.social_just,
        },

        governance: {
          level:
            row.governance_level as AnalysisResult["dimensions"]["governance"]["level"],

          justification:
            row.governance_just,
        },
      },

      benefits:
        row.benefits ?? [],

      areas:
        row.areas ?? [],

      next_steps:
        row.next_steps ?? [],

      mini_project: {
        title:
          row.mini_project_title,

        description:
          row.mini_project_desc,
      },
    },
  };
}

/* =========================================================
   MÉTRICAS
========================================================= */

export interface ManagementMetrics {
  totalIdeas: number;
  withEsgPotential: number;
  highPotential: number;
  lastUpdated: string | null;
}

export interface DimensionSlice {
  dimension: ESGDimensionKey;
  count: number;
  percent: number;
}

const DIMENSION_ORDER: ESGDimensionKey[] =
  [
    "environmental",
    "social",
    "governance",
  ];

function ideaContributesTo(
  idea: StoredIdea,
  dimension: ESGDimensionKey
): boolean {
  const level =
    idea.result.dimensions[
      dimension
    ].level;

  return (
    level === "HIGH" ||
    level === "MEDIUM"
  );
}

export function getManagementMetrics(
  ideas: StoredIdea[]
): ManagementMetrics {
  const withEsgPotential =
    ideas.filter((idea) =>
      DIMENSION_ORDER.some(
        (dimension) =>
          ideaContributesTo(
            idea,
            dimension
          )
      )
    ).length;

  const highPotential =
    ideas.filter(
      (idea) =>
        idea.result.potential_esg ===
        "HIGH"
    ).length;

  return {
    totalIdeas:
      ideas.length,

    withEsgPotential,

    highPotential,

    lastUpdated:
      ideas[0]?.createdAt ??
      null,
  };
}

/* =========================================================
   DISTRIBUIÇÃO ESG
========================================================= */

export function getEsgDistribution(
  ideas: StoredIdea[]
): DimensionSlice[] {
  const counts: Record<
    ESGDimensionKey,
    number
  > = {
    environmental: 0,
    social: 0,
    governance: 0,
  };

  for (const idea of ideas) {
    for (const dimension of DIMENSION_ORDER) {
      if (
        ideaContributesTo(
          idea,
          dimension
        )
      ) {
        counts[dimension] += 1;
      }
    }
  }

  const total =
    DIMENSION_ORDER.reduce(
      (sum, dimension) =>
        sum +
        counts[dimension],
      0
    );

  return DIMENSION_ORDER.map(
    (dimension) => ({
      dimension,

      count:
        counts[dimension],

      percent:
        total > 0
          ? Math.round(
              (counts[dimension] /
                total) *
                100
            )
          : 0,
    })
  );
}

/* =========================================================
   RANKING
========================================================= */

const POTENTIAL_RANK: Record<
  AnalysisResult["potential_esg"],
  number
> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function getTopIdeas(
  ideas: StoredIdea[],
  limit = 20
): IdeaSummary[] {
  const sorted = [...ideas].sort(
    (a, b) => {
      const priorityDifference =
        b.result.priority_score.total -
        a.result.priority_score.total;

      if (
        priorityDifference !== 0
      ) {
        return priorityDifference;
      }

      return (
        POTENTIAL_RANK[
          b.result.potential_esg
        ] -
        POTENTIAL_RANK[
          a.result.potential_esg
        ]
      );
    }
  );

  return sorted
    .slice(0, limit)
    .map((idea) => {
      const highlightDimensions =
        DIMENSION_ORDER.filter(
          (dimension) =>
            ideaContributesTo(
              idea,
              dimension
            )
        );

      return {
        id: idea.id,

        title:
          idea.result.mini_project
            ?.title ||
          idea.result.theme ||
          idea.ideaText.slice(
            0,
            60
          ),

        highlightDimensions:
          highlightDimensions.length
            ? highlightDimensions
            : [
                idea.result
                  .main_dimension,
              ],

        potential:
          idea.result.potential_esg,

        summary:
          idea.result.summary,

        dimensions:
          idea.result.dimensions,

        mainDimension:
          idea.result.main_dimension,

        ideaScore:
          idea.result.idea_score,

        priorityScore:
          idea.result.priority_score,

        benefits:
          idea.result.benefits,

        areas:
          idea.result.areas,

        nextSteps:
          idea.result.next_steps,

        miniProject:
          idea.result.mini_project,

        createdAt:
          idea.createdAt,

        ideaText:
          idea.ideaText,

        answers:
          idea.answers,
      };
    });
}

/* =========================================================
   INSIGHT DA IA
========================================================= */

export function buildAiInsight(
  ideas: StoredIdea[],
  distribution: DimensionSlice[]
): string {
  if (ideas.length === 0) {
    return "Ainda não há ideias suficientes para gerar uma leitura da IA. Assim que novas ideias forem analisadas pelo Copiloto, este painel é atualizado automaticamente.";
  }

  const top = [...distribution].sort(
    (a, b) =>
      b.percent - a.percent
  )[0];

  const label: Record<
    ESGDimensionKey,
    string
  > = {
    environmental: "ambiental",
    social: "social",
    governance:
      "de governança",
  };

  if (!top || top.count === 0) {
    return "As ideias recebidas ainda não possuem impacto ESG claramente identificado pela entrevista do Copiloto.";
  }

  return `${top.percent}% das ideias analisadas possuem impacto ${label[top.dimension]}. As oportunidades de maior potencial estão concentradas nessa dimensão, com base nas análises geradas pelo Copiloto.`;
}