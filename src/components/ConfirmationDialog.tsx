"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(result: boolean) {
    resolver.current(result);
    setOpts(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => close(false)} />
          <div className="relative w-full max-w-xs animate-fade-in rounded-2xl border border-border bg-card-secondary p-5 text-center shadow-2xl">
            <h2 className="text-base font-semibold text-text">{opts.title}</h2>
            {opts.description && <p className="mt-1.5 text-sm text-text-secondary">{opts.description}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => close(false)}
                className="min-h-11 flex-1 rounded-xl border border-border text-sm font-semibold text-text transition-colors hover:bg-card"
              >
                Cancel
              </button>
              <button
                onClick={() => close(true)}
                className={`min-h-11 flex-1 rounded-xl text-sm font-semibold text-white transition-colors ${
                  opts.danger ? "bg-error hover:bg-error/90" : "bg-blue hover:bg-blue/90"
                }`}
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
