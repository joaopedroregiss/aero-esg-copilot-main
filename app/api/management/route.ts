import { NextResponse } from "next/server";
import {
  listIdeas,
  getManagementMetrics,
  getEsgDistribution,
  getTopIdeas,
  buildAiInsight,
} from "@/lib/db/ideasRepository";
import { DbNotConfiguredError } from "@/lib/db/client";

export async function GET() {
  try {
    const ideas = await listIdeas();
    const metrics = getManagementMetrics(ideas);
    const distribution = getEsgDistribution(ideas);
    const topIdeas = getTopIdeas(ideas);
    const aiInsight = buildAiInsight(ideas, distribution);

    return NextResponse.json({
      metrics,
      distribution,
      topIdeas,
      aiInsight,
      hasData: ideas.length > 0,
      dbConfigured: true,
    });
  } catch (err) {
    console.error("[api/management]", err);

    if (err instanceof DbNotConfiguredError) {
      return NextResponse.json(
        {
          error:
            "O banco de dados (Supabase) ainda não está configurado neste ambiente.",
          dbConfigured: false,
          hasData: false,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Não foi possível carregar os dados da Visão Gerencial agora.", dbConfigured: true },
      { status: 500 }
    );
  }
}
