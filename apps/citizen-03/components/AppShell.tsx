"use client";

import { useAppStore } from "@/lib/store";
import { PersonaPicker } from "./PersonaPicker";
import { Dashboard } from "./Dashboard";
import { ChatView } from "./ChatView";
import { PersonalDataPanel } from "./PersonalDataPanel";

export function AppShell() {
  const currentView = useAppStore((s) => s.currentView);
  const settingsPanelOpen = useAppStore((s) => s.settingsPanelOpen);
  const toggleSettings = useAppStore((s) => s.toggleSettings);

  return (
    <div className="flex flex-col h-full bg-govuk-page-bg">
      {currentView === "persona-picker" && <PersonaPicker />}
      {currentView === "dashboard" && <Dashboard />}
      {currentView === "chat" && <ChatView />}

      {/* Personal data panel overlay */}
      {settingsPanelOpen && <PersonalDataPanel onClose={toggleSettings} />}
    </div>
  );
}
