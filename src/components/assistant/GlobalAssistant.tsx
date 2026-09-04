"use client";

import Link from "next/link";
import { Maximize2, X, Sparkles } from "lucide-react";
import { useAssistant } from "@/lib/assistant/AssistantContext";
import { AssistantMessages } from "@/components/assistant/AssistantMessages";
import { AssistantComposer } from "@/components/assistant/AssistantComposer";
import { BrandMark } from "@/components/BrandMark";

/**
 * Persistent, app-wide entry point to Amari — mounted once in the (app) layout so it
 * survives route changes. The floating trigger is hidden on /assistant itself (that page
 * IS the expanded experience, so a second copy floating over it would be redundant).
 */
export function GlobalAssistant() {
  const { messages, loading, panelOpen, openPanel, closePanel, send, pageLabel, pathname, pendingPrefill, clearPendingPrefill } = useAssistant();

  if (pathname.startsWith("/assistant")) return null;

  return (
    <>
      {!panelOpen && (
        <button
          onClick={openPanel}
          aria-label="Open Amari assistant"
          className="glow-border fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue text-bg transition-transform hover:scale-105 lg:bottom-8 lg:right-8"
        >
          <BrandMark size={22} />
        </button>
      )}

      {panelOpen && (
        <div
          className={
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-t-3xl border border-border bg-card-secondary shadow-2xl " +
            "pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-8 lg:right-8 lg:max-h-[70vh] lg:w-96 lg:rounded-3xl"
          }
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue/15 text-blue-light">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">Amari</p>
                <p className="label-mono truncate text-text-secondary">{pageLabel}</p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <Link
                href="/assistant"
                aria-label="Open full assistant"
                onClick={closePanel}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-card hover:text-text"
              >
                <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
              <button onClick={closePanel} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-card hover:text-text">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          <AssistantMessages messages={messages} loading={loading} emptyHint={`Ask Amari about ${pageLabel.toLowerCase()}, your goals, or your day.`} className="flex-1 px-4 py-3" />

          <div className="border-t border-border p-3">
            <AssistantComposer onSend={send} loading={loading} prefill={pendingPrefill} onConsumePrefill={clearPendingPrefill} autoFocus />
          </div>
        </div>
      )}
    </>
  );
}
