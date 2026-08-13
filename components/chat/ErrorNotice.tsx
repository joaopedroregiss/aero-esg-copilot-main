import { AlertTriangle } from "lucide-react";

export default function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex animate-message-in items-start gap-3 border border-danger/25 bg-danger-soft px-4 py-3.5"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-[14px] text-charcoal">{message}</p>
        <button
          onClick={onRetry}
          className="mt-2 text-[13px] font-semibold text-danger underline underline-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
