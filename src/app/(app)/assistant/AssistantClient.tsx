"use client";

import { Zap, MessageCircle, Mic, MicOff } from "lucide-react";
import { useAssistant } from "@/lib/assistant/AssistantContext";
import { useSpeechTranscription } from "@/hooks/useSpeechTranscription";
import { AvatarOrb } from "@/components/AvatarOrb";
import { AssistantMessages } from "@/components/assistant/AssistantMessages";
import { AssistantComposer } from "@/components/assistant/AssistantComposer";

const QUICK_PROMPTS = ["Summarize my day", "What should I focus on next?", "How am I tracking on my goals?"];

export function AssistantClient() {
  const { messages, loading, send, pendingPrefill, clearPendingPrefill } = useAssistant();
  const { supported } = useSpeechTranscription();

  const orbState = loading ? "thinking" : "idle";
  const statusLabel = loading ? "Thinking…" : "Ready";

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <AvatarOrb state={orbState} size={132} />
        <div>
          <p className="text-2xl font-semibold text-text">Amari</p>
          <p className="text-sm text-text-secondary">Your dashboard&apos;s AI core.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatPill icon={Zap} label="Status" value={statusLabel} accent={loading ? "warning" : "blue"} />
        <StatPill icon={supported ? Mic : MicOff} label="Voice" value={supported ? "Ready" : "Unavailable"} accent={supported ? "blue" : "muted"} />
        <StatPill icon={MessageCircle} label="History" value={`${messages.length}`} accent="muted" />
      </div>

      {messages.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="label-mono mb-3 text-text-secondary">Quick prompts</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-border-strong px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-blue hover:text-blue-light"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-h-[40vh] flex-1 flex-col rounded-2xl border border-border bg-card p-4">
        <AssistantMessages messages={messages} loading={loading} emptyHint="Ask Amari anything about your dashboard." className="flex-1" />
      </div>

      <div className="sticky bottom-20 lg:bottom-0">
        <AssistantComposer onSend={send} loading={loading} placeholder="Ask Amari anything…" prefill={pendingPrefill} onConsumePrefill={clearPendingPrefill} />
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: "blue" | "warning" | "muted" }) {
  const accentClass = accent === "blue" ? "bg-blue/15 text-blue-light" : accent === "warning" ? "bg-warning/15 text-warning" : "bg-card-secondary text-text-secondary";
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${accentClass}`}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <p className="text-sm font-semibold text-text">{value}</p>
      <p className="label-mono text-text-secondary">{label}</p>
    </div>
  );
}
