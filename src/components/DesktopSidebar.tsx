"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/components/nav-items";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function DesktopSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh flex-shrink-0 flex-col border-r border-border bg-bg-raised transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-bg">
          <span className="h-3 w-3 rounded-full bg-blue shadow-[0_0_10px_rgba(47,107,255,0.9)]" />
        </div>
        {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-text">Amari</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active ? "bg-blue/12 text-blue-light" : "text-text-secondary hover:bg-card hover:text-text"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={2} aria-hidden="true" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={signOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-card hover:text-text"
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={2} />
          {!collapsed && "Sign out"}
        </button>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-card hover:text-text"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-[18px] w-[18px]" strokeWidth={2} /> : <ChevronsLeft className="h-[18px] w-[18px]" strokeWidth={2} />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
