import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { GeminiRateLimitError } from "@/lib/ai/geminiProvider";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ideaText: string = (body?.ideaText ?? "").toString();
    const answers: string[] = Array.isArray(body?.answers) ? body.answers.map(String) : [];

    if (!ideaText.trim()) {
      return NextResponse.json({ error: "ideaText é obrigatório." }, { status: 400 });
    }

    const provider = getAIProvider();
    const result = await provider.nextTurn({ ideaText, answers });
    return NextResponse.json(result);
  } catch (err) {
    // Log detalhado no servidor: no Render, veja isso na aba "Logs".
    console.error(
      "[api/chat]",
      err instanceof Error ? { message: err.message, name: err.name, stack: err.stack } : err
    );

    if (err instanceof GeminiRateLimitError) {
      return NextResponse.json(
        { error: err.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Não foi possível processar a conversa agora. Tente novamente." },
      { status: 500 }
    );
  }
}
