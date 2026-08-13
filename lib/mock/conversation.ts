function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface Theme {
  match: string[];
  questions: string[];
}

// Ordered so the water/cooling example from the brief is reproduced exactly.
const THEMES: Theme[] = [
  {
    match: ["resfriamento", "injetora"],
    questions: [
      "Essa água entra em contato com óleo ou algum outro contaminante?",
      "Existe algum local específico onde essa água seria reutilizada?",
    ],
  },
  {
    match: ["agua", "efluente", "reuso", "reaproveit"],
    questions: [
      "Essa água entra em contato com algum contaminante durante o processo?",
      "Existe um destino específico pensado para o reúso dessa água?",
    ],
  },
  {
    match: ["seguranca", "acidente", "epi", "risco"],
    questions: [
      "Essa mudança afeta diretamente as condições de trabalho dos colaboradores?",
      "Já existe algum processo ou equipamento relacionado hoje, ou seria implementado do zero?",
    ],
  },
  {
    match: ["desperdicio", "perda", "materia-prima", "materia prima"],
    questions: [
      "Esse desperdício está relacionado a matéria-prima, energia ou tempo de processo?",
      "Você tem uma noção aproximada do volume ou custo envolvido hoje?",
    ],
  },
  {
    match: ["energia", "eletric", "combustivel"],
    questions: [
      "Essa ideia reduz o consumo de energia, muda a fonte utilizada, ou os dois?",
      "Existe algum equipamento ou processo específico envolvido?",
    ],
  },
  {
    match: ["descarte", "digital", "rastreab", "controle"],
    questions: [
      "Essa ideia melhora o controle, a rastreabilidade ou a conformidade do processo?",
      "Quais áreas seriam responsáveis por acompanhar essa mudança?",
    ],
  },
  {
    match: ["capacitacao", "treinamento", "curso"],
    questions: [
      "Essa capacitação é voltada a segurança, qualidade ou desenvolvimento geral da equipe?",
      "Quantas pessoas ou quais áreas seriam impactadas?",
    ],
  },
];

const DEFAULT_QUESTIONS = [
  "Essa ideia impacta diretamente pessoas, o meio ambiente ou a forma como a empresa é gerida?",
  "Existe algum custo, área ou processo específico já em mente para colocar isso em prática?",
];

function pickQuestions(ideaText: string): string[] {
  const normalized = normalize(ideaText);
  for (const theme of THEMES) {
    if (theme.match.some((m) => normalized.includes(m))) {
      return theme.questions;
    }
  }
  return DEFAULT_QUESTIONS;
}

export interface MockTurnResult {
  type: "question" | "ready";
  text: string;
}

/**
 * The mock interviewer asks exactly two contextual questions before closing
 * the interview, mirroring the scripted example in the product brief.
 * userTurnCount is the number of user messages received so far (including
 * the current one), and ideaText is always the very first user message.
 */
export function nextMockTurn(ideaText: string, userTurnCount: number): MockTurnResult {
  const questions = pickQuestions(ideaText);

  if (userTurnCount <= 1) {
    return { type: "question", text: questions[0] };
  }
  if (userTurnCount === 2) {
    return { type: "question", text: questions[1] };
  }
  return {
    type: "ready",
    text: "Entendi. Já tenho informações suficientes para analisar o potencial ESG dessa ideia.",
  };
}
