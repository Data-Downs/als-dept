"use client";

import { useAppStore } from "@/lib/store";
import { PersonaPicker } from "./PersonaPicker";
import { Dashboard } from "./Dashboard";
import { ChatView } from "./ChatView";

export function AppShell() {
  const currentView = useAppStore((s) => s.currentView);

  return (
    <div className="flex flex-col h-full bg-govuk-page-bg">
      {currentView === "persona-picker" && <PersonaPicker />}
      {currentView === "dashboard" && <Dashboard />}
      {currentView === "chat" && <ChatView />}
    </div>
  );
}
