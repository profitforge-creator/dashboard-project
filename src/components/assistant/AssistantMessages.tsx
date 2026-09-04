"use client";

import { Sparkles } from "lucide-react";
import type { AssistantMessage } from "@/lib/assistant/AssistantContext";
import { cn } from "@/lib/utils";

interface AssistantMessagesProps {
  messages: AssistantMessage[];
  loading: boolean;
  emptyHint: string;
  className?: string;
}

export function AssistantMessages({ messages, loading, emptyHint, className }: AssistantMessagesProps) {
  return (
    <div className={cn("space-y-3 overflow-y-auto", className)}>
      {messages.length === 0 && !loading && (
        <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-text-secondary">
          <Sparkles className="h-6 w-6 text-blue-light" strokeWidth={1.5} />
          <p className="text-sm">{emptyHint}</p>
        </div>
      )}
      {messages.map((m, i) => (
        <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
          <div
            className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              m.role === "user" ? "bg-blue text-bg" : "border border-border bg-card text-text"
            )}
          >
            {m.content}
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex justify-start">
          <div className="rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm text-text-secondary">Amari is thinking…</div>
        </div>
      )}
    </div>
  );
}
