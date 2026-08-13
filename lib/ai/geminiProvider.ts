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
 * - normalmente encerra em 3 perguntas;
 * - pode chegar a 4 quando ainda faltar algo importante;
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
OBJETIVO DA ENTREVISTA
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
realmente importante para compreender a ideia.

Nunca passe de 5 perguntas.

NÃO faça perguntas apenas porque ainda existem detalhes que
poderiam ser descobertos.

Se a ideia já estiver suficientemente compreendida,
ENCERRE imediatamente.

Não tente obter uma compreensão perfeita.

Não transforme a entrevista em uma investigação.

Não tente descobrir detalhes de implantação, orçamento,
fornecedores, responsáveis, cronograma ou métricas detalhadas
durante a entrevista.

Esses detalhes podem ser trabalhados posteriormente na análise.

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

"Entendi. Já tenho informações suficientes para analisar o potencial ESG dessa ideia."

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

Pense sempre:

"Qual é a ÚNICA informação mais importante que falta?"

Faça essa pergunta.

Se já houver informação suficiente,
não faça outra pergunta.

=========================================================
ORDEM DE PRIORIDADE
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
AJUDA AO COLABORADOR
=========================================================

Quando uma pergunta puder ser difícil de responder,
você pode apresentar exemplos curtos.

Exemplo:

"O que você espera melhorar com essa ideia?

Pode ser economia de água, redução de desperdício,
mais segurança ou outra melhoria."

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

    /*
     * Segurança adicional:
     * depois de 5 respostas, nunca chama a IA novamente.
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

Esta é a primeira pergunta.

Faça somente UMA pergunta curta.

Priorize entender o problema ou oportunidade que motivou
a ideia.

Se a própria descrição da ideia já explicar claramente
o problema, pergunte como a solução funcionaria.

Não faça perguntas sobre detalhes de implementação,
custos ou métricas.

Não faça saudação.
Não faça apresentação.
Não diga quem você é.

Esta é a pergunta ${questionNumber}.

O objetivo é uma entrevista curta, idealmente encerrada
em aproximadamente 3 perguntas e nunca ultrapassando 5.
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

Analise TODO o histórico.

Antes de fazer qualquer pergunta, verifique se já é possível
compreender suficientemente:

- qual é a ideia;
- qual problema ela resolve;
- como ela funcionaria;
- qual resultado é esperado;
- quem será beneficiado ou afetado.

Se essas informações já estiverem suficientemente claras,
encerre agora.

Responda EXATAMENTE:

"${READY_MESSAGE}"

IMPORTANTE:

O objetivo é uma entrevista curta.

Idealmente encerre por volta da terceira pergunta.

Não faça perguntas apenas para aprofundar detalhes.

Não tente descobrir orçamento, fornecedores, cronograma,
responsáveis, métricas ou detalhes técnicos neste momento.

Se ainda existir uma informação realmente importante,
faça SOMENTE UMA pergunta curta.

Pergunte somente aquilo que pode mudar significativamente
a compreensão da ideia.

Não repita perguntas.

Não pergunte algo cuja resposta já esteja clara.

Não faça saudação.

Não faça apresentação.

Não diga "Olá".

Não diga "Oi".

Esta é a pergunta ${questionNumber}.

Se esta for a pergunta 4, só continue se houver uma lacuna
realmente importante.

Se esta for a pergunta 5, encerre obrigatoriamente após
esta etapa e não faça outra pergunta.
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

    /*
     * Se a IA tentar continuar depois da quinta resposta,
     * o sistema força o encerramento.
     */
    if (answers.length + 1 >= MAX_INTERVIEW_QUESTIONS) {
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
     ANÁLISE ESG + SCORE DA IDEIA
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

Procure entregar, normalmente, entre 6 e 12 próximos passos
quando a ideia exigir implantação.

Cada etapa deve explicar de maneira objetiva:

- o que será feito;
- por que essa etapa é necessária;
- qual resultado esperado.

Os próximos passos devem ser suficientemente detalhados
para que uma pessoa consiga entender como a empresa poderia
tirar a ideia do papel.

=========================================================
2. QUALIDADE DA IDEIA
=========================================================

Avalie a qualidade da ideia independentemente do potencial ESG.

Uma ideia pode ter forte relação com ESG e ainda assim
ser uma ideia ruim, pouco clara ou difícil de executar.

Avalie:

- clareza do problema;
- qualidade da solução proposta;
- viabilidade;
- potencial de impacto;
- inovação;
- maturidade da ideia.

Cada critério deve receber uma nota de 0 a 10.

Use:

problem:
clareza e relevância do problema.

solution:
qualidade e coerência da solução proposta.

feasibility:
possibilidade de execução considerando as informações disponíveis.

impact:
potencial de gerar benefício relevante.

innovation:
grau de novidade ou melhoria em relação ao processo atual.

maturity:
quanto a ideia está estruturada e pronta para avançar.

Calcule:

total = soma das seis notas.

O total deve ficar entre 0 e 60.

Classificação:

EXCELLENT:
48 a 60.

GOOD:
36 a 47.

FAIR:
24 a 35.

LOW:
0 a 23.

Não aumente a nota apenas porque a ideia possui impacto ESG.

Uma ideia ESG forte pode ter score de qualidade baixo.

=========================================================
3. PRIORIDADE ESTRATÉGICA
=========================================================

Calcule uma prioridade geral de 0 a 100.

Considere:

- qualidade da ideia;
- potencial ESG;
- impacto para a empresa;
- viabilidade;
- relevância estratégica;
- capacidade de gerar benefício.

Não confunda prioridade com potencial ESG.

Uma ideia pode ter potencial ESG alto e prioridade baixa
se for difícil, cara ou pouco relevante.

Classificação:

EXCELLENT:
80 a 100.

GOOD:
60 a 79.

FAIR:
40 a 59.

LOW:
0 a 39.

Explique brevemente o motivo da prioridade.

=========================================================
4. CUSTOS E RETORNO
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

Quando não houver dados suficientes, NÃO invente números
financeiros específicos.

Descreva quais dados seriam necessários para calcular
esses indicadores posteriormente.

=========================================================
5. IMPACTO ESG
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

Uma mesma ideia pode possuir impacto em mais de uma dimensão.

Não invente impactos.

Diferencie informações comprovadas de estimativas.

=========================================================
6. RISCOS
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
7. LEVANTAMENTOS ESSENCIAIS
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
8. DECISÃO DE VIABILIDADE
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
9. CONCLUSÃO
=========================================================

Finalize considerando:

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
utilize estimativas qualitativas e deixe claro que são estimativas.

A análise deve transformar a ideia em um projeto executável,
e não apenas resumir o que o colaborador escreveu.

Os próximos passos devem mostrar uma sequência lógica
desde a preparação da ideia até sua implantação,
operação e acompanhamento.

Não faça perguntas durante a análise.

=========================================================
IMPORTANTE SOBRE OS SCORES
=========================================================

O score da ideia NÃO deve ser igual ao potencial ESG.

O potencial ESG mede a relação da ideia com ESG.

O idea_score mede a qualidade da própria ideia.

O priority_score mede a prioridade da ideia para a empresa.

São avaliações diferentes.
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

Retorne EXATAMENTE um JSON válido com esta estrutura:

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
VALORES PERMITIDOS
=========================================================

potential_esg:

"HIGH" | "MEDIUM" | "LOW"

dimensions.level:

"HIGH" | "MEDIUM" | "LOW" | "NOT_IDENTIFIED"

main_dimension:

"environmental" | "social" | "governance"

idea_score.level:

"EXCELLENT" | "GOOD" | "FAIR" | "LOW"

priority_score.level:

"EXCELLENT" | "GOOD" | "FAIR" | "LOW"

=========================================================
REGRAS DOS SCORES
=========================================================

Cada item de idea_score.breakdown deve ser um número inteiro
entre 0 e 10:

problem
solution
feasibility
impact
innovation
maturity

idea_score.total deve ser a soma desses seis valores.

Portanto:

0 <= total <= 60

Classifique:

48-60 = EXCELLENT
36-47 = GOOD
24-35 = FAIR
0-23 = LOW

priority_score.total deve ser um número inteiro entre 0 e 100.

Classifique:

80-100 = EXCELLENT
60-79 = GOOD
40-59 = FAIR
0-39 = LOW

Não invente informações para preencher os campos.

Se a informação não estiver disponível,
faça uma avaliação conservadora.

=========================================================
PRÓXIMOS PASSOS
=========================================================

Não retorne apenas 2 ou 3 próximos passos.

Para uma ideia que envolva implantação física, tecnológica
ou mudança de processo, procure fornecer entre 6 e 12 etapas
quando houver informação suficiente.

Para ideias simples, use menos etapas.

Cada etapa deve ser prática e representar uma ação real.

=========================================================
JSON
=========================================================

Retorne SOMENTE o JSON.

Não use markdown.

Não use bloco \`\`\`json.

Não escreva explicações antes ou depois do JSON.
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
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    /* =====================================================
       PARSE
    ===================================================== */

    try {
      const parsed = JSON.parse(cleaned) as AnalysisResult;

      /*
       * Validações mínimas para evitar que uma resposta
       * incompleta da IA seja salva no banco e quebre
       * a Visão Gerencial.
       */

      if (!parsed.idea_score) {
        throw new Error(
          "A análise não retornou idea_score."
        );
      }

      if (!parsed.priority_score) {
        throw new Error(
          "A análise não retornou priority_score."
        );
      }

      if (!parsed.dimensions) {
        throw new Error(
          "A análise não retornou dimensions."
        );
      }

      if (
        !parsed.dimensions.environmental ||
        !parsed.dimensions.social ||
        !parsed.dimensions.governance
      ) {
        throw new Error(
          "A análise não retornou todas as dimensões ESG."
        );
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