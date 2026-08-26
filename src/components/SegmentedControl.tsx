import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div className={cn("inline-flex gap-0.5 rounded-full border border-border bg-card p-1", className)} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-h-8 rounded-full px-3.5 text-sm font-medium transition-colors",
            value === opt.value ? "bg-blue text-white" : "text-text-secondary hover:text-text"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
