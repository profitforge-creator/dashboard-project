"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * Adaptive surface: a rounded bottom sheet on mobile, a centered
 * dialog on desktop (>=1024px). Backs both the `Modal` and
 * `BottomSheet` exports so mobile/desktop share one implementation.
 */
export function Sheet({ open, onClose, title, children, maxWidth = "max-w-md" }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full animate-fade-in overflow-y-auto border border-border bg-card-secondary p-5 shadow-2xl",
          "max-h-[88vh] rounded-t-3xl pb-[max(20px,env(safe-area-inset-bottom))]",
          "lg:max-h-[85vh] lg:rounded-3xl lg:p-6",
          maxWidth
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-card hover:text-text"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
