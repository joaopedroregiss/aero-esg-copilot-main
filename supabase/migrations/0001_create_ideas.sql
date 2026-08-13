-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/_/sql/new), ou via Supabase CLI:
--   supabase db push

create table if not exists public.ideas (
  id                  text primary key,
  idea_text           text not null,
  answers             jsonb not null default '[]'::jsonb,
  status              text not null default 'completed',
  potential_esg       text not null,
  main_dimension      text not null,
  theme               text not null,
  summary             text not null,
  environmental_level text not null,
  environmental_just  text not null default '',
  social_level        text not null,
  social_just         text not null default '',
  governance_level    text not null,
  governance_just     text not null default '',
  benefits            jsonb not null default '[]'::jsonb,
  areas               jsonb not null default '[]'::jsonb,
  next_steps          jsonb not null default '[]'::jsonb,
  mini_project_title  text not null default '',
  mini_project_desc   text not null default '',
  created_at          timestamptz not null default now()
);

create index if not exists idx_ideas_created_at on public.ideas (created_at desc);
create index if not exists idx_ideas_potential on public.ideas (potential_esg);
create index if not exists idx_ideas_main_dimension on public.ideas (main_dimension);

-- RLS: a aplicação acessa esta tabela apenas pelo servidor (rotas app/api/*),
-- usando a Service Role Key, que ignora RLS. Habilitar RLS aqui bloqueia
-- qualquer acesso vindo do client-side com a chave anônima (não usada por
-- este projeto), o que é o comportamento desejado.
alter table public.ideas enable row level security;
