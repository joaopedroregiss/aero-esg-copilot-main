import {
  AIProvider,
  AnalyzeRequest,
  ChatTurnRequest,
  ChatTurnResponse,
} from "./types";

import { AnalysisResult } from "@/lib/esg/types";
import { GoogleGenAI } from "@google/genai";

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const MODEL = "gemini-3.5-flash-lite";

/*
 * Entrevista curta:
 * - idealmente 3 perguntas;
 * - pode chegar a 4 se faltar alguma informação importante;
 * - nunca passa de 5.
 */
const IDEAL_INTERVIEW_QUESTIONS = 3;
const MAX_INTERVIEW_QUESTIONS = 5;

const READY_MESSAGE =
  "Entendi. Já tenho informações suficientes para analisar o potencial ESG dessa ideia.";

const interactionStore = new Map<string, string>();

/* =========================================================
   CLIENTE
========================================================= */

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY não configurada nas variáveis de ambiente."
    );
  }

  return new GoogleGenAI({
    apiKey,
  });
}

/* =========================================================
   ERRO DE LIMITE
========================================================= */

export class GeminiRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiRateLimitError";
  }
}

function getErrorInfo(err: unknown) {
  const error = err as {
    status?: number;
    code?: number;
    message?: string;
    error?: {
      status?: number;
      code?: number;
      message?: string;
    };
  };

  const status =
    error?.status ??
    error?.code ??
    error?.error?.status ??
    error?.error?.code;

  const message =
    error?.message ??
    error?.error?.message ??
    String(err);

  return {
    status,
    message,
  };
}

function isRateLimitError(err: unknown): boolean {
  const { status, message } = getErrorInfo(err);

  return (
    status === 429 ||
    /429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(message)
  );
}

/* =========================================================
   ID DA SESSÃO
========================================================= */

function getSessionKey(ideaText: string): string {
  return String(ideaText ?? "")
    .trim()
    .toLowerCase();
}

/* =========================================================
   INTERACTIONS API
========================================================= */

async function createInteraction({
  input,
  systemInstruction,
  previousInteractionId,
  json = false,
}: {
  input: string;
  systemInstruction: string;
  previousInteractionId?: string;
  json?: boolean;
}) {
  const ai = getClient();

  console.log(
    `[geminiProvider] Interactions API | model=${MODEL} | previousInteractionId=${
      previousInteractionId ? "SIM" : "NÃO"
    }`
  );

  try {
    const response = await ai.interactions.create({
      model: MODEL,

      ...(previousInteractionId
        ? {
            previous_interaction_id: previousInteractionId,
          }
        : {}),

      input,

      system_instruction: systemInstruction,

      response_format: json
        ? {
            type: "text",
            mime_type: "application/json",
          }
        : {
            type: "text",
          },
    });

    console.log(
      `[geminiProvider] Interação criada | id=${response.id}`
    );

    return response;
  } catch (err) {
    const { status, message } = getErrorInfo(err);

    console.error("[geminiProvider] ERRO NA INTERACTIONS API", {
      model: MODEL,
      status,
      message,
    });

    if (isRateLimitError(err)) {
      throw new GeminiRateLimitError(
        "Limite de uso do Gemini atingido. Verifique a cota do projeto no Google AI Studio."
      );
    }

    throw err;
  }
}

/* =========================================================
   EXTRAÇÃO DO TEXTO
========================================================= */

function extractText(response: any): string {
  if (typeof response?.text === "string") {
    return response.text.trim();
  }

  if (typeof response?.output_text === "string") {
    return response.output_text.trim();
  }

  const outputs = response?.outputs;

  if (Array.isArray(outputs)) {
    const textParts: string[] = [];

    for (const output of outputs) {
      if (typeof output?.text === "string") {
        textParts.push(output.text);
      }

      if (Array.isArray(output?.content)) {
        for (const content of output.content) {
          if (typeof content?.text === "string") {
            textParts.push(content.text);
          }
        }
      }
    }

    return textParts.join("\n").trim();
  }

  return "";
}

/* =========================================================
   LIMPEZA DO JSON
========================================================= */

function cleanJson(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/* =========================================================
   ENTREVISTADOR
========================================================= */

const INTERVIEW_SYSTEM = `
Você é o AEVO ESG Copilot.

Sua função é conduzir uma entrevista CURTA, natural e adaptativa
para compreender uma ideia de melhoria apresentada por um colaborador.

A entrevista NÃO deve ser uma investigação profunda.

O objetivo é obter informação suficiente para uma primeira análise
ESG e para transformar a ideia em um mini-projeto.

=========================================================
REGRA ABSOLUTA DE ABERTURA
=========================================================

NUNCA faça uma saudação.

NUNCA diga "Olá".

NUNCA diga "Oi".

NUNCA diga "Bom dia".

NUNCA diga "Boa tarde".

NUNCA diga "Boa noite".

NUNCA diga "Sou o AEVO ESG Copilot".

NUNCA diga "Estou aqui para ajudar".

NUNCA faça uma apresentação.

NUNCA diga "Vamos começar".

Comece diretamente pela pergunta.

=========================================================
OBJETIVO
=========================================================

Entenda rapidamente:

- qual é a ideia;
- qual problema ou oportunidade ela resolve;
- como a solução funcionaria de forma geral;
- quem será beneficiado ou afetado;
- qual resultado o colaborador espera.

Não tente descobrir todos os detalhes.

A entrevista serve apenas para dar contexto suficiente
para uma boa análise posterior.

=========================================================
QUANTIDADE DE PERGUNTAS
=========================================================

A entrevista deve ser CURTA.

O objetivo ideal é encerrar em aproximadamente 3 perguntas.

Pode chegar a 4 perguntas se ainda existir alguma informação
realmente importante.

Nunca passe de 5 perguntas.

NÃO faça perguntas apenas porque ainda existem detalhes
que poderiam ser descobertos.

Se a ideia já estiver suficientemente compreendida,
encerre imediatamente.

Não tente obter uma compreensão perfeita.

Não transforme a entrevista em uma investigação.

Não tente descobrir detalhes de implantação, orçamento,
fornecedores, responsáveis, cronograma ou métricas detalhadas.

Esses detalhes serão tratados posteriormente na análise.

=========================================================
REGRA DE ENCERRAMENTO
=========================================================

Se já houver informação suficiente para entender:

- a ideia;
- o problema;
- a solução;
- o resultado esperado;

encerre a entrevista.

Responda EXATAMENTE:

"${READY_MESSAGE}"

Depois disso NÃO faça outra pergunta.

=========================================================
REGRAS DA CONVERSA
=========================================================

Faça SOMENTE UMA pergunta por vez.

Faça perguntas curtas, diretas e naturais.

Analise sempre a ideia original e todo o histórico.

Nunca repita uma pergunta já respondida.

Não pergunte informações que já estejam claras.

Não faça perguntas apenas para preencher campos.

Não transforme a conversa em um formulário.

Não faça perguntas técnicas desnecessárias.

Não invente informações.

Não presuma impactos ESG sem evidências.

Não classifique a ideia como ESG durante a entrevista.

=========================================================
ADAPTAÇÃO
=========================================================

A próxima pergunta deve depender das respostas anteriores.

Não siga uma lista rígida.

Pense:

"Qual é a ÚNICA informação mais importante que falta?"

Faça essa pergunta.

Se já houver informação suficiente,
não faça outra pergunta.

=========================================================
PRIORIDADE
=========================================================

Quando houver informações faltantes, priorize:

1. O que a pessoa quer mudar ou melhorar.
2. Como a ideia funcionaria de forma geral.
3. Qual resultado ela espera.
4. Quem será beneficiado ou afetado.

Não faça perguntas secundárias se elas não forem necessárias.

=========================================================
PRIMEIRA PERGUNTA
=========================================================

Na primeira pergunta, procure entender principalmente
o problema ou oportunidade que motivou a ideia.

Não pergunte algo que já esteja claramente informado
na descrição original.

=========================================================
SEGUNDA PERGUNTA
=========================================================

Na segunda pergunta, procure entender como a solução
funcionaria na prática.

Se isso já estiver claro, pergunte pelo resultado esperado
ou por quem será beneficiado.

=========================================================
TERCEIRA PERGUNTA
=========================================================

Na terceira pergunta, procure preencher apenas a principal
lacuna que ainda impediria uma boa análise.

Se não existir uma lacuna importante,
encerre a entrevista.

=========================================================
QUARTA E QUINTA PERGUNTA
=========================================================

Só use uma quarta ou quinta pergunta se existir uma informação
REALMENTE importante que alteraria significativamente
a compreensão da ideia.

Nunca use essas perguntas para aprofundar detalhes secundários.

Se chegar à quinta pergunta, encerre obrigatoriamente depois dela.

=========================================================
LINGUAGEM
=========================================================

Use português do Brasil.

Seja:

- natural;
- simples;
- objetivo;
- amigável;
- profissional;
- fácil de entender.

As perguntas devem ser curtas.

Evite textos longos.

Evite explicar demais.

Prefira:

"Como isso funcionaria na prática?"

em vez de:

"Você poderia explicar detalhadamente a metodologia
operacional prevista para implantação dessa solução?"

=========================================================
FORMATO
=========================================================

Responda SOMENTE com a pergunta.

Não escreva títulos.

Não escreva listas.

Não explique sua lógica.

Não diga por que está fazendo a pergunta.

Não faça duas perguntas na mesma resposta.

Não faça saudações.

Não faça apresentações.

Responda sempre em português do Brasil.
`;

/* =========================================================
   ANALISADOR
========================================================= */

const ANALYZE_SYSTEM = `
Você é o analisador de ideias do AEVO ESG Copilot.

Sua função é transformar uma ideia de colaborador e uma entrevista
curta em uma análise objetiva de ESG, qualidade da ideia e prioridade.

Não faça perguntas.

Não invente dados.

Não invente valores financeiros específicos quando não houver
informação suficiente.

Quando houver incerteza, use avaliação qualitativa ou deixe claro
que se trata de estimativa.

=========================================================
ANÁLISE ESG
=========================================================

Avalie:

Ambiental:
- água;
- energia;
- materiais;
- resíduos;
- emissões;
- desperdícios.

Social:
- funcionários;
- segurança;
- acessibilidade;
- produtividade;
- capacitação;
- qualidade de vida.

Governança:
- transparência;
- controle;
- compliance;
- rastreabilidade;
- segurança;
- tomada de decisão.

Não force uma dimensão ESG quando ela não estiver presente.

Uma ideia pode ter mais de uma dimensão relevante.

=========================================================
QUALIDADE DA IDEIA
=========================================================

Avalie a qualidade da ideia considerando:

- clareza do problema;
- qualidade da solução;
- viabilidade;
- impacto;
- inovação;
- maturidade.

Cada critério deve receber uma nota de 0 a 10.

A soma deve ser de 0 a 60.

Classificação:

EXCELLENT = 51 a 60
GOOD = 41 a 50
FAIR = 21 a 40
LOW = 0 a 20

=========================================================
PRIORIDADE
=========================================================

Avalie a prioridade estratégica de 0 a 100.

Considere:

- impacto;
- urgência;
- alinhamento ESG;
- quantidade de pessoas afetadas;
- potencial de melhoria;
- viabilidade.

Classificação:

EXCELLENT = 81 a 100
GOOD = 61 a 80
FAIR = 31 a 60
LOW = 0 a 30

=========================================================
PRÓXIMOS PASSOS
=========================================================

Crie uma sequência prática para transformar a ideia em projeto.

Não limite a resposta a dois ou três passos.

Quando fizer sentido, inclua:

- validação inicial;
- levantamento;
- avaliação de viabilidade;
- planejamento;
- aprovação;
- orçamento;
- desenvolvimento ou aquisição;
- implantação;
- testes;
- treinamento;
- acompanhamento;
- medição;
- melhoria contínua.

Não force etapas que não façam sentido.

Cada passo deve ser curto e acionável.

=========================================================
RESUMO
=========================================================

Seja objetivo.

Não escreva textos longos.

O resultado deve ser fácil de entender por um colaborador
e útil para uma equipe de gestão.

=========================================================
IMPORTANTE
=========================================================

O JSON precisa seguir EXATAMENTE a estrutura solicitada.

idea_score e priority_score NÃO são números simples.

Eles precisam ser OBJETOS completos.
`;

/* =========================================================
   PROVIDER
========================================================= */

export const geminiProvider: AIProvider = {
  /* =======================================================
     PRÓXIMA PERGUNTA
  ======================================================= */

  async nextTurn({
    ideaText,
    answers,
  }: ChatTurnRequest): Promise<ChatTurnResponse> {
    const idea = String(ideaText ?? "").trim();

    if (!idea) {
      throw new Error("A ideia do colaborador não foi informada.");
    }

    /*
     * Proteção absoluta:
     * depois de 5 respostas não chamamos mais o Gemini.
     */
    if (answers.length >= MAX_INTERVIEW_QUESTIONS) {
      return {
        type: "ready",
        text: READY_MESSAGE,
      };
    }

    const sessionKey = getSessionKey(idea);

    const previousInteractionId =
      interactionStore.get(sessionKey);

    const questionNumber = answers.length + 1;

    const conversationHistory =
      answers.length > 0
        ? answers
            .map(
              (answer, index) =>
                `Resposta ${index + 1}: ${String(answer)
                  .replace(/\s+/g, " ")
                  .trim()}`
            )
            .join("\n")
        : "Nenhuma resposta anterior.";

    let input: string;

    if (!previousInteractionId) {
      input = `
IDEIA ORIGINAL:

${idea}

HISTÓRICO:

Nenhuma resposta anterior.

Esta é a primeira pergunta.

Faça somente UMA pergunta curta.

Priorize entender o problema ou oportunidade.

Se o problema já estiver claro na ideia,
pergunte como a solução funcionaria.

Não pergunte sobre orçamento, fornecedores,
cronograma ou detalhes técnicos.

A entrevista deve ser curta,
idealmente terminando em aproximadamente
${IDEAL_INTERVIEW_QUESTIONS} perguntas.

Pergunta atual: ${questionNumber}.
`;
    } else {
      input = `
IDEIA ORIGINAL:

${idea}

HISTÓRICO COMPLETO:

${conversationHistory}

O colaborador acabou de responder.

Analise todo o histórico.

Primeiro determine se já é possível compreender
suficientemente:

- a ideia;
- o problema;
- a solução;
- o resultado esperado;
- quem será beneficiado ou afetado.

Se SIM, responda EXATAMENTE:

"${READY_MESSAGE}"

Se NÃO, faça SOMENTE UMA pergunta curta
sobre a informação mais importante que ainda falta.

Não aprofunde detalhes secundários.

Não pergunte sobre orçamento, fornecedores,
cronograma, métricas ou implementação detalhada.

A entrevista deve normalmente terminar
por volta da terceira pergunta.

Pergunta atual: ${questionNumber}.

Não faça saudação.
Não faça apresentação.
Não explique sua lógica.
`;
    }

    const response = await createInteraction({
      input,
      systemInstruction: INTERVIEW_SYSTEM,
      previousInteractionId,
    });

    if (response?.id) {
      interactionStore.set(sessionKey, response.id);
    }

    const text = extractText(response);

    if (!text) {
      throw new Error(
        "O Gemini retornou uma resposta vazia durante a entrevista."
      );
    }

    const cleanText = text
      .replace(/^["']|["']$/g, "")
      .trim();

    if (cleanText === READY_MESSAGE) {
      return {
        type: "ready",
        text: READY_MESSAGE,
      };
    }

    return {
      type: "question",
      text: cleanText,
    };
  },

  /* =======================================================
     ANÁLISE
  ======================================================= */

  async analyze({
    ideaText,
    answers,
  }: AnalyzeRequest): Promise<AnalysisResult> {
    const idea = String(ideaText ?? "").trim();

    if (!idea) {
      throw new Error("A ideia do colaborador não foi informada.");
    }

    const history =
      answers.length > 0
        ? answers
            .map(
              (answer, index) =>
                `Resposta ${index + 1}: ${String(answer)
                  .replace(/\s+/g, " ")
                  .trim()}`
            )
            .join("\n")
        : "Nenhuma resposta fornecida.";

    const prompt = `
IDEIA ORIGINAL DO COLABORADOR:

${idea}

HISTÓRICO DA ENTREVISTA:

${history}

Analise a ideia com base nas informações fornecidas.

Retorne SOMENTE JSON válido.

Use EXATAMENTE esta estrutura:

{
  "status": "completed",

  "potential_esg": "HIGH",

  "dimensions": {
    "environmental": {
      "level": "NOT_IDENTIFIED",
      "justification": ""
    },
    "social": {
      "level": "NOT_IDENTIFIED",
      "justification": ""
    },
    "governance": {
      "level": "NOT_IDENTIFIED",
      "justification": ""
    }
  },

  "main_dimension": "environmental",

  "idea_score": {
    "total": 0,
    "level": "LOW",
    "breakdown": {
      "problem": 0,
      "solution": 0,
      "feasibility": 0,
      "impact": 0,
      "innovation": 0,
      "maturity": 0
    },
    "strengths": [],
    "weaknesses": [],
    "recommendations": []
  },

  "priority_score": {
    "total": 0,
    "level": "LOW",
    "justification": ""
  },

  "theme": "",

  "summary": "",

  "benefits": [],

  "areas": [],

  "next_steps": [],

  "mini_project": {
    "title": "",
    "description": ""
  }
}

=========================================================
REGRAS DOS SCORES
=========================================================

idea_score.breakdown:

problem: 0-10
solution: 0-10
feasibility: 0-10
impact: 0-10
innovation: 0-10
maturity: 0-10

idea_score.total deve ser exatamente a soma
dos seis valores.

idea_score.level:

EXCELLENT = 51-60
GOOD = 41-50
FAIR = 21-40
LOW = 0-20

priority_score.total:

0-100.

priority_score.level:

EXCELLENT = 81-100
GOOD = 61-80
FAIR = 31-60
LOW = 0-30

=========================================================
REGRAS ESG
=========================================================

potential_esg:

HIGH | MEDIUM | LOW

dimensions.level:

HIGH | MEDIUM | LOW | NOT_IDENTIFIED

main_dimension:

environmental | social | governance

Não invente impacto ESG.

Se uma dimensão não tiver evidência suficiente,
use NOT_IDENTIFIED.

=========================================================
PRÓXIMOS PASSOS
=========================================================

Crie vários passos quando fizer sentido.

Os passos devem levar a ideia desde a validação
até a possível implantação e acompanhamento.

Não escreva textos enormes.

Cada passo deve ser objetivo e acionável.

=========================================================
FORMATO
=========================================================

Não use markdown.

Não use blocos de código.

Não escreva explicações antes ou depois do JSON.

Retorne SOMENTE o JSON.
`;

    const response = await createInteraction({
      input: prompt,
      systemInstruction: ANALYZE_SYSTEM,
      json: true,
    });

    const raw = extractText(response);

    if (!raw) {
      throw new Error(
        "O Gemini retornou uma análise vazia."
      );
    }

    const cleaned = cleanJson(raw);

    try {
      const parsed = JSON.parse(cleaned) as AnalysisResult;

      /*
       * Validações defensivas.
       * Isso impede que um JSON incompleto siga silenciosamente
       * para o restante da aplicação.
       */

      if (parsed.status !== "completed") {
        throw new Error("status inválido.");
      }

      if (!parsed.idea_score) {
        throw new Error(
          "idea_score não foi retornado pelo Gemini."
        );
      }

      if (
        typeof parsed.idea_score.total !== "number" ||
        !parsed.idea_score.breakdown
      ) {
        throw new Error(
          "idea_score possui formato inválido."
        );
      }

      if (!parsed.priority_score) {
        throw new Error(
          "priority_score não foi retornado pelo Gemini."
        );
      }

      if (
        typeof parsed.priority_score.total !== "number"
      ) {
        throw new Error(
          "priority_score possui formato inválido."
        );
      }

      /*
       * Garante que o total do idea_score seja coerente
       * mesmo se a IA tiver cometido pequena inconsistência.
       */
      const breakdown = parsed.idea_score.breakdown;

      const calculatedTotal =
        Number(breakdown.problem || 0) +
        Number(breakdown.solution || 0) +
        Number(breakdown.feasibility || 0) +
        Number(breakdown.impact || 0) +
        Number(breakdown.innovation || 0) +
        Number(breakdown.maturity || 0);

      parsed.idea_score.total = calculatedTotal;

      /*
       * Limites defensivos.
       */
      parsed.priority_score.total = Math.max(
        0,
        Math.min(
          100,
          Number(parsed.priority_score.total)
        )
      );

      parsed.idea_score.total = Math.max(
        0,
        Math.min(
          60,
          Number(parsed.idea_score.total)
        )
      );

      return parsed;
    } catch (error) {
      console.error(
        "[geminiProvider] JSON inválido ou incompleto:",
        {
          error,
          raw,
          cleaned,
        }
      );

      throw new Error(
        "O Gemini retornou uma análise em formato inválido."
      );
    }
  },
};