"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "./AppHeader";
import { PersonaPicker } from "./PersonaPicker";
import { Dashboard } from "./Dashboard";
import { DetailView } from "./DetailView";
import { ChatView } from "./ChatView";
import { PlanView } from "./PlanView";
import { TasksView } from "./TasksView";
import { ServicesView } from "./ServicesView";
import { WalletView } from "./WalletView";
import { MessageInput } from "./MessageInput";
import { PersonaSelectorOverlay } from "./PersonaSelectorOverlay";
import { PersonalDataDashboard } from "./personal-data/PersonalDataDashboard";
import { Toast } from "./ui/Toast";
import { BottomSheet } from "./ui/BottomSheet";
import { AgentSelectionSheet } from "./sheets/AgentSelectionSheet";
import { AgentIntroScreen } from "./sheets/AgentIntroScreen";
import { TaskDetailSheet } from "./sheets/TaskDetailSheet";
import { TopicQuestionsSheet } from "./sheets/TopicQuestionsSheet";
import { FilingPromptSheet } from "./sheets/FilingPromptSheet";
import { PaymentSheet } from "./sheets/PaymentSheet";
import { WalletCredentialSheet } from "./sheets/WalletCredentialSheet";
import { ConsentPreferenceSheet } from "./sheets/ConsentPreferenceSheet";
import { LoginSheet } from "./sheets/LoginSheet";
import { OneLoginNotification } from "./OneLoginNotification";
import { getAllTerminalStateIds } from "@als/schemas";

const TERMINAL_STATES = getAllTerminalStateIds();

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
      className={`flex flex-col items-center gap-0.5 flex-1 py-2 text-[11px] font-medium transition-colors touch-feedback ${
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
  const agent = useAppStore((s) => s.agent);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200"
      style={{ paddingBottom: "var(--safe-area-bottom)" }}
    >
      <div className="max-w-[960px] mx-auto flex">
        <TabButton
          label="Home"
          active={
            currentView === "dashboard" ||
            currentView === "detail" ||
            currentView === "plan"
          }
          onClick={() => {
            startNewConversation(null);
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
        {agent === "none" ? (
          <TabButton
            label="Services"
            active={currentView === "services"}
            onClick={() => navigateTo("services")}
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
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            }
          />
        ) : (
          <TabButton
            label={agent === "max" ? "Max" : "Dot"}
            active={currentView === "chat"}
            onClick={() => {
              const state = useAppStore.getState();
              if (state.conversationHistory.length > 0) {
                state.startNewConversation(null, null);
              }
              navigateTo("chat");
              if (
                state.persona === "sarah-okafor" &&
                state.serviceMode === "demo"
              ) {
                useAppStore.setState({
                  autoTypeMessage:
                    "My husband died three weeks ago and I don't know what to do",
                });
              }
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
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            }
          />
        )}
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
          label="Wallet"
          active={currentView === "wallet"}
          onClick={() => navigateTo("wallet")}
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
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
              <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          }
        />
      </div>
    </nav>
  );
}

function BottomSheetLayer() {
  const bottomSheet = useAppStore((s) => s.bottomSheet);
  const closeBottomSheet = useAppStore((s) => s.closeBottomSheet);

  if (!bottomSheet.type) return null;

  const sheetContent = (() => {
    switch (bottomSheet.type) {
      case "agent-selection":
        return <AgentSelectionSheet />;
      case "task-detail":
        return <TaskDetailSheet data={bottomSheet.data} />;
      case "topic-questions":
        return <TopicQuestionsSheet data={bottomSheet.data} />;
      case "filing-prompt":
        return <FilingPromptSheet />;
      case "payment":
        return <PaymentSheet />;
      case "wallet-credential":
        return <WalletCredentialSheet data={bottomSheet.data as Parameters<typeof WalletCredentialSheet>[0]["data"]} />;
      case "consent-preference":
        return <ConsentPreferenceSheet data={bottomSheet.data as Parameters<typeof ConsentPreferenceSheet>[0]["data"]} />;
      case "one-login":
        return <LoginSheet key="one-login" loginType="one-login" />;
      case "government-gateway":
        return <LoginSheet key="government-gateway" loginType="government-gateway" />;
      default:
        return null;
    }
  })();

  const title = (() => {
    switch (bottomSheet.type) {
      case "agent-selection":
        return "Choose your agent";
      case "task-detail":
        return "Task details";
      case "topic-questions":
        return (bottomSheet.data as { topic?: string })?.topic || "Questions";
      case "filing-prompt":
        return "Save conversation";
      case "payment":
        return "Apple Pay";
      case "wallet-credential":
        return "Credential details";
      case "consent-preference":
        return "Data permission";
      case "one-login":
        return "GOV.UK One Login";
      case "government-gateway":
        return "Government Gateway";
      default:
        return undefined;
    }
  })();

  return (
    <BottomSheet open={true} onClose={closeBottomSheet} title={title}>
      {sheetContent}
    </BottomSheet>
  );
}

export function AppShell() {
  const currentView = useAppStore((s) => s.currentView);
  const persona = useAppStore((s) => s.persona);
  const ucState = useAppStore((s) => s.ucState);
  const setPersona = useAppStore((s) => s.setPersona);
  const setAgent = useAppStore((s) => s.setAgent);
  const settingsPaneOpen = useAppStore((s) => s.settingsPaneOpen);
  const personaSelectorOpen = useAppStore((s) => s.personaSelectorOpen);
  const agent = useAppStore((s) => s.agent);
  const agentIntroVisible = useAppStore((s) => s.agentIntroVisible);

  const journeyComplete = !!(ucState && TERMINAL_STATES.has(ucState));
  const isManualMode = agent === "none";

  // Restore persona and agent from sessionStorage on mount
  useEffect(() => {
    const savedAgent = sessionStorage.getItem("c02_agent") as
      | "dot"
      | "max"
      | "none"
      | null;
    if (savedAgent) {
      setAgent(savedAgent);
    }
    const savedPlanSource = sessionStorage.getItem("c02_planSource") as
      | "graph"
      | "studio"
      | null;
    if (savedPlanSource) {
      useAppStore.setState({ planSource: savedPlanSource });
    }
    const savedAuthMode = sessionStorage.getItem("c02_authMode") as
      | "off"
      | "one-login"
      | null;
    if (savedAuthMode) {
      useAppStore.setState({ authMode: savedAuthMode });
    }
    if (!persona) {
      const savedPersona = sessionStorage.getItem("c02_persona");
      if (savedPersona) {
        setPersona(savedPersona);
      } else {
        // No saved persona — show persona picker
        useAppStore.setState({ currentView: "persona-picker" });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // iOS keyboard offset
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const offset = window.innerHeight - vv.height;
      document.documentElement.style.setProperty(
        "--keyboard-offset",
        `${offset}px`,
      );
    };

    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  const showInput =
    persona &&
    !isManualMode &&
    currentView !== "persona-picker" &&
    currentView !== "plan" &&
    currentView !== "tasks" &&
    currentView !== "services" &&
    currentView !== "wallet" &&
    !journeyComplete;

  return (
    <div className="h-screen flex flex-col bg-govuk-page-bg overflow-hidden">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-[100] focus:bg-govuk-yellow focus:text-govuk-black focus:px-4 focus:py-2 focus:text-sm focus:font-bold"
      >
        Skip to main content
      </a>

      <AppHeader />

      {/* Main content — the only scrollable area */}
      <main
        id="main-content"
        role="main"
        className="flex-1 overflow-y-auto flex flex-col min-h-0 pb-14"
      >
        <div
          className={`grow shrink-0 ${currentView === "chat" ? "flex flex-col min-h-0" : "max-w-[960px] mx-auto w-full px-4 py-6 pb-4"}`}
        >
          {currentView === "persona-picker" && <PersonaPicker />}
          {currentView === "dashboard" && <Dashboard />}
          {currentView === "detail" && <DetailView />}
          {currentView === "chat" &&
            (isManualMode ? <Dashboard /> : <ChatView />)}
          {currentView === "services" && <ServicesView />}
          {currentView === "plan" && <PlanView />}
          {currentView === "tasks" && <TasksView />}
          {currentView === "wallet" && <WalletView />}
        </div>

        {/* Chat input — in document flow, pushed to bottom on short pages */}
        {showInput && <MessageInput />}
      </main>

      {/* Bottom tab navigation */}
      {currentView !== "persona-picker" && <BottomTabBar />}

      {/* Bottom sheets */}
      <BottomSheetLayer />

      {/* Overlays */}
      {personaSelectorOpen && <PersonaSelectorOverlay />}
      {settingsPaneOpen && <PersonalDataDashboard />}

      {/* Agent intro full-screen overlay */}
      {agentIntroVisible && <AgentIntroScreen />}

      {/* One Login code arriving on the phone */}
      <OneLoginNotification />

      {/* Toast */}
      <Toast />
    </div>
  );
}
