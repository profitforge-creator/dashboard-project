import { AlertTriangle } from "lucide-react";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-error/25 bg-error/5 py-12 text-center">
      <AlertTriangle className="h-7 w-7 text-error" strokeWidth={1.5} aria-hidden="true" />
      <p className="max-w-[32ch] text-sm text-text">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="min-h-9 rounded-full border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-card">
          Try again
        </button>
      )}
    </div>
  );
}
