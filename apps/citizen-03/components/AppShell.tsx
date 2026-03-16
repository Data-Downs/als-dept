"use client";

import { useAppStore } from "@/lib/store";
import { PersonaPicker } from "./PersonaPicker";
import { Dashboard } from "./Dashboard";
import { ChatView } from "./ChatView";
import { PlanView } from "./PlanView";
import { PersonalDataPanel } from "./PersonalDataPanel";

function TabButton({
  label,
  icon,
  active,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-0.5 flex-1 py-2 text-[11px] font-medium transition-colors ${
        active
          ? "text-govuk-blue"
          : disabled
            ? "text-govuk-mid-grey"
            : "text-govuk-dark-grey"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function BottomTabBar() {
  const currentView = useAppStore((s) => s.currentView);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const startNewConversation = useAppStore((s) => s.startNewConversation);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 pb-6">
      <div className="flex">
        <TabButton
          label="Home"
          active={
            currentView === "dashboard" ||
            currentView === "detail" ||
            currentView === "plan"
          }
          onClick={() => {
            startNewConversation();
            navigateTo("dashboard");
          }}
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        />
        <TabButton
          label="Dot"
          active={currentView === "chat"}
          onClick={() => navigateTo("chat")}
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          }
        />
        <TabButton
          label="To do"
          active={currentView === "tasks"}
          onClick={() => navigateTo("tasks")}
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
        />
        <TabButton
          label="About"
          active={false}
          onClick={() => {}}
          disabled
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          }
        />
      </div>
    </nav>
  );
}

export function AppShell() {
  const currentView = useAppStore((s) => s.currentView);
  const settingsPanelOpen = useAppStore((s) => s.settingsPanelOpen);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const persona = useAppStore((s) => s.persona);

  return (
    <div className="h-screen flex flex-col bg-govuk-page-bg overflow-hidden">
      {currentView === "persona-picker" && <PersonaPicker />}
      {currentView === "dashboard" && <Dashboard />}
      {currentView === "chat" && <ChatView />}
      {currentView === "detail" && <ChatView />}
      {currentView === "tasks" && <Dashboard />}
      {currentView === "plan" && <PlanView />}

      {/* Bottom tab navigation — shown on all views except persona picker */}
      {currentView !== "persona-picker" && persona && <BottomTabBar />}

      {/* Personal data panel overlay */}
      {settingsPanelOpen && <PersonalDataPanel onClose={toggleSettings} />}
    </div>
  );
}
