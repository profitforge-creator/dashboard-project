import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
      <Icon className="h-8 w-8 text-text-secondary/60" strokeWidth={1.5} aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        {description && <p className="mt-1 max-w-[26ch] text-sm text-text-secondary">{description}</p>}
      </div>
    </div>
  );
}
