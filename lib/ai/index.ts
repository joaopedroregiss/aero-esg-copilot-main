import { AIProvider } from "./types";
import { mockProvider } from "./mockProvider";
import { geminiProvider } from "./geminiProvider";

export function getAIProvider(): AIProvider {
  const useMock = process.env.USE_MOCK_AI !== "false";

  return useMock ? mockProvider : geminiProvider;
}

export type { AIProvider } from "./types";