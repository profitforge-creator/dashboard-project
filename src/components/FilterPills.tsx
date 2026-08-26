import { cn } from "@/lib/utils";

interface FilterPillsProps<T extends string> {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterPills<T extends string>({ options, value, onChange }: FilterPillsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            "min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "border-blue bg-blue/15 text-blue-light"
              : "border-border text-text-secondary hover:border-border-strong hover:text-text"
          )}
        >
          {opt.label}
          {typeof opt.count === "number" && <span className="ml-1.5 text-xs opacity-70">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}
