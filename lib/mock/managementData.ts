import { IdeaSummary } from "@/lib/esg/types";

export const MANAGEMENT_METRICS = {
  totalIdeas: 128,
  withEsgPotential: 86,
  highPotential: 42,
  lastUpdated: "Hoje, 14:32",
};

export const ESG_DISTRIBUTION = [
  { dimension: "environmental" as const, count: 80, percent: 62 },
  { dimension: "social" as const, count: 30, percent: 23 },
  { dimension: "governance" as const, count: 18, percent: 15 },
];

export const AI_INSIGHT_TEXT =
  "62% das ideias analisadas possuem impacto ambiental. As oportunidades de maior potencial estão concentradas em redução de recursos e eficiência operacional.";

export const TOP_IDEAS: IdeaSummary[] = [
  {
    id: "idea-1",
    createdAt: "2026-08-10T14:32:00Z",
    ideaText: "Ideia de exemplo (dado mockado, não utilizado em produção).",
    answers: [],
    title: "Reúso da água do resfriamento",
    highlightDimensions: ["environmental"],
    mainDimension: "environmental" as const,
    potential: "HIGH",
    summary: "Redução potencial de consumo de água e geração de efluentes.",
    dimensions: {
      environmental: {
        level: "HIGH",
        justification: "Redução do consumo de água e menor geração de efluentes.",
      },
      social: {
        level: "LOW",
        justification: "Nenhum impacto social direto relevante identificado.",
      },
      governance: {
        level: "MEDIUM",
        justification: "Necessidade de controle, monitoramento e conformidade do processo.",
      },
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
    areas: ["Operações", "Utilidades"],
    miniProject: {
      title: "Reúso da água do resfriamento",
      description:
        "Implantar um circuito de reúso da água utilizada no resfriamento, reduzindo captação e descarte de efluentes.",
    },
  },
  {
    id: "idea-2",
    createdAt: "2026-08-10T14:32:00Z",
    ideaText: "Ideia de exemplo (dado mockado, não utilizado em produção).",
    answers: [],
    title: "Programa de segurança operacional",
    highlightDimensions: ["social"],
    mainDimension: "social" as const,
    potential: "HIGH",
    summary: "Redução de riscos e melhoria das condições de trabalho.",
    dimensions: {
      environmental: {
        level: "NOT_IDENTIFIED",
        justification: "Nenhum impacto ambiental direto relevante identificado.",
      },
      social: {
        level: "HIGH",
        justification: "Redução de riscos e melhoria direta das condições de trabalho.",
      },
      governance: {
        level: "MEDIUM",
        justification: "Necessidade de padronização e acompanhamento de indicadores de segurança.",
      },
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
    areas: ["Segurança do Trabalho", "Operações"],
    miniProject: {
      title: "Programa de segurança operacional",
      description:
        "Estruturar um programa contínuo de segurança operacional com treinamentos, indicadores e ações preventivas.",
    },
  },
  {
    id: "idea-3",
    createdAt: "2026-08-10T14:32:00Z",
    ideaText: "Ideia de exemplo (dado mockado, não utilizado em produção).",
    answers: [],
    title: "Controle digital de descarte",
    highlightDimensions: ["environmental", "governance"],
    mainDimension: "governance" as const,
    potential: "HIGH",
    summary: "Maior rastreabilidade e controle dos descartes.",
    dimensions: {
      environmental: {
        level: "HIGH",
        justification: "Melhoria expressiva do controle sobre resíduos e destinação de descarte.",
      },
      social: {
        level: "NOT_IDENTIFIED",
        justification: "Nenhum impacto social direto relevante identificado.",
      },
      governance: {
        level: "HIGH",
        justification: "Ganho expressivo de rastreabilidade e conformidade do processo de descarte.",
      },
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
    areas: ["Meio Ambiente", "Compliance"],
    miniProject: {
      title: "Controle digital de descarte",
      description:
        "Digitalizar o registro e a rastreabilidade dos descartes, aumentando a conformidade e a transparência do processo.",
    },
  },
  {
    id: "idea-4",
    createdAt: "2026-08-10T14:32:00Z",
    ideaText: "Ideia de exemplo (dado mockado, não utilizado em produção).",
    answers: [],
    title: "Redução de desperdício de matéria-prima",
    highlightDimensions: ["environmental"],
    mainDimension: "environmental" as const,
    potential: "HIGH",
    summary: "Redução de perdas e melhoria da eficiência operacional.",
    dimensions: {
      environmental: {
        level: "HIGH",
        justification: "Redução direta de perdas de matéria-prima no processo produtivo.",
      },
      social: {
        level: "NOT_IDENTIFIED",
        justification: "Nenhum impacto social direto relevante identificado.",
      },
      governance: {
        level: "LOW",
        justification: "Efeito indireto sobre indicadores de eficiência de processo.",
      },
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
    areas: ["Produção"],
    miniProject: {
      title: "Redução de desperdício de matéria-prima",
      description:
        "Mapear e reduzir as perdas de matéria-prima ao longo do processo produtivo, com metas mensais de acompanhamento.",
    },
  },
  {
    id: "idea-5",
    createdAt: "2026-08-10T14:32:00Z",
    ideaText: "Ideia de exemplo (dado mockado, não utilizado em produção).",
    answers: [],
    title: "Programa de capacitação operacional",
    highlightDimensions: ["social"],
    mainDimension: "social" as const,
    potential: "MEDIUM",
    summary: "Desenvolvimento das competências dos colaboradores.",
    dimensions: {
      environmental: {
        level: "NOT_IDENTIFIED",
        justification: "Nenhum impacto ambiental direto relevante identificado.",
      },
      social: {
        level: "MEDIUM",
        justification: "Contribuição relevante para o desenvolvimento das equipes envolvidas.",
      },
      governance: {
        level: "LOW",
        justification: "Efeito indireto sobre padronização de processos internos.",
      },
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
    areas: ["Recursos Humanos", "Operações"],
    miniProject: {
      title: "Programa de capacitação operacional",
      description:
        "Criar uma trilha de capacitação para desenvolver competências técnicas e operacionais das equipes.",
    },
  },
];
