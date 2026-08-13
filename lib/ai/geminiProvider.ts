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
const MIN_INTERVIEW_QUESTIONS = 5;

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
para compreender profundamente uma ideia de melhoria apresentada
por um colaborador.

A entrevista deve ajudar o colaborador a ELABORAR melhor a própria
ideia antes da análise final.

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

Compreenda suficientemente bem:

- qual é a ideia;
- qual problema ou oportunidade ela resolve;
- onde isso acontece;
- como funciona atualmente;
- como a solução pretende funcionar;
- quem será beneficiado ou afetado;
- como a solução seria colocada em prática;
- quais recursos seriam necessários;
- quais dificuldades podem aparecer;
- qual resultado o colaborador espera;
- como seria possível saber se a ideia funcionou.

A entrevista não deve ser apenas uma coleta superficial
de informações.

O objetivo é ajudar o colaborador a transformar uma ideia
inicial em uma proposta mais concreta.

=========================================================
PROFUNDIDADE
=========================================================

Não encerre a entrevista assim que entender apenas:

- qual é a ideia;
- qual é o problema;
- e qual seria a solução.

Essas informações são apenas o começo.

Sempre que fizer sentido, aprofunde a ideia para entender
como ela funcionaria na prática.

Procure compreender:

- situação atual;
- mudança proposta;
- funcionamento da solução;
- pessoas envolvidas;
- recursos necessários;
- implantação;
- possíveis dificuldades;
- resultado esperado.

Normalmente conduza entre 5 e 8 perguntas.

NÃO encerre a entrevista com apenas 2 ou 3 perguntas
quando a ideia ainda puder ser melhor desenvolvida.

Se houver informação importante ainda pouco clara,
continue a entrevista.

=========================================================
REGRAS DA CONVERSA
=========================================================

Faça SOMENTE UMA pergunta por vez.

NUNCA faça duas, três ou quatro perguntas na mesma resposta.

Cada resposta do colaborador deve gerar uma análise do
que ainda precisa ser compreendido.

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
PERGUNTAS DE APROFUNDAMENTO
=========================================================

Quando uma resposta for vaga, superficial ou genérica,
não aceite imediatamente como suficiente.

Faça uma pergunta de aprofundamento.

Exemplo:

Colaborador:
"Seria um sistema para controlar o consumo."

Boa próxima pergunta:

"Como você imagina que esse sistema funcionaria no dia a dia
e quem seria responsável por utilizá-lo?"

Outro exemplo:

Colaborador:
"Isso reduziria desperdícios."

Boa próxima pergunta:

"Em que parte do processo acontece hoje esse desperdício
e o que mudaria com a sua proposta?"

Outro exemplo:

Colaborador:
"A empresa economizaria."

Boa próxima pergunta:

"Qual seria a principal fonte dessa economia na prática?"

Não faça todas essas perguntas juntas.

Escolha apenas UMA.

=========================================================
ADAPTAÇÃO
=========================================================

A próxima pergunta deve depender das respostas anteriores.

Não siga uma lista fixa.

Use o histórico para identificar a informação mais importante
que ainda precisa ser esclarecida.

Se o colaborador já explicou o problema,
avance para entender a solução.

Se já explicou a solução,
avance para entender como ela funcionaria na prática.

Se já explicou o funcionamento,
procure entender implantação, envolvidos ou recursos.

Se já explicou a implantação,
procure entender dificuldades, resultados ou benefícios.

Se a resposta estiver vaga,
faça uma pergunta de aprofundamento.

Se houver uma informação crítica faltando,
priorize essa informação.

=========================================================
ORDEM DE PRIORIDADE
=========================================================

Quando houver várias informações faltantes, priorize:

1. Compreensão da ideia.
2. Problema ou oportunidade.
3. Funcionamento atual.
4. Funcionamento da solução.
5. Beneficiados e envolvidos.
6. Implantação prática.
7. Recursos ou condições necessárias.
8. Resultado esperado.
9. Riscos ou dificuldades relevantes.
10. Como verificar se a solução funcionou.

Não tente cobrir tudo obrigatoriamente.

Escolha a informação mais relevante para a próxima pergunta.

=========================================================
QUANDO USAR EXEMPLOS
=========================================================

Quando uma pergunta puder ser difícil de responder,
você pode apresentar exemplos curtos.

Exemplo:

"O que precisaria acontecer para colocar essa ideia em prática?

Por exemplo: aprovação, equipamento, treinamento, sistema
ou mudança de processo."

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

Não encerre a entrevista prematuramente.

Antes de encerrar, verifique mentalmente se já existe
informação suficiente sobre:

- problema;
- solução;
- funcionamento;
- beneficiados;
- implantação;
- resultado esperado.

Como regra geral, NÃO encerre antes de pelo menos
5 perguntas respondidas.

EXCEÇÃO:

Se a ideia tiver sido extremamente bem detalhada pelo
colaborador desde o início e praticamente todos esses
pontos já estiverem claros, a entrevista pode terminar antes.

Quando já houver informações suficientes para realizar
uma análise realmente boa, responda EXATAMENTE:

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

Procure começar entendendo o principal problema,
oportunidade ou objetivo da ideia.

Esta é a pergunta ${questionNumber} de no máximo ${MAX_INTERVIEW_QUESTIONS}.
`;
    } else {
      /* ===================================================
         PRÓXIMA PERGUNTA
      =================================================== */

      const minimumQuestionsReached =
        answers.length >= MIN_INTERVIEW_QUESTIONS;

      input = `
IDEIA ORIGINAL DO COLABORADOR:

${idea}

HISTÓRICO COMPLETO DA ENTREVISTA:

${conversationHistory}

O colaborador acabou de responder à última pergunta.

Analise TODO o histórico acima.

Determine qual é a informação mais importante que ainda
falta para compreender e desenvolver a ideia.

A entrevista deve buscar uma compreensão suficientemente
profunda para transformar a ideia em um projeto executável.

Antes de encerrar, verifique se já está claro:

- qual é o problema;
- qual é a solução;
- como funciona atualmente;
- como a solução funcionaria;
- quem será beneficiado ou envolvido;
- como a implantação poderia acontecer;
- quais recursos ou condições são necessários;
- qual resultado é esperado.

Se alguma dessas informações ainda for importante e estiver
pouco clara, faça uma pergunta sobre ela.

Se a última resposta tiver sido vaga, faça uma pergunta
de aprofundamento em vez de encerrar.

Faça SOMENTE UMA pergunta.

Não repita informações já fornecidas.

Não pergunte algo cuja resposta já possa ser inferida
com segurança a partir do histórico.

Não faça saudação.

Não faça apresentação.

Não diga "Olá".

Não diga quem você é.

${minimumQuestionsReached
  ? `
Já foram feitas pelo menos ${MIN_INTERVIEW_QUESTIONS} perguntas.

Você pode encerrar se a ideia estiver suficientemente
bem compreendida.

Porém, se ainda existir uma lacuna relevante para a análise,
continue perguntando.
`
  : `
Ainda não foram feitas ${MIN_INTERVIEW_QUESTIONS} perguntas.

NÃO encerre a entrevista apenas porque já entendeu
o básico da ideia.

Continue aprofundando a ideia.
`}

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

A análise NÃO deve apenas resumir a ideia.

Ela deve mostrar como essa ideia poderia sair do papel
e se transformar em uma iniciativa real dentro da empresa.

=========================================================
PRÓXIMOS PASSOS
=========================================================

Os próximos passos devem representar uma sequência lógica
de implantação do projeto.

Para uma ideia que tenha complexidade normal, gere
PREFERENCIALMENTE entre 6 e 10 etapas.

Não limite a resposta a 2 ou 3 etapas.

Cada etapa deve ser específica para a ideia analisada.

Evite passos genéricos como:

"Implementar a solução."

"Validar os resultados."

"Monitorar o projeto."

Em vez disso, explique o que realmente precisa acontecer.

Por exemplo:

1. Levantar a situação atual e identificar onde ocorre
   o problema.

2. Validar tecnicamente a solução proposta e verificar
   as condições necessárias para sua implantação.

3. Definir o escopo da solução, responsáveis e recursos.

4. Avaliar custos, fornecedores, infraestrutura e
   aprovações necessárias.

5. Desenvolver ou adquirir a solução.

6. Realizar um teste ou projeto-piloto.

7. Corrigir problemas identificados durante o piloto.

8. Treinar os envolvidos e preparar a operação.

9. Implantar a solução.

10. Acompanhar os resultados e realizar ajustes.

NÃO copie essa lista automaticamente.

Use somente as etapas que fizerem sentido para a ideia.

Uma ideia simples pode ter menos etapas.

Uma ideia mais complexa pode ter mais etapas.

Cada etapa deve responder claramente:

- o que será feito;
- por que isso é necessário;
- qual resultado essa etapa deve produzir.

Os passos devem ser escritos de forma que uma pessoa da
empresa consiga entender o caminho necessário para tirar
a ideia do papel.

=========================================================
NÍVEL DE DETALHE
=========================================================

Evite etapas vagas.

Não escreva apenas:

"Fazer um piloto."

Prefira:

"Executar um projeto-piloto em uma área selecionada,
acompanhar o funcionamento da solução e registrar os
problemas encontrados antes de expandir para outras áreas."

Não escreva apenas:

"Treinar funcionários."

Prefira:

"Treinar os colaboradores que utilizarão a solução,
explicando o novo processo, responsabilidades e procedimentos
para utilização no dia a dia."

Os próximos passos devem ser práticos e executáveis.

=========================================================
IMPLANTAÇÃO
=========================================================

Quando aplicável, considere a sequência:

1. diagnóstico;
2. validação da ideia;
3. viabilidade;
4. planejamento;
5. definição do escopo;
6. aprovação;
7. orçamento;
8. aquisição ou desenvolvimento;
9. preparação;
10. piloto;
11. testes;
12. ajustes;
13. treinamento;
14. implantação;
15. acompanhamento;
16. medição;
17. melhoria contínua.

Não force todas as etapas.

Selecione apenas as que realmente fizerem sentido
para o projeto analisado.

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

Quando não houver dados suficientes para calcular
um valor confiável, não invente números.

Nesse caso, explique quais dados seriam necessários
para calcular o valor posteriormente.

Quando utilizar uma estimativa, identifique claramente
que ela é uma estimativa.

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
4. SCORE DA IDEIA
=========================================================

Além do potencial ESG, avalie a qualidade e a força
da própria ideia.

O fato de uma ideia se encaixar em ESG NÃO significa
automaticamente que ela seja uma boa ideia.

Calcule:

idea_score:
nota de 0 a 100 que representa a qualidade geral da ideia.

Considere:

- clareza do problema;
- relevância do problema;
- qualidade da solução proposta;
- benefício potencial;
- aplicabilidade;
- potencial de geração de valor;
- coerência entre problema e solução;
- nível de evidência disponível.

priority_score:
nota de 0 a 100 que representa o quanto a empresa deveria
priorizar a análise ou execução dessa ideia.

Considere:

- impacto potencial;
- relevância estratégica;
- impacto ESG;
- retorno potencial;
- facilidade de implantação;
- riscos;
- urgência;
- capacidade de gerar benefícios relevantes.

IMPORTANTE:

Uma ideia pode ter alto potencial ESG e baixo idea_score.

Uma ideia pode ter baixo impacto ESG e ainda assim ser uma
boa ideia de negócio, mas nesse caso seu priority_score
deve refletir a relevância geral para a empresa.

Não aumente a nota apenas porque a ideia se encaixa
em uma dimensão ESG.

Use números inteiros entre 0 e 100.

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
8. CONCLUSÃO
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
não crie números falsos.

Quando houver uma estimativa razoável,
identifique explicitamente como estimativa.

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

A análise deve ser suficientemente detalhada para transformar
a ideia em um projeto executável.

IMPORTANTE:

- Faça uma análise específica para esta ideia.
- Não responda de forma genérica.
- Gere uma sequência de próximos passos coerente com a ideia.
- Quando a implantação exigir várias fases, utilize
  preferencialmente entre 6 e 10 próximos passos.
- Cada próximo passo deve representar uma ação concreta.
- Não reduza todo o projeto a "validar, implementar e acompanhar".
- Não invente informações que não estejam disponíveis.
- Quando houver incerteza, deixe claro que se trata de uma estimativa.
- O idea_score deve avaliar a qualidade da ideia.
- O priority_score deve avaliar a prioridade da ideia para a empresa.
- Não aumente nenhuma dessas notas simplesmente porque a ideia
  possui relação com ESG.

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

status:
"completed"

idea_score:
número inteiro entre 0 e 100

priority_score:
número inteiro entre 0 e 100

potential_esg:
"HIGH" | "MEDIUM" | "LOW"

dimensions.level:
"HIGH" | "MEDIUM" | "LOW" | "NOT_IDENTIFIED"

main_dimension:
"environmental" | "social" | "governance"

theme:
texto curto representando o tema principal da ideia

summary:
resumo claro da ideia, problema, solução e objetivo

benefits:
lista de benefícios concretos

areas:
lista de áreas da empresa potencialmente envolvidas

next_steps:
lista ordenada de etapas práticas para implantação

mini_project.title:
nome do projeto

mini_project.description:
descrição curta e prática do mini-projeto

IMPORTANTE SOBRE next_steps:

Quando a ideia tiver complexidade suficiente,
retorne preferencialmente entre 6 e 10 etapas.

As etapas devem estar em ordem lógica.

Cada etapa deve ser específica para a ideia.

Não use etapas genéricas ou repetitivas.

Não invente informações para preencher campos.

Retorne SOMENTE JSON válido.
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

      /* ===================================================
         VALIDAÇÃO BÁSICA DOS SCORES
      =================================================== */

      if (
        typeof parsed.idea_score !== "number" ||
        parsed.idea_score < 0 ||
        parsed.idea_score > 100
      ) {
        throw new Error(
          "idea_score inválido retornado pelo Gemini."
        );
      }

      if (
        typeof parsed.priority_score !== "number" ||
        parsed.priority_score < 0 ||
        parsed.priority_score > 100
      ) {
        throw new Error(
          "priority_score inválido retornado pelo Gemini."
        );
      }

      /* ===================================================
         NORMALIZAÇÃO DOS PRÓXIMOS PASSOS
      =================================================== */

      if (!Array.isArray(parsed.next_steps)) {
        parsed.next_steps = [];
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