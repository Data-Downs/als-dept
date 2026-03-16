/**
 * citizen-03 Store — Simplified Zustand store
 *
 * Unlike citizen-02's 863-line store that manages UC state machines,
 * consent flows, card resolution, task pipelines, and plan tracking,
 * this store is thin: it manages persona, navigation, and chat history.
 *
 * The LLM handles service reasoning via tools. The store just tracks
 * the conversation and UI state.
 */

import { create } from "zustand";
import type {
  ChatMessage,
  ChatApiResponse,
  Conversation,
  ViewType,
  PersonaData,
  ToolUseRecord,
  AgentCard,
  AgentTask,
  ConsentGrant,
  ActivePlan,
  ToolProgress,
  StreamEvent,
} from "./types";

interface AppStore {
  // Identity
  persona: string | null;
  personaData: PersonaData | null;

  // Navigation
  currentView: ViewType;
  viewHistory: ViewType[];
  currentService: string | null;
  serviceName: string | null;

  // Timeline
  dismissedTimelineItems: Set<string>;

  // Chat
  messages: ChatMessage[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  reasoning: string;
  hasNewReasoning: boolean;
  isLoading: boolean;
  lastToolsUsed: string[];
  lastToolUseLog: ToolUseRecord[];
  lastIterations: number;
  lastTraceId: string;
  cards: AgentCard[];
  quickReplies: string[];

  // Tasks + Consent
  tasks: AgentTask[];
  taskCompletions: Record<string, string>;
  tasksSubmitted: boolean;
  consentRequests: ConsentGrant[];
  consentDecisions: Record<string, "granted" | "denied">;
  consentSubmitted: boolean;

  // Plans
  activePlans: ActivePlan[];
  currentPlanId: string | null;

  // Streaming
  toolProgress: ToolProgress[];
  streamingText: string;

  // UI panels
  settingsPanelOpen: boolean;
  showTrace: boolean;

  // Actions
  setPersona: (id: string) => Promise<void>;
  navigateTo: (view: ViewType, service?: string, serviceName?: string) => void;
  navigateBack: () => void;
  sendMessage: (text: string) => Promise<void>;
  startNewConversation: (service?: string, serviceName?: string) => void;
  dismissTimelineItem: (itemId: string) => void;
  loadConversation: (id: string) => void;
  clearReasoningBadge: () => void;
  toggleSettings: () => void;
  toggleTrace: () => void;
  setTaskCompletion: (taskId: string, value: string) => void;
  resetTaskCompletion: (taskId: string) => void;
  submitTasks: () => void;
  setConsentDecision: (grantId: string, decision: "granted" | "denied") => void;
  submitConsent: () => void;
  startPlan: (plan: ActivePlan) => void;
  loadPlan: (planId: string) => void;
  markServiceStatus: (
    planId: string,
    serviceId: string,
    status: import("./types").ServicePlanStatus,
  ) => void;
}

// localStorage-backed conversations
function getConversations(personaId: string): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`c03_conversations_${personaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversation(personaId: string, conversation: Conversation) {
  if (typeof window === "undefined") return;
  const all = getConversations(personaId);
  const idx = all.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) all[idx] = conversation;
  else all.unshift(conversation);
  while (all.length > 20) all.pop();
  try {
    localStorage.setItem(`c03_conversations_${personaId}`, JSON.stringify(all));
  } catch {
    /* storage full */
  }
}

export { getConversations };

// ── SSE stream reader ──

async function readSSEStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          onEvent(JSON.parse(data));
        } catch {
          /* malformed event */
        }
      }
    }
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  persona: null,
  personaData: null,
  currentView: "persona-picker",
  viewHistory: [],
  currentService: null,
  serviceName: null,
  dismissedTimelineItems: new Set(),
  messages: [],
  activeConversationId: null,
  activeConversation: null,
  reasoning: "",
  hasNewReasoning: false,
  isLoading: false,
  lastToolsUsed: [],
  lastToolUseLog: [],
  lastIterations: 0,
  lastTraceId: "",
  cards: [],
  quickReplies: [],
  tasks: [],
  taskCompletions: {},
  tasksSubmitted: false,
  consentRequests: [],
  consentDecisions: {},
  consentSubmitted: false,
  activePlans: [],
  currentPlanId: null,
  toolProgress: [],
  streamingText: "",
  settingsPanelOpen: false,
  showTrace: false,

  setPersona: async (id: string) => {
    set({
      persona: id,
      messages: [],
      activeConversationId: null,
      activeConversation: null,
      reasoning: "",
      hasNewReasoning: false,
      currentView: "dashboard",
    });

    if (typeof window !== "undefined") {
      sessionStorage.setItem("c03_persona", id);
    }

    try {
      const response = await fetch(`/api/persona/${id}`);
      if (response.ok) {
        const data = await response.json();
        set({ personaData: data });
      }
    } catch {
      // persona data is optional
    }
  },

  navigateTo: (view: ViewType, service?: string, serviceName?: string) => {
    const state = get();
    set({
      viewHistory: [...state.viewHistory, state.currentView],
      currentView: view,
      ...(service !== undefined ? { currentService: service } : {}),
      ...(serviceName !== undefined ? { serviceName } : {}),
    });
  },

  navigateBack: () => {
    const state = get();
    const prev = state.viewHistory[state.viewHistory.length - 1] || "dashboard";
    set({
      currentView: prev,
      viewHistory: state.viewHistory.slice(0, -1),
    });
  },

  startNewConversation: (service?: string, serviceName?: string) => {
    set({
      messages: [],
      currentService: service || null,
      serviceName: serviceName || null,
      activeConversationId: null,
      activeConversation: null,
      reasoning: "",
      hasNewReasoning: false,
      lastToolsUsed: [],
      lastToolUseLog: [],
      lastIterations: 0,
      lastTraceId: "",
      cards: [],
      quickReplies: [],
      tasks: [],
      taskCompletions: {},
      tasksSubmitted: false,
      consentRequests: [],
      consentDecisions: {},
      consentSubmitted: false,
      toolProgress: [],
      streamingText: "",
      currentView: "chat",
    });
  },

  loadConversation: (id: string) => {
    const state = get();
    if (!state.persona) return;
    const conv = getConversations(state.persona).find((c) => c.id === id);
    if (conv) {
      set({
        activeConversationId: conv.id,
        activeConversation: conv,
        messages: conv.messages,
        currentView: "chat",
      });
    }
  },

  sendMessage: async (text: string) => {
    const state = get();
    if (!state.persona || state.isLoading) return;

    const isNew = state.messages.length === 0;
    const updated: ChatMessage[] = [
      ...state.messages,
      { role: "user", content: text },
    ];
    set({
      messages: updated,
      isLoading: true,
      toolProgress: [],
      cards: [],
      quickReplies: [],
      tasks: [],
      taskCompletions: {},
      tasksSubmitted: false,
      consentRequests: [],
      consentDecisions: {},
      consentSubmitted: false,
    });

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: state.persona,
          messages: updated,
          generateTitle: isNew,
        }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as Record<
          string,
          string
        >;
        throw new Error(err.details || err.error || `HTTP ${response.status}`);
      }

      // Check if it's a streaming response
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        // Stream mode
        let finalData: ChatApiResponse | null = null;

        await readSSEStream(response, (event) => {
          switch (event.type) {
            case "tool_start":
              set((s) => ({
                toolProgress: [
                  ...s.toolProgress,
                  { tool: event.tool, label: event.label, status: "running" },
                ],
              }));
              break;

            case "tool_complete":
              set((s) => ({
                toolProgress: s.toolProgress.map((tp) =>
                  tp.tool === event.tool && tp.status === "running"
                    ? {
                        ...tp,
                        status: event.isError ? "error" : "complete",
                        summary: event.summary,
                        durationMs: event.durationMs,
                      }
                    : tp,
                ),
              }));
              break;

            case "reasoning":
              set({ reasoning: event.text, hasNewReasoning: true });
              break;

            case "response":
              finalData = event as unknown as ChatApiResponse;
              break;

            case "error":
              throw new Error(event.message);
          }
        });

        if (finalData) {
          const data = finalData as ChatApiResponse;
          const newHistory: ChatMessage[] = [
            ...updated,
            { role: "assistant", content: data.response },
          ];

          const conversationId =
            state.activeConversationId || `conv_${Date.now()}`;
          const conversation: Conversation = state.activeConversation
            ? {
                ...state.activeConversation,
                messages: newHistory,
                updatedAt: new Date().toISOString(),
              }
            : {
                id: conversationId,
                title: data.conversationTitle || "New conversation",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: newHistory,
              };

          if (data.conversationTitle && !state.activeConversation) {
            conversation.title = data.conversationTitle;
          }

          saveConversation(state.persona!, conversation);

          set({
            messages: newHistory,
            activeConversationId: conversationId,
            activeConversation: conversation,
            reasoning: data.reasoning,
            hasNewReasoning: !!data.reasoning,
            isLoading: false,
            lastToolsUsed: data.toolsUsed,
            lastToolUseLog: data.toolUseLog,
            lastIterations: data.iterations,
            lastTraceId: data.traceId,
            cards: data.cards || [],
            quickReplies: data.quickReplies || [],
            tasks: data.tasks || [],
            consentRequests: data.consentRequests || [],
            taskCompletions: {},
            tasksSubmitted: false,
            consentDecisions: {},
            consentSubmitted: false,
          });
        } else {
          throw new Error("Stream ended without a response");
        }
      } else {
        // Fallback: non-streaming JSON response
        const data: ChatApiResponse = await response.json();
        const newHistory: ChatMessage[] = [
          ...updated,
          { role: "assistant", content: data.response },
        ];

        const conversationId =
          state.activeConversationId || `conv_${Date.now()}`;
        const conversation: Conversation = state.activeConversation
          ? {
              ...state.activeConversation,
              messages: newHistory,
              updatedAt: new Date().toISOString(),
            }
          : {
              id: conversationId,
              title: data.conversationTitle || "New conversation",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: newHistory,
            };

        if (data.conversationTitle && !state.activeConversation) {
          conversation.title = data.conversationTitle;
        }

        saveConversation(state.persona!, conversation);

        set({
          messages: newHistory,
          activeConversationId: conversationId,
          activeConversation: conversation,
          reasoning: data.reasoning,
          hasNewReasoning: !!data.reasoning,
          isLoading: false,
          lastToolsUsed: data.toolsUsed,
          lastToolUseLog: data.toolUseLog,
          lastIterations: data.iterations,
          lastTraceId: data.traceId || "",
          cards: data.cards || [],
          quickReplies: data.quickReplies || [],
          tasks: data.tasks || [],
          consentRequests: data.consentRequests || [],
          taskCompletions: {},
          tasksSubmitted: false,
          consentDecisions: {},
          consentSubmitted: false,
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Something went wrong";
      set({
        messages: [
          ...updated,
          {
            role: "assistant",
            content: `Something went wrong.\n\n${errorMsg}`,
          },
        ],
        isLoading: false,
        toolProgress: [],
      });
    }
  },

  dismissTimelineItem: (itemId: string) => {
    set((s) => ({
      dismissedTimelineItems: new Set([...s.dismissedTimelineItems, itemId]),
    }));
  },

  clearReasoningBadge: () => set({ hasNewReasoning: false }),
  toggleSettings: () =>
    set((s) => ({ settingsPanelOpen: !s.settingsPanelOpen })),
  toggleTrace: () =>
    set((s) => {
      if (s.hasNewReasoning && !s.showTrace) {
        return { showTrace: true, hasNewReasoning: false };
      }
      return { showTrace: !s.showTrace };
    }),

  setTaskCompletion: (taskId: string, value: string) => {
    set((s) => ({
      taskCompletions: { ...s.taskCompletions, [taskId]: value },
    }));
  },

  resetTaskCompletion: (taskId: string) => {
    set((s) => {
      const next = { ...s.taskCompletions };
      delete next[taskId];
      return { taskCompletions: next };
    });
  },

  submitTasks: () => {
    const state = get();
    if (state.tasksSubmitted || state.tasks.length === 0) return;
    set({ tasksSubmitted: true });

    // Format completed tasks into a structured message for the agent
    const parts: string[] = ["Here are the details I've provided:"];
    for (const task of state.tasks) {
      const completion = state.taskCompletions[task.id];
      if (completion) {
        parts.push(`\n${completion}`);
      } else if (task.type === "agent") {
        parts.push(`\nAgent task: ${task.description} — please proceed`);
      }
    }
    state.sendMessage(parts.join(""));
  },

  setConsentDecision: (grantId: string, decision: "granted" | "denied") => {
    set((s) => ({
      consentDecisions: { ...s.consentDecisions, [grantId]: decision },
    }));
  },

  submitConsent: () => {
    const state = get();
    if (state.consentSubmitted || state.consentRequests.length === 0) return;
    set({ consentSubmitted: true });

    const parts: string[] = ["My consent decisions:"];
    for (const grant of state.consentRequests) {
      const decision = state.consentDecisions[grant.id] || "not decided";
      parts.push(`\n- ${grant.description}: ${decision}`);
    }
    state.sendMessage(parts.join(""));
  },

  startPlan: (plan: ActivePlan) => {
    const state = get();
    const exists = state.activePlans.find((p) => p.id === plan.id);
    if (exists) {
      set({ currentPlanId: plan.id, currentView: "plan" });
      return;
    }
    set({
      activePlans: [...state.activePlans, plan],
      currentPlanId: plan.id,
      currentView: "plan",
    });
    // Persist
    if (state.persona && typeof window !== "undefined") {
      try {
        const updated = [...state.activePlans, plan];
        localStorage.setItem(
          `c03_plans_${state.persona}`,
          JSON.stringify(updated),
        );
      } catch {
        /* storage full */
      }
    }
  },

  loadPlan: (planId: string) => {
    set({ currentPlanId: planId, currentView: "plan" });
  },

  markServiceStatus: (planId: string, serviceId: string, status) => {
    set((s) => ({
      activePlans: s.activePlans.map((p) =>
        p.id === planId
          ? {
              ...p,
              serviceProgress: { ...p.serviceProgress, [serviceId]: status },
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  },
}));
