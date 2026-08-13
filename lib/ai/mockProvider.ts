import { AIProvider, AnalyzeRequest, ChatTurnRequest, ChatTurnResponse } from "./types";
import { nextMockTurn } from "@/lib/mock/conversation";
import { classifyIdea } from "@/lib/esg/classify";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockProvider: AIProvider = {
  async nextTurn({ ideaText, answers }: ChatTurnRequest): Promise<ChatTurnResponse> {
    await delay(650);
    const userTurnCount = answers.length + 1;
    return nextMockTurn(ideaText, userTurnCount);
  },

  async analyze({ ideaText, answers }: AnalyzeRequest) {
    await delay(1100);
    return classifyIdea({ ideaText, answers });
  },
};
