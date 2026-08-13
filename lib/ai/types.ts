import { AnalysisResult } from "@/lib/esg/types";

export interface ChatTurnRequest {
  /** The very first user message — the idea itself. */
  ideaText: string;
  /** Every user answer given after the idea, in order. */
  answers: string[];
}

export interface ChatTurnResponse {
  type: "question" | "ready";
  text: string;
}

export interface AnalyzeRequest {
  ideaText: string;
  answers: string[];
}

export interface AIProvider {
  nextTurn(req: ChatTurnRequest): Promise<ChatTurnResponse>;
  analyze(req: AnalyzeRequest): Promise<AnalysisResult>;
}
