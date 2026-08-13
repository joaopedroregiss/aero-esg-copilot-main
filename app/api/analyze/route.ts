import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { saveAnalyzedIdea } from "@/lib/db/ideasRepository";
import { GeminiRateLimitError } from "@/lib/ai/geminiProvider";
import { DbNotConfiguredError } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ideaText: string = (body?.ideaText ?? "").toString();
    const answers: string[] = Array.isArray(body?.answers) ? body.answers.map(String) : [];

    if (!ideaText.trim()) {
      return NextResponse.json({ error: "ideaText é obrigatório." }, { status: 400 });
    }

    const provider = getAIProvider();
    const result = await provider.analyze({ ideaText, answers });

    // Persiste a ideia analisada para alimentar a Visão Gerencial.
    // Uma falha ao salvar não deve derrubar a resposta ao usuário do chat,
    // mas o front precisa saber que a conversa NÃO ficou salva, para avisar
    // o colaborador em vez de falhar silenciosamente.
    let persisted = true;
    let persistError: string | undefined;
    try {
      await saveAnalyzedIdea({ ideaText, answers, result });
    } catch (dbErr) {
      persisted = false;
      persistError =
        dbErr instanceof DbNotConfiguredError
          ? "O banco de dados (Supabase) ainda não está configurado neste ambiente — configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local."
          : "Não foi possível salvar esta ideia no histórico agora.";
      console.error("[api/analyze] falha ao salvar ideia no banco", dbErr);
    }

    return NextResponse.json({ ...result, persisted, persistError });
  } catch (err) {
    console.error(
      "[api/analyze]",
      err instanceof Error ? { message: err.message, name: err.name, stack: err.stack } : err
    );

    if (err instanceof GeminiRateLimitError) {
      return NextResponse.json(
        { error: err.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Não foi possível concluir a análise ESG agora. Tente novamente." },
      { status: 500 }
    );
  }
}
