import {
  AnalysisResult,
  ESGDimensionKey,
  ESGLevel,
  ESGPotential,
  ScoreLevel,
} from "./types";

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

function scoreDimension(
  text: string,
  key: ESGDimensionKey
): number {
  const words = KEYWORDS[key];

  let score = 0;

  for (const word of words) {
    if (text.includes(word)) {
      score += 1;
    }
  }

  return score;
}

function levelFromScore(score: number): ESGLevel {
  if (score === 0) return "NOT_IDENTIFIED";
  if (score === 1) return "LOW";
  if (score === 2) return "MEDIUM";

  return "HIGH";
}

function potentialFromLevels(
  levels: ESGLevel[]
): ESGPotential {
  if (levels.includes("HIGH")) return "HIGH";
  if (levels.includes("MEDIUM")) return "MEDIUM";

  return "LOW";
}

const JUSTIFICATIONS: Record<
  ESGDimensionKey,
  Record<ESGLevel, string>
> = {
  environmental: {
    HIGH:
      "Redução direta e mensurável do consumo de recursos naturais ou geração de resíduos.",
    MEDIUM:
      "Contribuição relevante para eficiência ambiental, com efeito indireto no consumo de recursos.",
    LOW:
      "Efeito ambiental secundário, sem redução expressiva de recursos ou emissões.",
    NOT_IDENTIFIED:
      "Nenhum impacto ambiental direto relevante identificado.",
  },

  social: {
    HIGH:
      "Melhoria direta nas condições de trabalho, segurança ou bem-estar dos colaboradores.",
    MEDIUM:
      "Contribuição relevante para segurança, saúde ou desenvolvimento das equipes envolvidas.",
    LOW:
      "Efeito social indireto, sem mudança expressiva nas condições de trabalho.",
    NOT_IDENTIFIED:
      "Nenhum impacto social direto relevante identificado.",
  },

  governance: {
    HIGH:
      "Ganho expressivo de controle, rastreabilidade ou conformidade dos processos.",
    MEDIUM:
      "Necessidade de controle, monitoramento e conformidade do processo.",
    LOW:
      "Efeito indireto sobre processos de controle ou conformidade.",
    NOT_IDENTIFIED:
      "Nenhum impacto direto sobre governança ou conformidade identificado.",
  },
};

const AREA_SUGGESTIONS: Record<
  ESGDimensionKey,
  string[]
> = {
  environmental: [
    "Meio Ambiente",
    "Manutenção",
  ],

  social: [
    "Segurança do Trabalho",
    "Recursos Humanos",
  ],

  governance: [
    "Qualidade",
    "Compliance",
  ],
};

const BENEFIT_SUGGESTIONS: Record<
  ESGDimensionKey,
  string[]
> = {
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

const NEXT_STEP_SUGGESTIONS: Record<
  ESGDimensionKey,
  string[]
> = {
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

function getScoreLevel(total: number): ScoreLevel {
  if (total >= 90) return "EXCELLENT";
  if (total >= 75) return "GOOD";
  if (total >= 55) return "FAIR";

  return "LOW";
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildIdeaScore(
  ideaText: string,
  answers: string[],
  esgPotential: ESGPotential
): AnalysisResult["idea_score"] {
  const idea = normalize(ideaText);
  const history = normalize(answers.join(" "));

  const fullText = `${idea} ${history}`;

  const hasProblem =
    /problema|dificuldade|perda|risco|falha|melhorar|reduzir|evitar|oportunidade/.test(
      fullText
    );

  const hasSolution =
    /implantar|criar|instalar|automatizar|implementar|substituir|reutilizar|digitalizar|desenvolver|melhorar/.test(
      fullText
    );

  const hasImpact =
    /reduzir|economizar|aumentar|melhorar|evitar|diminuir|ganhar|seguranca|agua|energia|residuo|produtividade/.test(
      fullText
    );

  const hasDetail = answers.length >= 2;

  const problem = hasProblem ? 18 : 10;
  const solution = hasSolution ? 18 : 10;
  const feasibility = hasDetail ? 16 : 10;
  const impact =
    esgPotential === "HIGH"
      ? 18
      : esgPotential === "MEDIUM"
        ? 14
        : 9;
  const innovation = hasSolution ? 14 : 9;
  const maturity = hasDetail ? 16 : 9;

  const total = clamp(
    problem +
      solution +
      feasibility +
      impact +
      innovation +
      maturity
  );

  const strengths: string[] = [];

  if (hasProblem) {
    strengths.push("O problema ou oportunidade está relativamente claro.");
  }

  if (hasSolution) {
    strengths.push("A ideia apresenta uma solução ou direção de solução.");
  }

  if (esgPotential === "HIGH") {
    strengths.push("Existe potencial ESG relevante.");
  }

  if (strengths.length === 0) {
    strengths.push(
      "A ideia apresenta uma oportunidade de melhoria que pode ser desenvolvida."
    );
  }

  const weaknesses: string[] = [];

  if (!hasProblem) {
    weaknesses.push(
      "O problema que a ideia pretende resolver ainda precisa ser melhor definido."
    );
  }

  if (!hasSolution) {
    weaknesses.push(
      "A forma de execução da solução ainda precisa ser detalhada."
    );
  }

  if (!hasDetail) {
    weaknesses.push(
      "Ainda faltam informações para avaliar melhor a viabilidade."
    );
  }

  if (weaknesses.length === 0) {
    weaknesses.push(
      "Ainda é necessário validar a solução na prática."
    );
  }

  const recommendations: string[] = [
    "Validar a solução com a área responsável.",
    "Definir um pequeno piloto antes da implantação completa.",
  ];

  if (!hasProblem) {
    recommendations.unshift(
      "Detalhar o problema ou oportunidade que a ideia pretende resolver."
    );
  }

  return {
    total,
    level: getScoreLevel(total),

    breakdown: {
      problem,
      solution,
      feasibility,
      impact,
      innovation,
      maturity,
    },

    strengths,
    weaknesses,
    recommendations,
  };
}

function buildPriorityScore(
  ideaScore: AnalysisResult["idea_score"],
  potential: ESGPotential
): AnalysisResult["priority_score"] {
  let total = ideaScore.total;

  if (potential === "HIGH") {
    total += 8;
  }

  if (potential === "MEDIUM") {
    total += 4;
  }

  total = clamp(total);

  let justification =
    "A ideia apresenta potencial, mas ainda precisa de validação para determinar sua prioridade de implementação.";

  if (total >= 75) {
    justification =
      "A ideia apresenta boa combinação entre qualidade, potencial de impacto e possibilidade de implementação.";
  }

  if (total >= 90) {
    justification =
      "A ideia apresenta forte potencial de impacto e qualidade, justificando alta prioridade para avaliação.";
  }

  return {
    total,
    level: getScoreLevel(total),
    justification,
  };
}

export function classifyIdea({
  ideaText,
  answers,
}: ClassifyInput): AnalysisResult {
  const primaryText = normalize(ideaText);

  const fullText = normalize(
    [ideaText, ...answers].join(" ")
  );

  const rawScores: Record<
    ESGDimensionKey,
    number
  > = {
    environmental:
      scoreDimension(
        fullText,
        "environmental"
      ) +
      scoreDimension(
        primaryText,
        "environmental"
      ),

    social:
      scoreDimension(
        fullText,
        "social"
      ) +
      scoreDimension(
        primaryText,
        "social"
      ),

    governance:
      scoreDimension(
        fullText,
        "governance"
      ) +
      scoreDimension(
        primaryText,
        "governance"
      ),
  };

  const levels: Record<
    ESGDimensionKey,
    ESGLevel
  > = {
    environmental: levelFromScore(
      rawScores.environmental
    ),

    social: levelFromScore(
      rawScores.social
    ),

    governance: levelFromScore(
      rawScores.governance
    ),
  };

  const order: ESGDimensionKey[] = [
    "environmental",
    "social",
    "governance",
  ];

  const allNotIdentified =
    order.every(
      (key) =>
        levels[key] === "NOT_IDENTIFIED"
    );

  if (allNotIdentified) {
    levels.environmental = "LOW";
  }

  const mainDimension = order.reduce(
    (best, key) =>
      rawScores[key] > rawScores[best]
        ? key
        : best,
    order[0]
  );

  const potential =
    potentialFromLevels(
      order.map(
        (key) => levels[key]
      )
    );

  const dimensions =
    order.reduce(
      (acc, key) => {
        acc[key] = {
          level: levels[key],
          justification:
            JUSTIFICATIONS[key][
              levels[key]
            ],
        };

        return acc;
      },
      {} as AnalysisResult["dimensions"]
    );

  const theme = ideaText
    .trim()
    .replace(
      /^[\"“]|[\"”]$/g,
      ""
    );

  const shortTheme =
    theme.length > 72
      ? theme.slice(0, 69) + "…"
      : theme;

  const contributingDims =
    order.filter(
      (key) =>
        levels[key] === "HIGH" ||
        levels[key] === "MEDIUM"
    );

  const summaryParts =
    contributingDims.length
      ? contributingDims
      : [mainDimension];

  const dimensionNames: Record<
    ESGDimensionKey,
    string
  > = {
    environmental: "ambiental",
    social: "social",
    governance: "de governança",
  };

  const summary =
    contributingDims.length > 1
      ? `Ideia com potencial ${dimensionNames[mainDimension]} relevante, com contribuições adicionais nas dimensões ${summaryParts
          .filter(
            (dimension) =>
              dimension !== mainDimension
          )
          .map(
            (dimension) =>
              dimensionNames[dimension]
          )
          .join(" e ")}.`
      : `Impacto ${dimensionNames[mainDimension]} relevante, com oportunidade de melhoria mensurável no processo descrito.`;

  const benefits = Array.from(
    new Set(
      summaryParts
        .flatMap(
          (key) =>
            BENEFIT_SUGGESTIONS[key]
        )
        .slice(0, 3)
    )
  );

  const areas = Array.from(
    new Set(
      summaryParts.flatMap(
        (key) =>
          AREA_SUGGESTIONS[key]
      )
    )
  ).slice(0, 3);

  const nextSteps = Array.from(
    new Set(
      NEXT_STEP_SUGGESTIONS[
        mainDimension
      ]
    )
  ).slice(0, 4);

  const ideaScore =
    buildIdeaScore(
      ideaText,
      answers,
      potential
    );

  const priorityScore =
    buildPriorityScore(
      ideaScore,
      potential
    );

  return {
    status: "completed",

    potential_esg: potential,

    dimensions,

    main_dimension:
      mainDimension,

    idea_score: ideaScore,

    priority_score:
      priorityScore,

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