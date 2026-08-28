"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/nav-items";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-5 top-1/2 z-40 hidden max-h-[calc(100vh-40px)] -translate-y-1/2 lg:block">
      <nav
        className="flex max-h-[calc(100vh-40px)] flex-col items-center gap-1 overflow-y-auto rounded-full border border-border bg-card/80 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        aria-label="Primary"
      >
        <Link
          href="/home"
          className="mb-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue/15 text-blue-light transition-colors hover:bg-blue/25"
          aria-label="Amari home"
        >
          <BrandMark size={18} />
        </Link>
        <div className="my-0.5 h-px w-6 flex-shrink-0 bg-border" />
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                active ? "bg-text text-bg" : "text-text-secondary hover:bg-card-secondary hover:text-text"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
