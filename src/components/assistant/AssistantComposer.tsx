"use client";

import { useEffect, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { useSpeechTranscription } from "@/hooks/useSpeechTranscription";
import { cn } from "@/lib/utils";

interface AssistantComposerProps {
  onSend: (text: string) => void;
  loading: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  prefill?: string | null;
  onConsumePrefill?: () => void;
}

export function AssistantComposer({ onSend, loading, placeholder = "Message Amari…", autoFocus, prefill, onConsumePrefill }: AssistantComposerProps) {
  const [input, setInput] = useState("");
  const { supported, listening, transcript, start, stop, resetTranscript } = useSpeechTranscription();

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  useEffect(() => {
    if (prefill) {
      setInput(prefill);
      onConsumePrefill?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  function submit() {
    const text = input.trim();
    if (!text || loading) return;
    onSend(text);
    setInput("");
    resetTranscript();
  }

  return (
    <div className="flex items-center gap-2">
      {supported && (
        <button
          type="button"
          onClick={() => (listening ? stop() : start())}
          aria-label={listening ? "Stop voice transcription" : "Start voice transcription"}
          className={cn(
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
            listening ? "animate-pulse-glow border-error/50 bg-error/15 text-error" : "border-border text-text-secondary hover:text-text"
          )}
        >
          {listening ? <Square className="h-3.5 w-3.5" strokeWidth={2} /> : <Mic className="h-4 w-4" strokeWidth={2} />}
        </button>
      )}
      <input
        id="assistant-message"
        name="message"
        type="text"
        autoFocus={autoFocus}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={listening ? "Listening…" : placeholder}
        className="min-h-11 flex-1 rounded-xl border border-border bg-card px-3.5 text-sm text-text outline-none focus:border-blue"
      />
      <button
        onClick={submit}
        disabled={loading || !input.trim()}
        aria-label="Send"
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue text-bg disabled:opacity-40"
      >
        <Send className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
