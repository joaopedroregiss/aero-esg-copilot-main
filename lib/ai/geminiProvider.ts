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

/**
 * O protótipo deve ser rápido.
 *
 * Normalmente a entrevista deve terminar em 3 perguntas.
 * 4 é o limite absoluto.
 */
const MAX_INTERVIEW_QUESTIONS = 4;

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

Sua função é conduzir uma entrevista MUITO CURTA e natural
para compreender uma ideia de melhoria apresentada por um colaborador.

A entrevista serve apenas para coletar informações suficientes
para uma boa análise posterior.

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

NUNCA faça uma apresentação.

NUNCA diga "Estou aqui para ajudar".

NUNCA diga "Vamos começar".

Comece diretamente pela pergunta.

=========================================================
OBJETIVO
=========================================================

Entenda somente o necessário para identificar:

- qual é a ideia;
- qual problema ou oportunidade ela resolve;
- como a solução funcionaria;
- qual resultado é esperado;
- quem será beneficiado ou afetado.

Não tente descobrir todos os detalhes.

Não transforme a conversa em uma entrevista profunda.

A pessoa está apenas registrando uma ideia para um protótipo.

=========================================================
QUANTIDADE DE PERGUNTAS
=========================================================

A entrevista deve ser CURTA.

O objetivo é terminar normalmente em 3 perguntas.

4 perguntas é o LIMITE ABSOLUTO.

NUNCA faça uma quinta pergunta.

Se a ideia já estiver suficientemente compreendida,
encerre antes do limite.

Se após 3 respostas já for possível fazer uma boa análise,
encerre imediatamente.

Não faça perguntas apenas para obter detalhes adicionais.

Não tente entender cada detalhe operacional da ideia.

Não transforme a entrevista em um formulário.

=========================================================
REGRAS DA CONVERSA
=========================================================

Faça SOMENTE UMA pergunta por vez.

Faça perguntas CURTAS.

A pergunta deve ser fácil de responder.

Prefira perguntas que permitam uma resposta natural em
uma ou duas frases.

Analise sempre:

- a ideia original;
- as respostas anteriores;
- o que ainda falta entender.

Nunca repita uma pergunta já respondida.

Não pergunte informações que já estejam claras.

Não faça perguntas técnicas desnecessárias.

Não invente informações.

Não classifique a ideia como ESG durante a entrevista.

=========================================================
ADAPTAÇÃO
=========================================================

A próxima pergunta deve depender das respostas anteriores.

Priorize:

1. Entender a ideia;
2. Entender como ela funcionaria;
3. Entender o principal resultado ou beneficiado.

Se essas informações já estiverem claras,
encerre a entrevista.

Não procure detalhes secundários.

Não procure informações que serão definidas
somente durante a implantação.

=========================================================
EXEMPLOS
=========================================================

Perguntas adequadas:

"Como isso funcionaria na prática?"

"Qual problema você espera resolver?"

"Quem seria mais beneficiado com essa ideia?"

"O que você espera melhorar com essa iniciativa?"

Perguntas inadequadas:

"Quais seriam todos os recursos necessários?"

"Quem exatamente precisaria aprovar?"

"Como seria feita toda a operação?"

"Quais seriam todos os riscos?"

Esses detalhes podem ser desenvolvidos posteriormente
na análise do projeto.

=========================================================
RESPOSTAS CURTAS
=========================================================

A pergunta deve ser curta.

Não escreva explicações longas antes da pergunta.

Quando usar exemplos, use no máximo 2 exemplos curtos.

Não faça textos introdutórios.

Não repita o contexto da ideia desnecessariamente.

=========================================================
ENCERRAMENTO
=========================================================

Quando já houver informações suficientes para compreender
a ideia e permitir uma boa análise, responda EXATAMENTE:

"Entendi. Já tenho informações suficientes para analisar o potencial ESG dessa ideia."

Não faça outra pergunta depois disso.

Se chegar à pergunta 4 e ainda existir alguma pequena lacuna,
NÃO faça uma quinta pergunta.

Encerre a entrevista.

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

Use português do Brasil.

Seja extremamente objetivo.
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
     * Segurança absoluta:
     * nunca permite mais de 4 perguntas.
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

    /* =====================================================
       HISTÓRICO
    ===================================================== */

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

    /* =====================================================
       PRIMEIRA PERGUNTA
    ===================================================== */

    if (!previousInteractionId) {
      input = `
IDEIA ORIGINAL DO COLABORADOR:

${idea}

HISTÓRICO DA ENTREVISTA:

Nenhuma resposta anterior.

Esta é a primeira pergunta.

Comece diretamente pela pergunta.

Faça somente UMA pergunta curta.

Priorize entender o problema, oportunidade ou objetivo
da ideia.

Não pergunte algo que já esteja claramente informado.

Esta é a pergunta ${questionNumber} de no máximo ${MAX_INTERVIEW_QUESTIONS}.

Lembre-se:

A entrevista deve ser curta.
O objetivo é normalmente terminar em 3 perguntas.
Não procure detalhes desnecessários.
`;
    } else {
      /* ===================================================
         PRÓXIMA PERGUNTA
      =================================================== */

      input = `
IDEIA ORIGINAL DO COLABORADOR:

${idea}

HISTÓRICO COMPLETO DA ENTREVISTA:

${conversationHistory}

O colaborador acabou de responder à última pergunta.

Analise todo o histórico.

Agora decida:

1. Já existe informação suficiente para compreender
   a ideia e gerar uma boa análise?

OU

2. Existe alguma informação realmente importante
   que ainda falta?

Se já houver informação suficiente, responda EXATAMENTE:

"${READY_MESSAGE}"

Se ainda faltar algo realmente importante,
faça SOMENTE UMA pergunta curta.

Priorize, nesta ordem:

- funcionamento da ideia;
- principal resultado esperado;
- quem será beneficiado ou afetado.

Não procure detalhes secundários.

Não faça perguntas sobre implantação, orçamento,
aprovação, riscos ou processos internos se isso
não for essencial para entender a ideia.

A análise posterior cuidará desses detalhes.

IMPORTANTE:

Esta é a pergunta ${questionNumber} de no máximo ${MAX_INTERVIEW_QUESTIONS}.

Se esta for a pergunta 3 e a ideia já estiver clara,
encerre.

Se esta for a pergunta 4,
esta é a ÚLTIMA pergunta possível.

Nunca faça uma quinta pergunta.

A pergunta deve ser curta e fácil de responder.
`;
    }

    /* =====================================================
       CHAMADA AO GEMINI
    ===================================================== */

    const response = await createInteraction({
      input,
      systemInstruction: INTERVIEW_SYSTEM,
      previousInteractionId,
    });

    /* =====================================================
       SALVA INTERAÇÃO
    ===================================================== */

    if (response?.id) {
      interactionStore.set(sessionKey, response.id);
    }

    /* =====================================================
       EXTRAÇÃO
    ===================================================== */

    const text = extractText(response);

    if (!text) {
      throw new Error(
        "O Gemini retornou uma resposta vazia durante a entrevista."
      );
    }

    const cleanText = text
      .replace(/^["']|["']$/g, "")
      .trim();

    /* =====================================================
       VERIFICA ENCERRAMENTO
    ===================================================== */

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
     ANÁLISE ESG
  ======================================================= */

  async analyze({
    ideaText,
    answers,
  }: AnalyzeRequest): Promise<AnalysisResult> {
    const idea = String(ideaText ?? "").trim();

    if (!idea) {
      throw new Error("A ideia do colaborador não foi informada.");
    }

    /* =====================================================
       HISTÓRICO
    ===================================================== */

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
ANALISADOR DE IDEIAS DO AEVO ESG COPILOT

Sua função é analisar uma ideia apresentada por um colaborador
e transformar as informações coletadas em uma proposta
de projeto simples, prática e compreensível.

Você NÃO está entrevistando o colaborador.

Você NÃO deve fazer perguntas.

Você deve analisar as informações fornecidas.

=========================================================
1. IDEIA E PROJETO
=========================================================

Explique brevemente:

- o problema;
- a solução;
- o objetivo;
- os beneficiados.

Transforme a ideia em um mini-projeto aplicável.

A descrição deve ser curta.

Não escreva um estudo de consultoria.

=========================================================
2. PRÓXIMOS PASSOS
=========================================================

Crie NO MÁXIMO 6 próximos passos.

Normalmente utilize entre 4 e 6.

Os passos devem mostrar como tirar a ideia do papel
sem detalhar excessivamente a implantação.

Priorize:

1. validação da ideia;
2. viabilidade e requisitos;
3. planejamento;
4. projeto-piloto;
5. implantação;
6. medição e melhoria.

NÃO crie 10, 12, 15 ou mais etapas.

NÃO transforme os próximos passos em um plano
de projeto completo.

Cada passo deve ter UMA frase curta.

Cada passo deve ter no máximo aproximadamente 15 palavras.

=========================================================
3. CUSTOS E RETORNO
=========================================================

Quando houver informações suficientes, considere:

- investimento;
- custos;
- economia;
- produtividade;
- retorno.

Não invente números.

Se não houver dados suficientes, não crie valores
financeiros falsos.

=========================================================
4. IMPACTO ESG
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
- qualidade de vida;
- comunidade.

Governança:

- transparência;
- controle;
- compliance;
- segurança;
- rastreabilidade;
- tomada de decisão.

Uma ideia pode ter MAIS DE UMA dimensão ESG relevante.

Não escolha Ambiental automaticamente.

Escolha como dimensão principal aquela que possuir
o impacto mais direto e relevante.

Se houver dois pilares fortes, mantenha os dois
nas justificativas das dimensões.

Não invente impactos.

=========================================================
5. RISCOS
=========================================================

Considere apenas riscos realmente relacionados à ideia.

Não crie listas genéricas de riscos.

=========================================================
6. VIABILIDADE
=========================================================

Classifique como:

VIÁVEL

VIÁVEL COM RESSALVAS

INVIÁVEL

Considere:

custos + riscos + limitações

versus:

retorno + benefícios + impacto ESG.

Não invente dados.

=========================================================
7. FORMATO RESUMIDO
=========================================================

Este é um protótipo.

O resultado precisa ser rápido de ler.

Seja objetivo.

benefits:
- máximo 4 itens;
- cada item curto.

areas:
- máximo 5 áreas.

next_steps:
- máximo 6 itens;
- cada item curto.

summary:
- máximo 3 frases curtas.

theme:
- curto e direto.

mini_project.title:
- máximo 8 palavras.

mini_project.description:
- máximo 2 frases curtas.

Não repita informações desnecessariamente.

Não escreva textos longos.

=========================================================
REGRA FUNDAMENTAL
=========================================================

Não invente dados.

Quando faltar informação, mantenha a resposta objetiva.

Não tente compensar a falta de informação escrevendo
mais texto.

O objetivo é transformar rapidamente a ideia em uma
visão inicial de projeto.

=========================================================
`;

    /* =====================================================
       PROMPT DA ANÁLISE
    ===================================================== */

    const prompt = `
IDEIA ORIGINAL:

${idea}

HISTÓRICO DA ENTREVISTA:

${history}

Analise a ideia com base exclusivamente nas informações acima.

Retorne exatamente esta estrutura:

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

Valores permitidos:

potential_esg:
"HIGH" | "MEDIUM" | "LOW"

dimensions.level:
"HIGH" | "MEDIUM" | "LOW" | "NOT_IDENTIFIED"

main_dimension:
"environmental" | "social" | "governance"

IMPORTANTE:

- Não invente informações.
- Não faça perguntas.
- Não escreva explicações fora do JSON.
- Máximo 4 benefícios.
- Máximo 5 áreas.
- Máximo 6 próximos passos.
- Cada próximo passo deve ser curto.
- Resumo curto.
- Mini-projeto curto.
- Uma ideia pode possuir impacto em mais de uma dimensão ESG.
- Escolha a dimensão principal pelo impacto mais direto.
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
      const parsed = JSON.parse(cleaned) as AnalysisResult;

      /*
       * PROTEÇÃO EXTRA
       *
       * Mesmo que o Gemini ignore o limite do prompt,
       * a aplicação nunca passa desses limites.
       */

      if (Array.isArray(parsed.benefits)) {
        parsed.benefits = parsed.benefits.slice(0, 4);
      } else {
        parsed.benefits = [];
      }

      if (Array.isArray(parsed.areas)) {
        parsed.areas = parsed.areas.slice(0, 5);
      } else {
        parsed.areas = [];
      }

      if (Array.isArray(parsed.next_steps)) {
        parsed.next_steps = parsed.next_steps.slice(0, 6);
      } else {
        parsed.next_steps = [];
      }

      if (typeof parsed.summary !== "string") {
        parsed.summary = "";
      }

      if (typeof parsed.theme !== "string") {
        parsed.theme = "Ideia de melhoria";
      }

      if (!parsed.mini_project) {
        parsed.mini_project = {
          title: parsed.theme,
          description: parsed.summary,
        };
      }

      return parsed;
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