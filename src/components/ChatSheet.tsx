"use client";

import { useEffect, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Sheet } from "@/components/Sheet";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function ChatSheet({ open, onClose, initialMessage }: { open: boolean; onClose: () => void; initialMessage?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [primed, setPrimed] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialMessage && primed !== initialMessage) {
      setPrimed(initialMessage);
      setInput(initialMessage);
    }
    if (!open) setPrimed(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMessage]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.slice(-8) }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.text ?? "…" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong reaching Amari. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Chat with Amari" maxWidth="max-w-lg">
      <div className="flex h-[50vh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-text-secondary">
              <Sparkles className="h-6 w-6 text-blue-light" strokeWidth={1.5} />
              <p className="text-sm">Ask Amari anything about your goals, focus, or day.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-blue text-white" : "border border-border bg-card text-text"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-sm text-text-secondary">Amari is thinking…</div>}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <input
            id="chat-message"
            name="message"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message Amari…"
            className="min-h-11 flex-1 rounded-xl border border-border bg-card px-3.5 text-sm text-text outline-none focus:border-blue"
          />
          <button
            onClick={() => send()}
            disabled={loading}
            aria-label="Send"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </Sheet>
  );
}
