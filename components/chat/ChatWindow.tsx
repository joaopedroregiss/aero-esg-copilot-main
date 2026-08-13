"use client";

import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";
import SuggestedPrompts from "./SuggestedPrompts";
import ErrorNotice from "./ErrorNotice";
import AnalyzingStatus from "./AnalyzingStatus";
import AnalysisAttachmentCard from "./AnalysisAttachmentCard";
import AnalysisPanel from "@/components/analysis/AnalysisPanel";
import MiniProjectModal from "@/components/ui/MiniProjectModal";
import { AnalysisResult, ChatMessage } from "@/lib/esg/types";

type Stage = "collecting" | "analyzing" | "done";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function makeMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return { id: uid(), role, text, createdAt: new Date().toISOString() };
}

const INTRO_TEXT = "Conte uma ideia de melhoria, economia, segurança, sustentabilidade ou inovação.";

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([makeMessage("assistant", INTRO_TEXT)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("collecting");
  const [ideaText, setIdeaText] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [miniProjectOpen, setMiniProjectOpen] = useState(false);
  const pendingRetry = useRef<null | (() => void)>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, error]);

  async function askNextTurn(currentIdea: string, currentAnswers: string[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ideaText: currentIdea, answers: currentAnswers }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLoading(false);

      if (data.type === "ready") {
        setMessages((m) => [...m, makeMessage("assistant", data.text)]);
        void runAnalysis(currentIdea, currentAnswers);
      } else {
        setMessages((m) => [...m, makeMessage("assistant", data.text)]);
      }
    } catch {
      setLoading(false);
      setError("Não foi possível continuar a conversa agora.");
      pendingRetry.current = () => askNextTurn(currentIdea, currentAnswers);
    }
  }

  async function runAnalysis(currentIdea: string, currentAnswers: string[]) {
    setStage("analyzing");
    setError(null);
    setMessages((m) => [...m, makeMessage("system-status", "__analyzing__")]);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ideaText: currentIdea, answers: currentAnswers }),
      });
      if (!res.ok) throw new Error();
      const data: AnalysisResult = await res.json();
      setResult(data);
      setStage("done");
      setMessages((m) => [
        ...m.filter((msg) => msg.text !== "__analyzing__"),
        makeMessage("assistant", "Análise concluída."),
        makeMessage("system-status", "__analysis_card__"),
      ]);
      setPanelOpen(true);
    } catch {
      setStage("collecting");
      setMessages((m) => m.filter((msg) => msg.text !== "__analyzing__"));
      setError("Não foi possível concluir a análise ESG agora.");
      pendingRetry.current = () => runAnalysis(currentIdea, currentAnswers);
    }
  }

  function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value || loading || stage === "analyzing") return;

    setMessages((m) => [...m, makeMessage("user", value)]);
    setInput("");
    setError(null);

    if (ideaText === null) {
      setIdeaText(value);
      void askNextTurn(value, []);
    } else {
      const nextAnswers = [...answers, value];
      setAnswers(nextAnswers);
      void askNextTurn(ideaText, nextAnswers);
    }
  }

  function handleRetry() {
    setError(null);
    pendingRetry.current?.();
  }

  const showSuggestions = ideaText === null && messages.length === 1;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {messages.map((message) => {
            if (message.text === "__analyzing__") {
              return <AnalyzingStatus key={message.id} />;
            }
            if (message.text === "__analysis_card__") {
              return result ? (
                <AnalysisAttachmentCard
                  key={message.id}
                  result={result}
                  onOpen={() => setPanelOpen(true)}
                />
              ) : null;
            }
            return <MessageBubble key={message.id} message={message} />;
          })}

          {loading && (
            <div className="flex items-center gap-2.5 pl-9">
              <TypingIndicator label="Copiloto está digitando" />
            </div>
          )}

          {error && <ErrorNotice message={error} onRetry={handleRetry} />}

          {showSuggestions && (
            <div className="pl-9">
              <SuggestedPrompts onPick={(text) => handleSend(text)} />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          disabled={loading || stage === "analyzing"}
          placeholder={
            stage === "analyzing" ? "Analisando sua ideia…" : "Conte sua ideia ou responda ao Copiloto…"
          }
        />
      </div>

      <AnalysisPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        result={result}
        onOpenMiniProject={() => setMiniProjectOpen(true)}
      />
      <MiniProjectModal
        open={miniProjectOpen}
        onClose={() => setMiniProjectOpen(false)}
        data={
          result
            ? {
                title: result.mini_project.title,
                mainDimension: result.main_dimension,
                description: result.mini_project.description,
                benefits: result.benefits,
                areas: result.areas,
                nextSteps: result.next_steps,
              }
            : null
        }
      />
    </div>
  );
}
