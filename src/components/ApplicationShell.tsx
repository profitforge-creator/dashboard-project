import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileBottomNavigation } from "@/components/MobileBottomNavigation";

interface ApplicationShellProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function ApplicationShell({ children, rightPanel }: ApplicationShellProps) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <DesktopSidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden pb-24 lg:pb-0">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
      {rightPanel && (
        <aside className="sticky top-0 hidden h-dvh w-80 flex-shrink-0 overflow-y-auto border-l border-border bg-bg-raised p-5 xl:block">
          {rightPanel}
        </aside>
      )}
      <MobileBottomNavigation />
    </div>
  );
}
