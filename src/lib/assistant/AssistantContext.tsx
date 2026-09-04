"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/nav-items";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

interface AssistantContextValue {
  messages: AssistantMessage[];
  loading: boolean;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  send: (text: string) => Promise<void>;
  /** Opens the assistant (panel, or does nothing extra if already on /assistant) and
   *  pre-fills the composer with `text` for the user to review/edit before sending —
   *  the "ask Amari about X" quick-action pattern used across Business/Finance/Goals. */
  askAndOpen: (text: string) => void;
  pendingPrefill: string | null;
  clearPendingPrefill: () => void;
  pageLabel: string;
  pathname: string;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pendingPrefill, setPendingPrefill] = useState<string | null>(null);

  const pageLabel = useMemo(() => NAV_ITEMS.find((i) => pathname.startsWith(i.href))?.label ?? "Amari", [pathname]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      const history = messages.slice(-8);
      setMessages((m) => [...m, { role: "user", content: trimmed }]);
      setLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history, page: pathname, pageLabel }),
        });
        const data = await res.json();
        setMessages((m) => [...m, { role: "assistant", content: data.text ?? "…" }]);
      } catch {
        setMessages((m) => [...m, { role: "assistant", content: "Something went wrong reaching Amari. Try again." }]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, pathname, pageLabel]
  );

  const askAndOpen = useCallback((text: string) => {
    setPendingPrefill(text);
    setPanelOpen(true);
  }, []);

  const value = useMemo<AssistantContextValue>(
    () => ({
      messages,
      loading,
      panelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      togglePanel: () => setPanelOpen((v) => !v),
      send,
      askAndOpen,
      pendingPrefill,
      clearPendingPrefill: () => setPendingPrefill(null),
      pageLabel,
      pathname,
    }),
    [messages, loading, panelOpen, send, askAndOpen, pendingPrefill, pageLabel, pathname]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within an AssistantProvider");
  return ctx;
}
