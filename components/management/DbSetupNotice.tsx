import { DatabaseZap } from "lucide-react";

const ENV_SNIPPET = `SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key`;

export default function DbSetupNotice() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <span
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-aevo-soft text-aevo-dark"
        aria-hidden="true"
      >
        <DatabaseZap size={22} strokeWidth={1.8} />
      </span>
      <p className="font-display text-xl font-semibold text-charcoal">
        O banco de dados ainda não está conectado
      </p>
      <p className="mt-2 max-w-md text-[14.5px] text-charcoal-soft">
        As ideias analisadas pelo Copiloto não são salvas ainda porque o Supabase não está
        configurado neste ambiente. É por isso que nenhuma conversa aparece aqui.
      </p>

      <div className="mt-6 w-full max-w-md rounded-lg border border-line bg-canvas-raised px-5 py-5 text-left">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal-faint">
          Como resolver
        </p>
        <ol className="mt-3 flex flex-col gap-2.5 text-[13.5px] text-charcoal-soft">
          <li>
            <span className="font-semibold text-charcoal">1.</span> Crie um projeto gratuito em{" "}
            <span className="font-mono text-[12.5px] text-aevo-dark">supabase.com/dashboard</span>.
          </li>
          <li>
            <span className="font-semibold text-charcoal">2.</span> Rode o arquivo{" "}
            <span className="font-mono text-[12.5px] text-aevo-dark">
              supabase/migrations/0001_create_ideas.sql
            </span>{" "}
            no SQL Editor do projeto.
          </li>
          <li>
            <span className="font-semibold text-charcoal">3.</span> Em Project Settings → API,
            copie a Project URL e a chave service_role.
          </li>
          <li>
            <span className="font-semibold text-charcoal">4.</span> Cole no{" "}
            <span className="font-mono text-[12.5px] text-aevo-dark">.env.local</span>:
          </li>
        </ol>
        <pre className="mt-3 overflow-x-auto rounded border border-line bg-canvas px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-charcoal">
{ENV_SNIPPET}
        </pre>
        <p className="mt-3 text-[13px] text-charcoal-faint">
          Depois de configurar, reinicie o servidor (<span className="font-mono">npm run dev</span>)
          — as próximas ideias enviadas ao Copiloto já aparecerão aqui automaticamente.
        </p>
      </div>
    </div>
  );
}
