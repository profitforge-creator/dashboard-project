"use client";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost" | "pill" | "link" | "danger";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-blue text-white hover:bg-blue/90 active:translate-y-px",
  ghost: "border border-border text-text hover:border-border-strong hover:bg-card",
  pill: "rounded-full border border-border-strong bg-card text-blue-light text-xs uppercase tracking-wide hover:border-blue hover:bg-card-secondary",
  link: "bg-transparent text-blue-light hover:underline px-0",
  danger: "bg-error text-white hover:bg-error/90",
};

/** The design lab's button system, ported into real use across the app. */
export function Button({ variant = "primary", block = false, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        block && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
