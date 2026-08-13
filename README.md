# AEVO — Copiloto ESG

AEVO é um copiloto de IA que recebe ideias de melhoria de colaboradores, investiga o
contexto com perguntas direcionadas e converte a ideia em uma oportunidade ESG
estruturada (Ambiental · Social · Governança).

## Como rodar

```bash
npm install
cp .env.example .env.local   # USE_MOCK_AI=true já funciona sem chave de API
npm run dev
```

Abra `http://localhost:3000` — a rota raiz redireciona para `/copiloto`.

O banco de dados é o **Supabase** (Postgres). Antes de rodar `npm run dev`:

1. Crie um projeto gratuito em [supabase.com/dashboard](https://supabase.com/dashboard).
2. Em **Project Settings → API**, copie a **Project URL** e a chave **service_role**.
3. Cole os dois valores em `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`.
4. No **SQL Editor** do projeto Supabase, cole e rode o conteúdo de
   `supabase/migrations/0001_create_ideas.sql` (cria a tabela `ideas`).

Sem essas duas variáveis definidas, as rotas `/api/analyze` e `/api/management`
retornam erro ao tentar acessar o banco.

## Rotas

- **`/copiloto`** — experiência principal: chat com o Copiloto de ideias. Após a
  investigação contextual, a análise ESG aparece anexada à conversa (painel lateral
  no desktop, bottom sheet no mobile), com acesso ao mini-projeto gerado.
- **`/visao-gerencial`** — camada de inteligência executiva: métricas, distribuição
  ESG das ideias, ranking editorial das ideias em destaque, leitura da IA e detalhe
  de cada ideia. Os dados vêm do banco SQLite, populado automaticamente a cada
  ideia analisada pelo Copiloto — não há mais dados mockados nesta tela.

## IA: mock vs. real

Toda a lógica de IA passa por `lib/ai/` (`AIProvider`), com implementações:

- `mockProvider` — script determinístico + heurística por palavras-chave
  (`lib/mock/conversation.ts`, `lib/esg/classify.ts`). Ativo por padrão
  (`USE_MOCK_AI=true` ou variável ausente), permitindo demonstrar o produto
  inteiro sem chave de API.
- `geminiProvider` — chama a API do Gemini (`@google/genai`) no servidor
  (`lib/ai/geminiProvider.ts`), com prompts de entrevista adaptativa e análise
  ESG estruturada em JSON. Ativado com `USE_MOCK_AI=false` e `GEMINI_API_KEY`
  definido (crie uma chave gratuita em https://aistudio.google.com/apikey).
- `anthropicProvider` — alternativa opcional que chama a API de mensagens da
  Anthropic (`lib/ai/anthropicProvider.ts`). Não é usada por `getAIProvider()`
  por padrão; troque a importação em `lib/ai/index.ts` caso queira usá-la no
  lugar do Gemini.

Todas passam exclusivamente pelas rotas server-side `app/api/chat` e
`app/api/analyze` — a chave de API nunca é exposta ao cliente. Trocar de provedor
no futuro significa apenas implementar a interface `AIProvider` e apontar
`getAIProvider()` para ela.

## Banco de dados

- **Supabase (Postgres) via [`@supabase/supabase-js`](https://supabase.com/docs/reference/javascript/introduction)**
  — mesma conexão em dev e produção, incluindo Vercel (serverless).
- Toda a leitura/escrita passa pela **Service Role Key**, usada apenas no
  servidor (rotas `app/api/*`). Ela nunca é exposta ao cliente e ignora RLS,
  então não é necessário criar policies para a aplicação funcionar — o
  `alter table ... enable row level security` na migração apenas garante que
  ninguém consiga ler/escrever a tabela pela chave anônima (não usada aqui).
- **Setup (dev e produção)**: crie um projeto em
  [supabase.com/dashboard](https://supabase.com/dashboard), copie
  `Project URL` e `service_role key` (Project Settings → API) para
  `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, e rode
  `supabase/migrations/0001_create_ideas.sql` no SQL Editor do projeto. Na
  Vercel, defina as mesmas duas variáveis em Project Settings →
  Environment Variables.
- `lib/db/client.ts` — cria o client Supabase (singleton por processo).
- `lib/db/ideasRepository.ts` — concentra toda a leitura/escrita:
  - `saveAnalyzedIdea` — chamado por `app/api/analyze/route.ts` sempre que uma
    análise ESG é concluída com sucesso, gravando a ideia, respostas e o
    resultado completo.
  - `listIdeas`, `getManagementMetrics`, `getEsgDistribution`, `getTopIdeas`,
    `buildAiInsight` — agregações consumidas pela rota `app/api/management/route.ts`
    e renderizadas em `/visao-gerencial`.
- Se não houver nenhuma ideia analisada ainda, a Visão Gerencial mostra o estado
  vazio (`EmptyState`) — assim que a primeira ideia é analisada pelo Copiloto,
  os números aparecem automaticamente.

## Estrutura

```
app/
  copiloto/             página do Copiloto
  visao-gerencial/      página da Visão Gerencial
  api/chat/             próxima pergunta da entrevista contextual
  api/analyze/          análise ESG estruturada

components/
  chat/                 bolhas de mensagem, input, indicador de digitação, cartão de análise
  analysis/             painel de análise + modal de mini-projeto
  management/           métricas, distribuição ESG, lista de ideias, insight da IA
  ui/                   Sheet (painel lateral / bottom sheet compartilhado), átomos ESG

lib/
  ai/                   abstração de provedor de IA (mock + Gemini + Anthropic)
  mock/                 roteiro de entrevista mockado
  esg/                  tipos de domínio ESG + heurística de classificação
  db/                   client Supabase + repositório de ideias analisadas

supabase/
  migrations/           SQL para criar a tabela `ideas` no projeto Supabase
```

## Notas de implementação

- Não existe biblioteca de chat de terceiros instalada no projeto original, então
  o chat foi construído como um componente próprio em `components/chat/`, seguindo
  os requisitos do briefing (mensagens de usuário/IA, indicador de digitação,
  auto-scroll, estado de erro com nova tentativa, layout responsivo).
- As fontes usam pilhas de fontes do sistema (`Space Grotesk` / `IBM Plex Sans` /
  `IBM Plex Mono` com fallback) para manter o build independente de acesso à rede
  em tempo de build. Para produção, considere `next/font/local` com os arquivos de
  fonte reais para fidelidade total à identidade visual.
