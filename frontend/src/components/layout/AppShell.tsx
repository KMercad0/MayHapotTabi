import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <span className="font-mono text-xs sm:text-sm font-medium">MayHapotTabi</span>
        <ThemeToggle />
      </header>
      <main className="flex-1 overflow-auto p-4">{children}</main>
    </div>
  );
}
