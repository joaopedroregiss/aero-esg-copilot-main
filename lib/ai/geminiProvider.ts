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

const MAX_INTERVIEW_QUESTIONS = 8;

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
   ENTREVISTADOR
========================================================= */

const INTERVIEW_SYSTEM = `
Você é o AEVO ESG Copilot.

Sua função é conduzir uma entrevista curta, natural e adaptativa
para compreender uma ideia de melhoria apresentada por um colaborador.

A entrevista já está começando.

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

Compreenda o suficiente para entender:

- qual é a ideia;
- qual problema ou oportunidade ela resolve;
- onde isso acontece;
- como funciona atualmente;
- como a solução pretende funcionar;
- quem será beneficiado ou afetado;
- qual resultado o colaborador espera.

Não tente descobrir todos os detalhes.

A entrevista deve coletar somente informações relevantes
para compreender a ideia.

=========================================================
REGRAS DA CONVERSA
=========================================================

Faça SOMENTE UMA pergunta por vez.

Faça perguntas curtas, diretas e naturais.

Analise sempre a ideia original e todo o histórico da conversa.

Nunca repita uma pergunta já respondida.

Não pergunte informações que já estejam claras.

Não faça perguntas apenas para preencher campos.

Não transforme a conversa em um formulário.

Não faça perguntas sobre valores, métricas ou dados que
precisariam ser pesquisados posteriormente.

Não faça perguntas técnicas desnecessárias.

Não invente informações.

Não presuma impactos ESG sem evidências.

Não classifique a ideia como ESG durante a entrevista.

=========================================================
ADAPTAÇÃO
=========================================================

A próxima pergunta deve depender das respostas anteriores.

Não siga uma lista fixa de perguntas.

Se o colaborador já explicou o problema, avance para entender
como a solução funcionaria.

Se já explicou como a solução funcionaria, procure entender
o resultado esperado ou algum ponto importante que ainda esteja
pouco claro.

Se já houver informação suficiente, encerre a entrevista.

=========================================================
PRIORIDADE
=========================================================

Quando houver várias informações faltantes, priorize:

1. Compreensão da ideia.
2. Problema ou oportunidade.
3. Funcionamento da solução.
4. Resultado esperado.
5. Quem será beneficiado ou afetado.
6. Algum ponto crítico que possa alterar a compreensão da ideia.

Não faça perguntas secundárias se elas não forem importantes.

=========================================================
AJUDA AO COLABORADOR
=========================================================

Quando uma pergunta puder ser difícil de responder,
você pode apresentar exemplos curtos.

Exemplo:

"O que você espera melhorar com essa ideia?

Pode ser economia de água, redução de custos, menos desperdício
ou outra melhoria."

Os exemplos são apenas orientativos.

Não limite a resposta aos exemplos.

Não use exemplos em todas as perguntas.

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

Evite termos técnicos de ESG quando não forem necessários.

Prefira:

"Como isso funcionaria na prática?"

em vez de:

"Qual seria a metodologia operacional da solução?"

=========================================================
ENCERRAMENTO
=========================================================

Quando já houver informações suficientes para compreender
a ideia e permitir uma boa análise, responda EXATAMENTE:

"Entendi. Já tenho informações suficientes para analisar o potencial ESG dessa ideia."

Não faça outra pergunta depois disso.

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
IDEIA ORIGINAL DO COLABORADOR:

${idea}

HISTÓRICO DA ENTREVISTA:

Nenhuma resposta anterior.

Esta é a primeira pergunta da entrevista.

IMPORTANTE:

Não faça saudação.
Não faça apresentação.
Não diga quem você é.
Não diga "Olá".
Não diga "Oi".
Não diga que está aqui para ajudar.

Comece diretamente pela pergunta.

Faça somente UMA pergunta que ajude a compreender
melhor a ideia.

Não pergunte algo que já esteja claramente informado
na descrição da ideia.

Esta é a pergunta ${questionNumber} de no máximo ${MAX_INTERVIEW_QUESTIONS}.
`;
    } else {
      input = `
IDEIA ORIGINAL DO COLABORADOR:

${idea}

HISTÓRICO COMPLETO DA ENTREVISTA:

${conversationHistory}

O colaborador acabou de responder à última pergunta.

Analise TODO o histórico acima.

Determine qual é a informação mais importante que ainda
falta para compreender a ideia.

Faça SOMENTE UMA pergunta.

Não repita informações já fornecidas.

Não pergunte algo cuja resposta já possa ser inferida
com segurança a partir do histórico.

Não faça saudação.

Não faça apresentação.

Não diga "Olá".

Não diga quem você é.

Se já houver informações suficientes para realizar
uma boa análise, encerre a entrevista respondendo
EXATAMENTE:

"${READY_MESSAGE}"

Esta é a pergunta ${questionNumber} de no máximo ${MAX_INTERVIEW_QUESTIONS}.
`;
    }

    const response = await createInteraction({
      input,
      systemInstruction: INTERVIEW_SYSTEM,
      previousInteractionId,
    });

    if (response?.id) {
      interactionStore.set(
        sessionKey,
        response.id
      );
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

    /* =====================================================
       SISTEMA DE ANÁLISE
    ===================================================== */

    const ANALYZE_SYSTEM = `
Você é o avaliador estratégico de ideias do AEVO ESG Copilot.

Sua função é analisar uma ideia apresentada por um colaborador
e avaliar DUAS coisas diferentes:

1. O potencial ESG da ideia.
2. A qualidade e o potencial real da ideia.

IMPORTANTE:

Uma ideia pode ter forte relação com ESG e ainda assim ser
uma ideia ruim, genérica, inviável ou pouco madura.

Portanto:

ESG NÃO significa automaticamente uma ideia boa.

Avalie a qualidade da ideia de forma independente do ESG.

=========================================================
1. QUALIDADE DA IDEIA
=========================================================

Avalie a ideia em seis critérios.

PROBLEMA / OPORTUNIDADE — 0 a 20

Avalie:

- se existe um problema ou oportunidade real;
- se está bem definido;
- se é relevante;
- se a ideia está atacando uma necessidade concreta.

SOLUÇÃO — 0 a 20

Avalie:

- se a solução responde ao problema;
- se existe uma lógica clara entre problema e solução;
- se a proposta é específica;
- se não é apenas uma sugestão genérica.

VIABILIDADE — 0 a 20

Avalie:

- possibilidade de execução;
- complexidade;
- recursos necessários;
- dependências;
- limitações conhecidas.

Não presuma que uma ideia é viável apenas porque parece simples.

IMPACTO — 0 a 20

Avalie o potencial de:

- economia;
- produtividade;
- redução de desperdícios;
- redução de riscos;
- melhoria de processos;
- melhoria para pessoas;
- geração de valor.

INOVAÇÃO — 0 a 10

Avalie:

- novidade;
- diferenciação;
- melhoria significativa em relação ao processo atual.

Uma ideia não precisa ser revolucionária para receber uma
boa nota.

MATURIDADE — 0 a 10

Avalie:

- clareza;
- nível de desenvolvimento;
- existência de objetivo;
- entendimento de como colocar a ideia em prática.

=========================================================
2. SCORE DA IDEIA
=========================================================

Some exatamente:

problema + solução + viabilidade + impacto + inovação + maturidade.

O resultado deve estar entre 0 e 100.

Classifique:

90–100 = EXCELLENT

75–89 = GOOD

60–74 = FAIR

0–59 = LOW

IMPORTANTE:

Não dê notas altas apenas porque a ideia parece positiva.

Uma ideia genérica deve receber nota baixa mesmo que tenha
relação com ESG.

=========================================================
3. PONTOS FORTES E FRACOS
=========================================================

Liste os principais pontos fortes da ideia.

Liste também os principais pontos que reduzem sua qualidade.

Se a ideia for fraca, explique claramente por quê.

Não seja excessivamente positivo.

O objetivo é ajudar a empresa a tomar uma decisão melhor.

=========================================================
4. RECOMENDAÇÕES
=========================================================

Liste ações concretas que poderiam melhorar a ideia.

As recomendações devem responder:

"O que precisa mudar para essa ideia se tornar uma proposta
mais forte e executável?"

=========================================================
5. SCORE ESG
=========================================================

Avalie separadamente:

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
- segurança;
- controle;
- compliance;
- rastreabilidade;
- tomada de decisão.

Não invente impactos.

Não considere uma ideia ESG apenas porque utiliza palavras
como sustentabilidade, ambiente ou responsabilidade.

Procure evidências na ideia e nas respostas.

=========================================================
6. PRIORIDADE
=========================================================

Calcule um score de prioridade entre 0 e 100.

A prioridade deve considerar:

- qualidade da ideia;
- impacto potencial;
- viabilidade;
- potencial ESG;
- relevância estratégica.

Uma ideia com ESG alto mas qualidade baixa NÃO deve receber
prioridade alta automaticamente.

Classifique:

90–100 = EXCELLENT

75–89 = GOOD

60–74 = FAIR

0–59 = LOW

Explique em uma frase por que a ideia recebeu essa prioridade.

=========================================================
7. PROJETO
=========================================================

Explique brevemente:

- o problema;
- a solução;
- o objetivo;
- os beneficiados.

Depois transforme a ideia em um projeto aplicável.

Os próximos passos devem representar o processo de implantação
da ideia.

Não limite os próximos passos a apenas 2 ou 3 etapas.

Quando fizer sentido, considere:

1. validação inicial;
2. avaliação de viabilidade;
3. planejamento;
4. aprovação;
5. orçamento;
6. aquisição ou contratação;
7. preparação;
8. desenvolvimento ou instalação;
9. testes;
10. ajustes;
11. treinamento;
12. implantação;
13. acompanhamento;
14. medição;
15. melhoria contínua.

NÃO force todas as etapas.

Use somente as que fizerem sentido.

=========================================================
8. REGRA DE EVIDÊNCIA
=========================================================

Não invente dados.

Quando uma conclusão for baseada em uma inferência,
deixe isso claro.

Não invente valores financeiros.

Não invente métricas.

Não invente impactos ESG.

=========================================================
9. TOM DA AVALIAÇÃO
=========================================================

Seja:

- objetivo;
- crítico;
- justo;
- profissional;
- construtivo.

Não tente agradar o colaborador.

A finalidade é identificar quais ideias realmente merecem
ser priorizadas pela empresa.

=========================================================
10. FORMATO
=========================================================

Retorne SOMENTE JSON válido.

Não use Markdown.

Não coloque texto antes ou depois do JSON.
`;

    /* =====================================================
       PROMPT DA ANÁLISE
    ===================================================== */

    const prompt = `
IDEIA ORIGINAL:

${idea}

HISTÓRICO DA ENTREVISTA:

${history}

Analise a ideia usando exclusivamente essas informações.

Retorne exatamente esta estrutura JSON:

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

idea_score.breakdown.problem:
0 a 20

idea_score.breakdown.solution:
0 a 20

idea_score.breakdown.feasibility:
0 a 20

idea_score.breakdown.impact:
0 a 20

idea_score.breakdown.innovation:
0 a 10

idea_score.breakdown.maturity:
0 a 10

idea_score.total deve ser exatamente a soma dos seis critérios.

idea_score.level:

90–100 = "EXCELLENT"
75–89 = "GOOD"
60–74 = "FAIR"
0–59 = "LOW"

priority_score.total:
0 a 100.

priority_score.level:

90–100 = "EXCELLENT"
75–89 = "GOOD"
60–74 = "FAIR"
0–59 = "LOW"

Valores permitidos:

potential_esg:
"HIGH" | "MEDIUM" | "LOW"

dimensions.level:
"HIGH" | "MEDIUM" | "LOW" | "NOT_IDENTIFIED"

main_dimension:
"environmental" | "social" | "governance"

Não invente informações.
Não invente números financeiros.
Não invente impactos.
Não coloque comentários no JSON.
`;

    /* =====================================================
       CHAMADA AO GEMINI
    ===================================================== */

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

    /* =====================================================
       LIMPEZA DO JSON
    ===================================================== */

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    /* =====================================================
       PARSE
    ===================================================== */

    try {
      const result = JSON.parse(cleaned) as AnalysisResult;

      /* ===================================================
         VALIDAÇÃO BÁSICA DOS SCORES
      =================================================== */

      if (
        !result.idea_score ||
        !result.priority_score
      ) {
        throw new Error(
          "A análise não retornou os scores obrigatórios."
        );
      }

      const breakdown = result.idea_score.breakdown;

      const calculatedTotal =
        breakdown.problem +
        breakdown.solution +
        breakdown.feasibility +
        breakdown.impact +
        breakdown.innovation +
        breakdown.maturity;

      if (
        calculatedTotal !== result.idea_score.total
      ) {
        console.warn(
          "[geminiProvider] Score inconsistente. Recalculando total."
        );

        result.idea_score.total = calculatedTotal;
      }

      result.idea_score.total = Math.max(
        0,
        Math.min(100, result.idea_score.total)
      );

      result.priority_score.total = Math.max(
        0,
        Math.min(100, result.priority_score.total)
      );

      return result;
    } catch (error) {
      console.error(
        "[geminiProvider] JSON inválido retornado pelo Gemini:",
        {
          raw,
          error,
        }
      );

      throw new Error(
        "O Gemini retornou uma análise em formato inválido."
      );
    }
  },
};