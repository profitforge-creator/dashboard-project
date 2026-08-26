"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ToastState {
  message: string;
  tone: "default" | "success" | "error";
  visible: boolean;
}

const ToastContext = createContext<(message: string, tone?: ToastState["tone"]) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({ message: "", tone: "default", visible: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((message: string, tone: ToastState["tone"] = "default") => {
    setState({ message, tone, visible: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState((s) => ({ ...s, visible: false })), 2600);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "fixed left-1/2 z-[70] -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-200",
          "bottom-24 lg:bottom-6",
          state.visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none",
          state.tone === "error" ? "bg-error text-white" : state.tone === "success" ? "bg-success text-black" : "bg-card-secondary text-text border border-border"
        )}
      >
        {state.message}
      </div>
    </ToastContext.Provider>
  );
}
