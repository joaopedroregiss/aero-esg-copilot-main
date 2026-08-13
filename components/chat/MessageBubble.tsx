import clsx from "clsx";
import { ChatMessage } from "@/lib/esg/types";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={clsx(
        "flex w-full animate-message-in gap-2.5",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal font-display text-[11px] font-semibold text-canvas"
          aria-hidden="true"
        >
          A
        </div>
      )}
      <div className={clsx("flex max-w-[82%] sm:max-w-[70%] flex-col gap-1", isUser && "items-end")}>
        <div
          className={clsx(
            "px-4 py-3 text-[14.5px] leading-relaxed",
            isUser
              ? "bg-aevo-soft text-charcoal border border-aevo/15"
              : "bg-canvas-raised text-charcoal border border-line"
          )}
        >
          {message.text}
        </div>
        <span className="px-1 text-[11px] text-charcoal-faint">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
}
