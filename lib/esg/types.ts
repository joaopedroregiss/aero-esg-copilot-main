export type ESGLevel = "HIGH" | "MEDIUM" | "LOW" | "NOT_IDENTIFIED";
export type ESGPotential = "HIGH" | "MEDIUM" | "LOW";
export type ESGDimensionKey = "environmental" | "social" | "governance";

export type ScoreLevel = "EXCELLENT" | "GOOD" | "FAIR" | "LOW";

export interface ESGDimensionResult {
  level: ESGLevel;
  justification: string;
}

export interface IdeaScoreBreakdown {
  problem: number;
  solution: number;
  feasibility: number;
  impact: number;
  innovation: number;
  maturity: number;
}

export interface IdeaScoreResult {
  total: number;
  level: ScoreLevel;
  breakdown: IdeaScoreBreakdown;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface PriorityScoreResult {
  total: number;
  level: ScoreLevel;
  justification: string;
}

export interface MiniProject {
  title: string;
  description: string;
}

export interface AnalysisResult {
  status: "completed";

  // ESG
  potential_esg: ESGPotential;
  dimensions: Record<ESGDimensionKey, ESGDimensionResult>;
  main_dimension: ESGDimensionKey;

  // Avaliação da qualidade da ideia
  idea_score: IdeaScoreResult;

  // Prioridade estratégica
  priority_score: PriorityScoreResult;

  theme: string;
  summary: string;
  benefits: string[];
  areas: string[];
  next_steps: string[];
  mini_project: MiniProject;

  /** Preenchido apenas na resposta de /api/analyze: indica se a ideia foi
   *  salva no histórico (Supabase) para aparecer na Visão Gerencial. */
  persisted?: boolean;
  persistError?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system-status";
  text: string;
  createdAt: string;
}

export interface IdeaSummary {
  id: string;
  title: string;

  /** Dimensions displayed in the ranked list, e.g. ["environmental"] or ["environmental","governance"]. */
  highlightDimensions: ESGDimensionKey[];

  potential: ESGPotential;
  summary: string;
  dimensions: Record<ESGDimensionKey, ESGDimensionResult>;

  /** Dimensão ESG primária, usada no mini-projeto. */
  mainDimension: ESGDimensionKey;

  // Scores
  ideaScore: IdeaScoreResult;
  priorityScore: PriorityScoreResult;

  benefits: string[];
  areas: string[];
  nextSteps: string[];

  /** Mini-projeto gerado pelo Copiloto para esta ideia. */
  miniProject: MiniProject;

  /** Data/hora em que a ideia foi enviada pelo colaborador (ISO). */
  createdAt: string;

  /** Texto original da ideia, exatamente como o colaborador escreveu. */
  ideaText: string;

  /** Respostas do colaborador durante a entrevista do Copiloto, em ordem. */
  answers: string[];
}

export const ESG_LABEL: Record<ESGDimensionKey, string> = {
  environmental: "Ambiental",
  social: "Social",
  governance: "Governança",
};

export const ESG_LETTER: Record<ESGDimensionKey, string> = {
  environmental: "E",
  social: "S",
  governance: "G",
};

export const ESG_LEVEL_LABEL: Record<ESGLevel, string> = {
  HIGH: "Alto",
  MEDIUM: "Médio",
  LOW: "Baixo",
  NOT_IDENTIFIED: "Não identificado",
};

export const ESG_POTENTIAL_LABEL: Record<ESGPotential, string> = {
  HIGH: "ALTO",
  MEDIUM: "MÉDIO",
  LOW: "BAIXO",
};

export const SCORE_LEVEL_LABEL: Record<ScoreLevel, string> = {
  EXCELLENT: "Excelente",
  GOOD: "Muito boa",
  FAIR: "Precisa de refinamento",
  LOW: "Baixa",
};