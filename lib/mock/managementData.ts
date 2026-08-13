import {
  IdeaSummary,
  IdeaScoreResult,
  PriorityScoreResult,
} from "@/lib/esg/types";

const MOCK_IDEA_SCORE: IdeaScoreResult = {
  total: 82,

  level: "GOOD",

  breakdown: {
    problem: 17,
    solution: 16,
    feasibility: 13,
    impact: 15,
    innovation: 11,
    maturity: 10,
  },

  strengths: [
    "Problema bem definido.",
    "Impacto potencial relevante.",
  ],

  weaknesses: [
    "Necessita validação técnica.",
  ],

  recommendations: [
    "Executar um piloto antes da implantação completa.",
  ],
};

const MOCK_PRIORITY_SCORE: PriorityScoreResult = {
  total: 86,

  level: "GOOD",

  justification:
    "Alto potencial de impacto e boa aderência estratégica, condicionado à validação técnica.",
};

export const MANAGEMENT_METRICS = {
  totalIdeas: 128,
  withEsgPotential: 86,
  highPotential: 42,
  lastUpdated: "Hoje, 14:32",
};

export const ESG_DISTRIBUTION = [
  {
    dimension: "environmental" as const,
    count: 80,
    percent: 62,
  },

  {
    dimension: "social" as const,
    count: 30,
    percent: 23,
  },

  {
    dimension: "governance" as const,
    count: 18,
    percent: 15,
  },
];

export const AI_INSIGHT_TEXT =
  "62% das ideias analisadas possuem impacto ambiental. As oportunidades de maior potencial estão concentradas em redução de recursos e eficiência operacional.";

export const TOP_IDEAS: IdeaSummary[] = [
  {
    id: "idea-1",

    createdAt:
      "2026-08-10T14:32:00Z",

    ideaText:
      "Ideia de exemplo (dado mockado, não utilizado em produção).",

    answers: [],

    title:
      "Reúso da água do resfriamento",

    highlightDimensions: [
      "environmental",
    ],

    mainDimension:
      "environmental",

    potential: "HIGH",

    summary:
      "Redução potencial de consumo de água e geração de efluentes.",

    dimensions: {
      environmental: {
        level: "HIGH",
        justification:
          "Redução do consumo de água e menor geração de efluentes.",
      },

      social: {
        level: "LOW",
        justification:
          "Nenhum impacto social direto relevante identificado.",
      },

      governance: {
        level: "MEDIUM",
        justification:
          "Necessidade de controle, monitoramento e conformidade do processo.",
      },
    },

    ideaScore: MOCK_IDEA_SCORE,

    priorityScore: {
      ...MOCK_PRIORITY_SCORE,
      total: 94,
      justification:
        "Alto potencial ambiental, redução de consumo de água e possibilidade de ganho operacional.",
    },

    benefits: [
      "Redução do consumo de água",
      "Menor geração de efluentes",
      "Potencial economia operacional",
    ],

    nextSteps: [
      "Validar qualidade da água após o separador",
      "Avaliar viabilidade técnica",
      "Mapear local de reúso",
      "Medir m³ economizados/mês",
    ],

    areas: [
      "Operações",
      "Utilidades",
    ],

    miniProject: {
      title:
        "Reúso da água do resfriamento",

      description:
        "Implantar um circuito de reúso da água utilizada no resfriamento, reduzindo captação e descarte de efluentes.",
    },
  },

  {
    id: "idea-2",

    createdAt:
      "2026-08-10T14:32:00Z",

    ideaText:
      "Ideia de exemplo (dado mockado, não utilizado em produção).",

    answers: [],

    title:
      "Programa de segurança operacional",

    highlightDimensions: [
      "social",
    ],

    mainDimension:
      "social",

    potential: "HIGH",

    summary:
      "Redução de riscos e melhoria das condições de trabalho.",

    dimensions: {
      environmental: {
        level: "NOT_IDENTIFIED",
        justification:
          "Nenhum impacto ambiental direto relevante identificado.",
      },

      social: {
        level: "HIGH",
        justification:
          "Redução de riscos e melhoria direta das condições de trabalho.",
      },

      governance: {
        level: "MEDIUM",
        justification:
          "Necessidade de padronização e acompanhamento de indicadores de segurança.",
      },
    },

    ideaScore: {
      ...MOCK_IDEA_SCORE,
      total: 88,
    },

    priorityScore: {
      ...MOCK_PRIORITY_SCORE,
      total: 91,
      justification:
        "Alto potencial social e forte relação com segurança operacional.",
    },

    benefits: [
      "Redução de acidentes e riscos operacionais",
      "Melhoria das condições de trabalho",
      "Maior engajamento das equipes",
    ],

    nextSteps: [
      "Mapear pontos críticos de risco",
      "Definir plano de treinamento",
      "Estabelecer indicadores de acompanhamento",
    ],

    areas: [
      "Segurança do Trabalho",
      "Operações",
    ],

    miniProject: {
      title:
        "Programa de segurança operacional",

      description:
        "Estruturar um programa contínuo de segurança operacional com treinamentos, indicadores e ações preventivas.",
    },
  },

  {
    id: "idea-3",

    createdAt:
      "2026-08-10T14:32:00Z",

    ideaText:
      "Ideia de exemplo (dado mockado, não utilizado em produção).",

    answers: [],

    title:
      "Controle digital de descarte",

    highlightDimensions: [
      "environmental",
      "governance",
    ],

    mainDimension:
      "governance",

    potential: "HIGH",

    summary:
      "Maior rastreabilidade e controle dos descartes.",

    dimensions: {
      environmental: {
        level: "HIGH",
        justification:
          "Melhoria expressiva do controle sobre resíduos e destinação de descarte.",
      },

      social: {
        level: "NOT_IDENTIFIED",
        justification:
          "Nenhum impacto social direto relevante identificado.",
      },

      governance: {
        level: "HIGH",
        justification:
          "Ganho expressivo de rastreabilidade e conformidade do processo de descarte.",
      },
    },

    ideaScore: {
      ...MOCK_IDEA_SCORE,
      total: 84,
    },

    priorityScore: {
      ...MOCK_PRIORITY_SCORE,
      total: 89,
      justification:
        "Boa combinação entre impacto ambiental, governança e rastreabilidade.",
    },

    benefits: [
      "Maior rastreabilidade dos descartes",
      "Melhoria da conformidade regulatória",
      "Mais transparência para auditorias",
    ],

    nextSteps: [
      "Selecionar ferramenta de controle digital",
      "Definir indicadores de descarte",
      "Treinar equipes responsáveis",
    ],

    areas: [
      "Meio Ambiente",
      "Compliance",
    ],

    miniProject: {
      title:
        "Controle digital de descarte",

      description:
        "Digitalizar o registro e a rastreabilidade dos descartes, aumentando a conformidade e a transparência do processo.",
    },
  },

  {
    id: "idea-4",

    createdAt:
      "2026-08-10T14:32:00Z",

    ideaText:
      "Ideia de exemplo (dado mockado, não utilizado em produção).",

    answers: [],

    title:
      "Redução de desperdício de matéria-prima",

    highlightDimensions: [
      "environmental",
    ],

    mainDimension:
      "environmental",

    potential: "HIGH",

    summary:
      "Redução de perdas e melhoria da eficiência operacional.",

    dimensions: {
      environmental: {
        level: "HIGH",
        justification:
          "Redução direta de perdas de matéria-prima no processo produtivo.",
      },

      social: {
        level: "NOT_IDENTIFIED",
        justification:
          "Nenhum impacto social direto relevante identificado.",
      },

      governance: {
        level: "LOW",
        justification:
          "Efeito indireto sobre indicadores de eficiência de processo.",
      },
    },

    ideaScore: {
      ...MOCK_IDEA_SCORE,
      total: 79,
    },

    priorityScore: {
      ...MOCK_PRIORITY_SCORE,
      total: 84,
      justification:
        "Boa oportunidade de redução de perdas e melhoria de eficiência operacional.",
    },

    benefits: [
      "Redução de perdas de matéria-prima",
      "Melhoria da eficiência operacional",
      "Potencial economia de custos",
    ],

    nextSteps: [
      "Medir perdas atuais como linha de base",
      "Identificar causas raiz do desperdício",
      "Testar ajuste de processo em piloto",
    ],

    areas: [
      "Produção",
    ],

    miniProject: {
      title:
        "Redução de desperdício de matéria-prima",

      description:
        "Mapear e reduzir as perdas de matéria-prima ao longo do processo produtivo, com metas mensais de acompanhamento.",
    },
  },

  {
    id: "idea-5",

    createdAt:
      "2026-08-10T14:32:00Z",

    ideaText:
      "Ideia de exemplo (dado mockado, não utilizado em produção).",

    answers: [],

    title:
      "Programa de capacitação operacional",

    highlightDimensions: [
      "social",
    ],

    mainDimension:
      "social",

    potential: "MEDIUM",

    summary:
      "Desenvolvimento das competências dos colaboradores.",

    dimensions: {
      environmental: {
        level: "NOT_IDENTIFIED",
        justification:
          "Nenhum impacto ambiental direto relevante identificado.",
      },

      social: {
        level: "MEDIUM",
        justification:
          "Contribuição relevante para o desenvolvimento das equipes envolvidas.",
      },

      governance: {
        level: "LOW",
        justification:
          "Efeito indireto sobre padronização de processos internos.",
      },
    },

    ideaScore: {
      ...MOCK_IDEA_SCORE,
      total: 72,
    },

    priorityScore: {
      ...MOCK_PRIORITY_SCORE,
      total: 75,
      justification:
        "Potencial social relevante, mas depende de planejamento e acompanhamento dos resultados.",
    },

    benefits: [
      "Desenvolvimento de competências técnicas",
      "Maior autonomia das equipes",
      "Melhoria da qualidade operacional",
    ],

    nextSteps: [
      "Mapear lacunas de capacitação por área",
      "Definir trilha de treinamento",
      "Avaliar impacto após 90 dias",
    ],

    areas: [
      "Recursos Humanos",
      "Operações",
    ],

    miniProject: {
      title:
        "Programa de capacitação operacional",

      description:
        "Criar uma trilha de capacitação para desenvolver competências técnicas e operacionais das equipes.",
    },
  },
];