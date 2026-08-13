import { AnalysisResult, ESGDimensionKey, ESGLevel, ESGPotential } from "./types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const KEYWORDS: Record<ESGDimensionKey, string[]> = {
  environmental: [
    "agua",
    "resfriamento",
    "efluente",
    "energia",
    "residuo",
    "reciclagem",
    "desperdicio",
    "emissao",
    "sustentab",
    "combustivel",
    "oleo",
    "poluicao",
    "consumo",
    "descarte",
    "reuso",
    "reaproveit",
    "carbono",
    "insumo",
  ],
  social: [
    "seguranca",
    "saude",
    "colaborador",
    "capacitacao",
    "treinamento",
    "bem-estar",
    "bem estar",
    "diversidade",
    "comunidade",
    "condicoes de trabalho",
    "acidente",
    "ergonomia",
    "clima organizacional",
    "inclusao",
  ],
  governance: [
    "controle",
    "rastreabilidade",
    "conformidade",
    "auditoria",
    "transparencia",
    "digital",
    "dados",
    "processo",
    "politica",
    "gestao",
    "compliance",
    "indicador",
    "monitoramento",
    "norma",
  ],
};

function scoreDimension(text: string, key: ESGDimensionKey): number {
  const words = KEYWORDS[key];
  let score = 0;
  for (const w of words) {
    if (text.includes(w)) score += 1;
  }
  return score;
}

function levelFromScore(score: number): ESGLevel {
  if (score === 0) return "NOT_IDENTIFIED";
  if (score === 1) return "LOW";
  if (score === 2) return "MEDIUM";
  return "HIGH";
}

function potentialFromLevels(levels: ESGLevel[]): ESGPotential {
  if (levels.includes("HIGH")) return "HIGH";
  if (levels.includes("MEDIUM")) return "MEDIUM";
  return "LOW";
}

const JUSTIFICATIONS: Record<ESGDimensionKey, Record<ESGLevel, string>> = {
  environmental: {
    HIGH: "Redução direta e mensurável do consumo de recursos naturais ou geração de resíduos.",
    MEDIUM: "Contribuição relevante para eficiência ambiental, com efeito indireto no consumo de recursos.",
    LOW: "Efeito ambiental secundário, sem redução expressiva de recursos ou emissões.",
    NOT_IDENTIFIED: "Nenhum impacto ambiental direto relevante identificado.",
  },
  social: {
    HIGH: "Melhoria direta nas condições de trabalho, segurança ou bem-estar dos colaboradores.",
    MEDIUM: "Contribuição relevante para segurança, saúde ou desenvolvimento das equipes envolvidas.",
    LOW: "Efeito social indireto, sem mudança expressiva nas condições de trabalho.",
    NOT_IDENTIFIED: "Nenhum impacto social direto relevante identificado.",
  },
  governance: {
    HIGH: "Ganho expressivo de controle, rastreabilidade ou conformidade dos processos.",
    MEDIUM: "Necessidade de controle, monitoramento e conformidade do processo.",
    LOW: "Efeito indireto sobre processos de controle ou conformidade.",
    NOT_IDENTIFIED: "Nenhum impacto direto sobre governança ou conformidade identificado.",
  },
};

const AREA_SUGGESTIONS: Record<ESGDimensionKey, string[]> = {
  environmental: ["Meio Ambiente", "Manutenção"],
  social: ["Segurança do Trabalho", "Recursos Humanos"],
  governance: ["Qualidade", "Compliance"],
};

const BENEFIT_SUGGESTIONS: Record<ESGDimensionKey, string[]> = {
  environmental: [
    "Redução do consumo de recursos naturais",
    "Menor geração de resíduos ou efluentes",
    "Potencial economia operacional",
  ],
  social: [
    "Melhoria das condições de trabalho",
    "Redução de riscos à saúde e segurança",
    "Maior engajamento dos colaboradores",
  ],
  governance: [
    "Maior rastreabilidade do processo",
    "Melhoria da conformidade regulatória",
    "Mais transparência para tomada de decisão",
  ],
};

const NEXT_STEP_SUGGESTIONS: Record<ESGDimensionKey, string[]> = {
  environmental: [
    "Avaliar viabilidade técnica da mudança",
    "Medir consumo atual como linha de base",
    "Mapear áreas responsáveis pela implementação",
  ],
  social: [
    "Validar impacto com as equipes envolvidas",
    "Levantar riscos e requisitos de segurança",
    "Definir plano de comunicação e treinamento",
  ],
  governance: [
    "Definir indicadores de acompanhamento",
    "Mapear responsáveis pelo controle do processo",
    "Avaliar requisitos de conformidade envolvidos",
  ],
};

export interface ClassifyInput {
  ideaText: string;
  answers: string[];
}

export function classifyIdea({ ideaText, answers }: ClassifyInput): AnalysisResult {
  const primaryText = normalize(ideaText);
  const fullText = normalize([ideaText, ...answers].join(" "));

  const rawScores: Record<ESGDimensionKey, number> = {
    environmental: scoreDimension(fullText, "environmental") + scoreDimension(primaryText, "environmental"),
    social: scoreDimension(fullText, "social") + scoreDimension(primaryText, "social"),
    governance: scoreDimension(fullText, "governance") + scoreDimension(primaryText, "governance"),
  };

  const levels: Record<ESGDimensionKey, ESGLevel> = {
    environmental: levelFromScore(rawScores.environmental),
    social: levelFromScore(rawScores.social),
    governance: levelFromScore(rawScores.governance),
  };

  // Guarantee the idea is never entirely unclassified: the strongest signal
  // becomes at least MEDIUM, mirroring how an analyst would read a real idea.
  const order: ESGDimensionKey[] = ["environmental", "social", "governance"];
  const allNotIdentified = order.every((k) => levels[k] === "NOT_IDENTIFIED");
  if (allNotIdentified) {
    levels.environmental = "MEDIUM";
  }

  const mainDimension = order.reduce((best, key) =>
    rawScores[key] > rawScores[best] ? key : best
  , order[0]);

  const potential = potentialFromLevels(order.map((k) => levels[k]));

  const dimensions = order.reduce((acc, key) => {
    acc[key] = {
      level: levels[key],
      justification: JUSTIFICATIONS[key][levels[key]],
    };
    return acc;
  }, {} as AnalysisResult["dimensions"]);

  const theme = ideaText.trim().replace(/^["“]|["”]$/g, "");
  const shortTheme = theme.length > 72 ? theme.slice(0, 69) + "…" : theme;

  const contributingDims = order.filter((k) => levels[k] === "HIGH" || levels[k] === "MEDIUM");
  const summaryParts = contributingDims.length ? contributingDims : [mainDimension];

  const dimensionNames: Record<ESGDimensionKey, string> = {
    environmental: "ambiental",
    social: "social",
    governance: "de governança",
  };

  const summary =
    contributingDims.length > 1
      ? `Ideia com potencial ${dimensionNames[mainDimension]} relevante, com contribuições adicionais nas dimensões ${summaryParts
          .filter((d) => d !== mainDimension)
          .map((d) => dimensionNames[d])
          .join(" e ")}.`
      : `Impacto ${dimensionNames[mainDimension]} relevante, com oportunidade de melhoria mensurável no processo descrito.`;

  const benefits = Array.from(
    new Set(summaryParts.flatMap((k) => BENEFIT_SUGGESTIONS[k]).slice(0, 3))
  );

  const areas = Array.from(new Set(summaryParts.flatMap((k) => AREA_SUGGESTIONS[k]))).slice(0, 3);

  const nextSteps = Array.from(
    new Set([...NEXT_STEP_SUGGESTIONS[mainDimension], ...(answers.length ? [] : [])])
  ).slice(0, 4);

  return {
    status: "completed",
    potential_esg: potential,
    dimensions,
    main_dimension: mainDimension,
    theme: shortTheme,
    summary,
    benefits,
    areas,
    next_steps: nextSteps,
    mini_project: {
      title: shortTheme,
      description: summary,
    },
  };
}
