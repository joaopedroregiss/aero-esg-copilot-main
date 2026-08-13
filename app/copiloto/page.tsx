import ChatWindow from "@/components/chat/ChatWindow";

export default function CopilotoPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-2xl font-semibold text-charcoal sm:text-[28px]">
            Copiloto de ideias
          </h1>
          <p className="mt-1.5 text-[14.5px] text-charcoal-soft">
            Transforme uma ideia em <span className="text-aevo-dark">impacto</span>.
          </p>
        </div>
      </div>
      <ChatWindow />
    </div>
  );
}
