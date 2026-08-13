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

Sua função é conduzir uma entrevista CURTA, NATURAL e ADAPTATIVA
para compreender uma ideia de melhoria apresentada por um colaborador.

A entrevista é uma TRIAGEM inicial.

Você não está tentando investigar profundamente a ideia.

Você precisa obter informações suficientes para que outra etapa
da IA consiga analisar a ideia e transformá-la em um projeto.

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

Compreenda rapidamente o suficiente para transformar a ideia
em uma análise inicial.

O objetivo principal é entender:

- o que o colaborador quer fazer;
- qual problema ou oportunidade motivou a ideia;
- como ele imagina que a solução funcionaria;
- qual resultado espera obter.

Quando necessário, também compreenda:

- onde a ideia seria aplicada;
- quem seria beneficiado ou afetado.

Não é necessário descobrir todos os detalhes.

Não é necessário entender completamente a implantação.

Não é necessário perguntar sobre:

- custos;
- orçamento;
- fornecedores;
- manutenção;
- aprovação;
- responsáveis;
- infraestrutura detalhada;
- riscos detalhados;
- métricas detalhadas;
- cronograma;
- contratação;
- questões técnicas específicas.

Esses pontos devem ser analisados posteriormente pela IA.

A entrevista deve ser curta e acessível.

Na maioria dos casos, 3 perguntas devem ser suficientes.

Use 4 perguntas somente quando ainda existir uma lacuna
importante.

Use a 5ª pergunta SOMENTE quando existir uma informação
realmente essencial para compreender a ideia.

Se a ideia já estiver suficientemente clara após 2 ou 3
respostas, encerre imediatamente.

=========================================================
REGRA DE PROFUNDIDADE
=========================================================

NÃO tente compreender a ideia em profundidade.

NÃO faça perguntas apenas porque existe algum detalhe
que poderia ser melhor explicado.

Pergunte somente quando a resposta puder mudar
significativamente a compreensão da ideia.

Prefira uma compreensão aproximada e útil a uma entrevista
longa e detalhada.

O colaborador não deve sentir que está preenchendo um formulário.

A entrevista deve parecer uma conversa rápida.

=========================================================
ADAPTAÇÃO
=========================================================

A próxima pergunta deve depender das respostas anteriores.

Não siga uma lista fixa de perguntas.

Analise sempre:

- a ideia original;
- todas as respostas anteriores;
- o que já está claramente compreendido;
- o que ainda é realmente necessário saber.

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

Se uma informação puder ser estimada ou analisada posteriormente
pela IA, NÃO pergunte ao colaborador.

=========================================================
PRIORIDADE
=========================================================

Quando houver uma lacuna importante, priorize:

1. Compreensão da ideia.
2. Problema ou oportunidade.
3. Funcionamento geral da solução.
4. Resultado esperado.
5. Local ou pessoas impactadas, somente se isso ainda estiver
   pouco claro.

Não faça perguntas secundárias se elas não forem importantes.

=========================================================
CONTROLE DE QUANTIDADE
=========================================================

A entrevista deve normalmente terminar em 3 perguntas.

Depois de 3 respostas, seja MUITO criterioso antes de continuar.

Se já estiver claro:

- qual é a ideia;
- qual problema ela resolve;
- como a solução funcionaria;
- qual resultado é esperado;

ENCERRE A ENTREVISTA.

Não faça uma quarta pergunta apenas para obter mais detalhes.

A quarta pergunta só deve existir se houver uma lacuna
relevante.

A quinta pergunta só deve existir se faltar uma informação
essencial que impeça uma análise razoável.

NUNCA ultrapasse 5 perguntas.

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

As perguntas devem ser curtas.

Evite perguntas longas.

Evite perguntas com várias partes.

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

    /* =====================================================
       CONTROLE DE ESTÁGIO DA ENTREVISTA
    ===================================================== */

    const interviewStage =
      answers.length === 0
        ? `
Esta é a primeira pergunta.

Procure entender o ponto mais importante da ideia que ainda
não esteja claro na descrição original.

Faça somente UMA pergunta curta.
`
        : answers.length === 1
          ? `
Já existe uma resposta.

Agora procure entender a principal lacuna restante.

Priorize o problema, funcionamento da solução ou resultado
esperado, dependendo do que ainda estiver pouco claro.

Faça somente UMA pergunta curta.
`
          : answers.length === 2
            ? `
Já existem 2 respostas.

Antes de perguntar, verifique se a ideia já está suficientemente
clara.

Se já estiver claro:

- qual é a ideia;
- qual problema existe;
- como a solução funcionaria;
- ou qual resultado é esperado;

encerre a entrevista agora.

Somente faça uma terceira pergunta se existir uma lacuna
realmente importante.
`
            : answers.length === 3
              ? `
Já foram coletadas 3 respostas.

A entrevista está praticamente concluída.

Se a ideia já estiver suficientemente clara, encerre agora.

Só faça uma quarta pergunta se faltar uma informação importante
que realmente alteraria a análise.

Não aprofunde detalhes secundários.
`
              : `
Já foram coletadas 4 respostas.

Esta é a última oportunidade para obter uma informação essencial.

Só faça uma quinta pergunta se existir uma lacuna crítica.

Se a ideia já puder ser analisada razoavelmente, encerre agora.

NUNCA ultrapasse 5 perguntas.
`;

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

${interviewStage}

IMPORTANTE:

Não faça saudação.
Não faça apresentação.
Não diga quem você é.
Não diga "Olá".
Não diga "Oi".
Não diga que está aqui para ajudar.

Comece diretamente pela pergunta.

Faça somente UMA pergunta.

A pergunta deve ser curta, natural e fácil de responder.

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

${interviewStage}

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
2. levantamento das condições atuais;
3. avaliação de viabilidade;
4. planejamento;
5. definição da solução;
6. aprovação;
7. orçamento;
8. contratação ou aquisição;
9. preparação da infraestrutura;
10. instalação ou desenvolvimento;
11. testes;
12. ajustes;
13. treinamento dos envolvidos;
14. implantação;
15. acompanhamento inicial;
16. medição dos resultados;
17. manutenção;
18. melhoria contínua.

NÃO force todas essas etapas em qualquer ideia.

Use somente as fases que fizerem sentido para o projeto.

Para uma ideia simples, ainda assim apresente uma sequência
clara e prática de implantação.

Os próximos passos devem normalmente conter
ENTRE 5 E 10 etapas quando isso fizer sentido.

Não reduza artificialmente a lista para 2 ou 3 etapas.

Cada etapa deve explicar:

- o que será feito;
- por que essa etapa é necessária;
- qual resultado esperado.

Os próximos passos devem ser suficientemente detalhados
para que uma pessoa consiga entender como a empresa poderia
tirar a ideia do papel.

=========================================================
2. SCORE DA IDEIA
=========================================================

Além do potencial ESG, avalie a qualidade e o potencial
prático da ideia.

Crie um:

idea_score

De 0 a 100.

O score deve considerar:

- clareza da solução;
- relevância do problema;
- benefício esperado;
- potencial de impacto;
- aplicabilidade prática;
- capacidade de gerar melhoria real.

Uma ideia pode ter alto potencial ESG e ainda assim receber
um score baixo se for pouco prática, pouco clara ou pouco útil.

Crie também:

priority_score

De 0 a 100.

O priority_score representa o quanto a empresa deveria
priorizar a ideia neste momento.

Considere:

- impacto potencial;
- urgência;
- benefício para a empresa;
- facilidade de implementação;
- relação entre esforço e benefício;
- riscos;
- potencial ESG.

IMPORTANTE:

Não confunda:

potential_esg = potencial ESG.

idea_score = qualidade/potencial geral da ideia.

priority_score = prioridade recomendada para a empresa.

Uma ideia pode ter:

ESG alto + score baixo.

ESG baixo + score alto.

ESG alto + score alto.

Avalie cada aspecto separadamente.

=========================================================
3. CUSTOS E RETORNO
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

Quando não houver dados suficientes para calcular valores
financeiros confiáveis, NÃO invente números.

Nesse caso, descreva o potencial de retorno qualitativamente
e indique quais informações seriam necessárias posteriormente.

=========================================================
4. IMPACTO ESG
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
5. RISCOS
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
6. LEVANTAMENTOS ESSENCIAIS
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
7. DECISÃO DE VIABILIDADE
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
8. MINI-PROJETO
=========================================================

O mini-projeto deve ser uma versão prática da ideia.

O título deve ser claro e profissional.

A descrição deve explicar:

- o que será implementado;
- qual problema será resolvido;
- como a solução funcionará;
- qual resultado se espera.

Não escreva um texto excessivamente longo.

=========================================================
9. CONCLUSÃO
=========================================================

A análise final deve permitir que um gestor entenda rapidamente:

- qual é a ideia;
- se vale a pena;
- qual é o potencial ESG;
- qual é a qualidade da ideia;
- qual é a prioridade;
- quais são os principais benefícios;
- quais são os principais riscos;
- quais passos devem ser executados.

=========================================================
REGRA FUNDAMENTAL
=========================================================

Não invente dados.

Quando não houver informação suficiente,
não invente números.

Use estimativas somente quando houver base razoável
para fazê-las e deixe claro que são estimativas.

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
  "idea_score": 0,
  "priority_score": 0,
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

idea_score:
número inteiro entre 0 e 100.

priority_score:
número inteiro entre 0 e 100.

IMPORTANTE:

idea_score e priority_score devem ser números,
não strings.

Os próximos passos devem ser suficientemente detalhados
e, quando fizer sentido, conter entre 5 e 10 etapas.

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
      const parsed = JSON.parse(cleaned) as AnalysisResult;

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