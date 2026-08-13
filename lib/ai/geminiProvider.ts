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

    /* =====================================================
       HISTÓRICO COMPLETO
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
      /* ===================================================
         PRÓXIMA PERGUNTA
      =================================================== */

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
      interactionStore.set(
        sessionKey,
        response.id
      );
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
ANALISADOR DE VIABILIDADE DE IDEIAS DO AEVO ESG

Sua função é analisar uma ideia apresentada por um colaborador
e transformar as informações coletadas durante a entrevista
em uma proposta de projeto aplicável.

Você NÃO está entrevistando o colaborador.

Você NÃO deve fazer perguntas ao colaborador.

Você deve analisar as informações fornecidas.

=========================================================
1. IDEIA E PROJETO
=========================================================

Explique brevemente:

- o problema;
- a solução;
- o objetivo;
- os beneficiados.

Depois transforme a ideia em um projeto aplicável.

IMPORTANTE:

Os próximos passos devem representar o processo completo
de implantação da ideia na empresa.

NÃO limite os próximos passos a apenas 2 ou 3 etapas.

Quando a natureza da ideia exigir, descreva desde o início
da implantação até a operação e acompanhamento da solução.

Considere, quando aplicável:

1. entendimento e validação inicial;
2. avaliação de viabilidade;
3. planejamento;
4. definição da solução;
5. aprovação;
6. orçamento;
7. contratação ou aquisição;
8. preparação da infraestrutura;
9. instalação ou desenvolvimento;
10. testes;
11. ajustes;
12. treinamento dos envolvidos;
13. implantação;
14. acompanhamento inicial;
15. medição dos resultados;
16. manutenção e melhoria contínua.

NÃO force todas essas etapas em qualquer ideia.

Use somente as fases que fizerem sentido para o projeto.

Cada etapa deve explicar:

- o que será feito;
- por que essa etapa é necessária;
- qual resultado esperado.

Os próximos passos devem ser suficientemente detalhados
para que uma pessoa consiga entender como a empresa poderia
tirar a ideia do papel.

=========================================================
2. CUSTOS E RETORNO
=========================================================

Estime os principais recursos e custos necessários.

Separe:

Investimento inicial.

Custo operacional.

Estime o valor gerado pelo projeto considerando:

- economia;
- redução de perdas;
- aumento de produtividade;
- receita adicional;
- outros benefícios financeiros relevantes.

Calcule, quando possível:

- benefício líquido;
- ROI;
- payback.

Quando houver incerteza relevante, utilize estimativas
e deixe claro que são estimativas.

=========================================================
3. IMPACTO ESG
=========================================================

Avalie os três pilares:

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

Diferencie informações comprovadas de estimativas.

=========================================================
4. RISCOS
=========================================================

Identifique os principais riscos capazes de comprometer
a implantação ou o funcionamento do projeto.

Considere:

- riscos técnicos;
- riscos operacionais;
- riscos financeiros;
- riscos legais;
- riscos de segurança;
- riscos ambientais;
- riscos sociais.

Não crie riscos genéricos sem relação com a ideia.

=========================================================
5. LEVANTAMENTOS ESSENCIAIS
=========================================================

Liste somente os dados que ainda precisam ser obtidos
e que podem alterar significativamente a decisão.

Classifique como:

Alta:
pode mudar a decisão.

Média:
melhora significativamente a precisão.

Baixa:
útil apenas para refinamento posterior.

Não inclua informações desnecessárias.

=========================================================
6. DECISÃO DE VIABILIDADE
=========================================================

Classifique como:

VIÁVEL

VIÁVEL COM RESSALVAS

INVIÁVEL

Considere:

custos + riscos + limitações

versus:

retorno + economia + impacto ESG + benefícios estratégicos.

=========================================================
7. CONCLUSÃO
=========================================================

Finalize com:

Viabilidade

Investimento

Custo operacional

Retorno

Payback

Impacto ESG

Principal risco

Próximo passo

=========================================================
REGRA FUNDAMENTAL
=========================================================

Não invente dados.

Quando não houver informação suficiente,
utilize uma estimativa razoável e identifique-a como estimativa.

A análise deve transformar a ideia em um projeto executável,
e não apenas resumir o que o colaborador escreveu.

Os próximos passos devem mostrar uma sequência lógica
desde a preparação da ideia até sua implantação,
operação e acompanhamento.

Não faça perguntas durante a análise.
`;

    /* =====================================================
       PROMPT DA ANÁLISE
    ===================================================== */

    const prompt = `
IDEIA ORIGINAL:

${idea}

HISTÓRICO DA ENTREVISTA:

${history}

Analise a ideia com base exclusivamente nas informações
acima.

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

Não invente informações para preencher campos.
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
      return JSON.parse(cleaned) as AnalysisResult;
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