import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Conexão única com o Supabase, compartilhada por toda a aplicação (server-side).
 *
 * Usa a Service Role Key porque as rotas em app/api/* rodam apenas no servidor
 * (nunca no browser) e precisam ler/escrever na tabela `ideas` sem depender de
 * autenticação de usuário nem de políticas de RLS por sessão.
 *
 * Nunca importe este arquivo em um componente de cliente ("use client") — a
 * Service Role Key ignora RLS e não pode vazar para o browser.
 */

declare global {
  // eslint-disable-next-line no-var
  var __aevoSupabase: SupabaseClient | undefined;
}

/**
 * Erro específico para "banco não configurado" (variáveis de ambiente
 * ausentes), para que as rotas de API consigam diferenciar esse caso de um
 * erro genuíno de conexão/consulta e mostrar uma mensagem útil no lugar de
 * simplesmente engolir o erro.
 */
export class DbNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbNotConfiguredError";
  }
}

function createConnection(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !url.trim()) {
    throw new DbNotConfiguredError(
      "[db] SUPABASE_URL não está definido. Configure-o no .env.local (veja .env.example)."
    );
  }
  if (!serviceRoleKey || !serviceRoleKey.trim()) {
    throw new DbNotConfiguredError(
      "[db] SUPABASE_SERVICE_ROLE_KEY não está definido. Configure-o no .env.local (veja .env.example)."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Retorna o client Supabase (singleton por processo). */
export function getDb(): SupabaseClient {
  if (!globalThis.__aevoSupabase) {
    globalThis.__aevoSupabase = createConnection();
  }
  return globalThis.__aevoSupabase;
}
