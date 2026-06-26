import { create } from "zustand";
import type {
  PersonaData,
  AgentType,
  ServiceMode,
  PlanSource,
  ServiceType,
  ViewType,
  Conversation,
  StoredTask,
  ChatMessage,
  ChatApiResponse,
  UCStateInfo,
  ConsentGrant,
  ActivePlan,
  ServicePlanStatus,
  LifeEventInfo,
  EnrichedData,
  BottomSheetState,
  ToastMessage,
  TaskField,
} from "./types";
import type { CardRequest, PipelineTrace, ConsentPreference } from "@als/schemas";
import type { JourneyOutcome } from "./outcome-types";
import type { WalletCredential } from "@als/identity/src/credential-types";
import { getAllTerminalStateIds } from "@als/schemas";
import { computePlanRelevance } from "./plan-relevance";

interface AppStore {
  // Identity
  persona: string | null;
  agent: AgentType;
  serviceMode: ServiceMode;
  planSource: PlanSource;
  personaData: PersonaData | null;
  enrichedData: EnrichedData | null;

  // Navigation
  currentView: ViewType;
  currentService: ServiceType | null;
  serviceName: string | null;
  viewHistory: Array<{
    view: ViewType;
    service: ServiceType | null;
    serviceName: string | null;
  }>;

  // Chat
  conversationHistory: ChatMessage[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  currentReasoning: string;
  hasNewReasoning: boolean;
  isLoading: boolean;
  /** When set, MessageInput animates the string into its textarea and submits. */
  autoTypeMessage: string | null;

  // Handoff
  activeHandoff: {
    triggered: boolean;
    reason?: string;
    description?: string;
    urgency?: string;
    routing?: Record<string, unknown>;
  } | null;

  // UC State Journey
  ucState: string | null;
  ucStateHistory: string[];
  lastUcStateInfo: UCStateInfo | null;
  pendingConsent: ConsentGrant[];
  consentDecisions: Record<string, "granted" | "denied">;
  consentSubmitted: boolean;
  resolvedConsents: Array<{
    grantId: string;
    preferenceId: string;
    reason: string;
  }>;
  lastResponseTasks: Array<{
    id: string;
    description: string;
    detail: string;
    type: "agent" | "user";
    dueDate: string | null;
    dataNeeded: string[];
    fields?: TaskField[];
  }>;
  taskCompletions: Record<string, string>;
  tasksSubmitted: boolean;
  taskVersion: number;

  // Interaction type (from chat API — used for dynamic milestones)
  interactionType: string | null;

  // Pipeline trace
  lastPipelineTrace: PipelineTrace | null;

  // Dynamic Cards
  pendingCards: CardRequest[];
  cardsSubmitted: boolean;

  // Decision Gates
  pendingGates: Array<{
    gateId: string;
    definition: {
      id: string;
      question: string;
      helpText?: string;
      sensitive?: boolean;
      options: Array<{
        value: string;
        label: string;
        consequence?: string;
        routingEffect?: {
          enableServices?: string[];
          skipServices?: string[];
          setFacts?: Record<string, string>;
        };
      }>;
    };
  }>;
  gateDecisions: Record<string, string>;
  gateSubmitted: boolean;

  // Journey Outcomes
  pendingOutcomes: JourneyOutcome[];

  // Life events (fetched once on persona load)
  lifeEvents: LifeEventInfo[];

  // Active plans
  activePlanId: string | null;
  activePlan: ActivePlan | null;

  // Wallet
  walletCredentials: WalletCredential[];
  earnedCredentials: WalletCredential[];

  // Consent preferences
  consentPreferences: ConsentPreference[];

  // Life event mode (chat-driven multi-service journey)
  lifeEventMode: boolean;
  lifeEventId: string | null;

  // UI overlays
  settingsPaneOpen: boolean;
  personaSelectorOpen: boolean;
  bottomSheet: BottomSheetState;
  toast: ToastMessage | null;
  agentIntroVisible: boolean;
  previousAgent: AgentType | null;

  // Actions
  setPersona: (id: string) => Promise<void>;
  setAgent: (agent: AgentType) => void;
  setServiceMode: (mode: ServiceMode) => void;
  setPlanSource: (source: PlanSource) => Promise<void>;
  navigateTo: (
    view: ViewType,
    service?: ServiceType | null,
    serviceName?: string | null,
  ) => void;
  navigateBack: () => void;
  sendMessage: (text: string) => Promise<void>;
  startNewConversation: (
    service?: ServiceType | null,
    serviceName?: string | null,
  ) => void;
  loadConversation: (conversationId: string) => void;
  setReasoning: (reasoning: string) => void;
  clearReasoningBadge: () => void;
  setConsentDecision: (grantId: string, decision: "granted" | "denied") => void;
  clearConsentDecision: (grantId: string) => void;
  submitConsent: () => Promise<void>;
  setGateDecision: (gateId: string, value: string) => void;
  clearGateDecision: (gateId: string) => void;
  submitGateDecision: () => Promise<void>;
  setTaskCompletion: (taskId: string, message: string) => void;
  clearTaskCompletion: (taskId: string) => void;
  submitTasks: () => Promise<void>;
  submitCardsSummary: (summaryMessage: string) => Promise<void>;
  setSettingsPaneOpen: (open: boolean) => void;
  setPersonaSelectorOpen: (open: boolean) => void;
  openBottomSheet: (type: BottomSheetState["type"], data?: unknown) => void;
  closeBottomSheet: () => void;
  showToast: (text: string) => void;
  showAgentIntro: () => void;
  dismissAgentIntro: (accepted: boolean) => void;

  dismissTimelineItem: (itemId: string) => void;
  addToWallet: (credential: WalletCredential) => void;
  loadConsentPreferences: () => Promise<void>;
  addConsentPreference: (
    pref: Omit<ConsentPreference, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateConsentPreference: (
    id: string,
    updates: { scope?: ConsentPreference["scope"]; decision?: ConsentPreference["decision"] },
  ) => Promise<void>;
  revokeConsentPreference: (id: string) => Promise<void>;

  // Plan actions
  deletePlan: (planId: string) => void;
  startPlan: (lifeEvent: LifeEventInfo) => void;
  loadPlan: (planId: string) => void;
  startServiceFromPlan: (serviceId: string, serviceName: string) => void;
  markServiceInProgress: (serviceId: string, conversationId: string) => void;
  markServiceCompleted: (serviceId: string) => void;
  markServiceSkipped: (serviceId: string) => void;
  completeServiceWithUpload: (
    serviceId: string,
    fields: Record<string, string | number | boolean>,
  ) => Promise<void>;
}

// localStorage-backed conversation store
function getConversations(personaId: string): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`c02_conversations_${personaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversation(personaId: string, conversation: Conversation) {
  if (typeof window === "undefined") return;
  const all = getConversations(personaId);
  const index = all.findIndex((c) => c.id === conversation.id);
  if (index >= 0) {
    all[index] = conversation;
  } else {
    all.unshift(conversation);
  }
  while (all.length > 20) all.pop();
  try {
    localStorage.setItem(`c02_conversations_${personaId}`, JSON.stringify(all));
  } catch {
    all.pop();
    try {
      localStorage.setItem(
        `c02_conversations_${personaId}`,
        JSON.stringify(all),
      );
    } catch {
      /* ignore */
    }
  }
}

function deleteConversation(personaId: string, conversationId: string) {
  if (typeof window === "undefined") return;
  const all = getConversations(personaId).filter(
    (c) => c.id !== conversationId,
  );
  try {
    localStorage.setItem(`c02_conversations_${personaId}`, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

// localStorage-backed task store
function saveTasks(personaId: string, tasks: StoredTask[]) {
  if (typeof window === "undefined") return;
  while (tasks.length > 50) tasks.pop();
  try {
    localStorage.setItem(`c02_tasks_${personaId}`, JSON.stringify(tasks));
  } catch {
    /* ignore */
  }
  // Bump version so components subscribed to taskVersion re-render
  useAppStore.setState((s) => ({ taskVersion: s.taskVersion + 1 }));
}

function getTasks(personaId: string): StoredTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`c02_tasks_${personaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// localStorage-backed wallet store (earned credentials from service completions)
function getEarnedCredentials(personaId: string): WalletCredential[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`c02_wallet_${personaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEarnedCredentials(
  personaId: string,
  credentials: WalletCredential[],
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `c02_wallet_${personaId}`,
      JSON.stringify(credentials),
    );
  } catch {
    /* ignore */
  }
}

// localStorage-backed plan store
function getActivePlans(personaId: string): ActivePlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`c02_plans_${personaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveActivePlan(personaId: string, plan: ActivePlan) {
  if (typeof window === "undefined") return;
  const all = getActivePlans(personaId);
  const index = all.findIndex((p) => p.id === plan.id);
  if (index >= 0) {
    all[index] = plan;
  } else {
    all.unshift(plan);
  }
  while (all.length > 10) all.pop();
  try {
    localStorage.setItem(`c02_plans_${personaId}`, JSON.stringify(all));
  } catch {
    all.pop();
    try {
      localStorage.setItem(`c02_plans_${personaId}`, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }
}

function getDismissedItems(personaId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`c02_dismissed_${personaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Create an ActivePlan from a life event without navigating. Reusable by startPlan and chat triage. */
function createActivePlan(
  lifeEvent: LifeEventInfo,
  personaData: PersonaData | null,
): ActivePlan | null {
  if (!lifeEvent.plan) return null;

  const entryIds = new Set(lifeEvent.plan.entryServiceIds);
  const serviceProgress: Record<string, ServicePlanStatus> = {};
  for (const svc of lifeEvent.services) {
    serviceProgress[svc.id] = entryIds.has(svc.id) ? "available" : "locked";
  }

  const irrelevant = computePlanRelevance(lifeEvent.services, personaData);
  const skipReasons: Record<string, string> = {};

  for (const [svcId, result] of Object.entries(irrelevant)) {
    serviceProgress[svcId] = "skipped";
    skipReasons[svcId] = result.reason;
  }

  // Unlock downstream services whose prerequisites are now all skipped
  const edges = lifeEvent.plan.edges;
  for (const skippedId of Object.keys(irrelevant)) {
    const downstreamIds = edges
      .filter((e) => e.from === skippedId)
      .map((e) => e.to);
    for (const toId of downstreamIds) {
      if (serviceProgress[toId] !== "locked") continue;
      if (irrelevant[toId]) continue;
      const prereqIds = edges.filter((e) => e.to === toId).map((e) => e.from);
      const allMet = prereqIds.every(
        (pid) =>
          serviceProgress[pid] === "completed" ||
          serviceProgress[pid] === "skipped",
      );
      if (allMet) serviceProgress[toId] = "available";
    }
  }

  return {
    id: `plan_${lifeEvent.id}_${Date.now()}`,
    lifeEventId: lifeEvent.id,
    lifeEventName: lifeEvent.name,
    lifeEventIcon: lifeEvent.icon,
    ...(lifeEvent.templateId
      ? {
          templateId: lifeEvent.templateId,
          templateVersion: lifeEvent.templateVersion,
        }
      : {}),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serviceProgress,
    serviceConversations: {},
    skipReasons,
    plan: lifeEvent.plan,
    services: lifeEvent.services,
  };
}

export {
  getConversations,
  deleteConversation,
  getTasks,
  saveTasks,
  getActivePlans,
  getDismissedItems,
  createActivePlan,
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppStore>((set, get) => ({
  persona: null,
  agent: "dot",
  serviceMode: "mcp",
  planSource: "graph",
  personaData: null,
  enrichedData: null,
  currentView: "persona-picker",
  currentService: null,
  serviceName: null,
  viewHistory: [],
  conversationHistory: [],
  activeConversationId: null,
  activeConversation: null,
  currentReasoning: "",
  hasNewReasoning: false,
  isLoading: false,
  autoTypeMessage: null,
  activeHandoff: null,
  ucState: null,
  ucStateHistory: [],
  lastUcStateInfo: null,
  pendingConsent: [],
  consentDecisions: {},
  consentSubmitted: false,
  resolvedConsents: [],
  lastResponseTasks: [],
  taskCompletions: {},
  tasksSubmitted: false,
  taskVersion: 0,
  interactionType: null,
  lastPipelineTrace: null,
  pendingCards: [],
  cardsSubmitted: false,
  pendingGates: [],
  gateDecisions: {},
  gateSubmitted: false,
  pendingOutcomes: [],
  lifeEvents: [],
  activePlanId: null,
  activePlan: null,
  walletCredentials: [],
  earnedCredentials: [],
  consentPreferences: [],
  lifeEventMode: false,
  lifeEventId: null,
  settingsPaneOpen: false,
  personaSelectorOpen: false,
  bottomSheet: { type: null },
  toast: null,
  agentIntroVisible: false,
  previousAgent: null,

  setSettingsPaneOpen: (open: boolean) => set({ settingsPaneOpen: open }),
  setPersonaSelectorOpen: (open: boolean) => set({ personaSelectorOpen: open }),

  openBottomSheet: (type, data) => set({ bottomSheet: { type, data } }),
  closeBottomSheet: () => set({ bottomSheet: { type: null } }),

  showToast: (text: string) => {
    if (toastTimer) clearTimeout(toastTimer);
    const id = `toast_${Date.now()}`;
    set({ toast: { id, text } });
    toastTimer = setTimeout(() => {
      set({ toast: null });
      toastTimer = null;
    }, 2000);
  },

  showAgentIntro: () => {
    set((s) => ({ agentIntroVisible: true, previousAgent: s.agent }));
  },

  dismissAgentIntro: (accepted: boolean) => {
    if (!accepted) {
      const prev = get().previousAgent;
      if (prev) {
        get().setAgent(prev);
      }
    }
    set({ agentIntroVisible: false, previousAgent: null });
  },

  setPersona: async (id: string) => {
    set({
      persona: id,
      conversationHistory: [],
      currentReasoning: "",
      hasNewReasoning: false,
      currentService: null,
      serviceName: null,
      viewHistory: [],
      activeConversationId: null,
      activeConversation: null,
      enrichedData: null,
      lifeEvents: [],
    });

    if (typeof window !== "undefined") {
      sessionStorage.setItem("c02_persona", id);
    }

    // Load earned credentials from localStorage
    set({ earnedCredentials: getEarnedCredentials(id) });

    try {
      const response = await fetch(`/api/personal-data/${id}/full`);
      if (response.ok) {
        const data = await response.json();
        set({
          personaData: data,
          walletCredentials: data.credentials ?? [],
        });
      }
    } catch (error) {
      console.error("Error loading persona:", error);
    }

    // Fetch life events before showing dashboard
    try {
      const leResp = await fetch(
        `/api/life-events?persona=${id}&source=${get().planSource}`,
      );
      if (leResp.ok) {
        const leData = await leResp.json();
        if (leData.lifeEvents) {
          set({ lifeEvents: leData.lifeEvents });
        }
      }
    } catch {
      // non-critical — dashboard still works without life events
    }

    set({ currentView: "dashboard" });

    // Load consent preferences in background
    get().loadConsentPreferences();

    // Fetch enrichment in background
    fetch(`/api/enrich/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.enriched) {
          set({ enrichedData: data });
        }
      })
      .catch(() => {});
  },

  setAgent: (agent: AgentType) => {
    set({ agent });
    if (typeof window !== "undefined") {
      sessionStorage.setItem("c02_agent", agent);
    }
  },

  setServiceMode: (mode: ServiceMode) => {
    set({ serviceMode: mode });
    if (typeof window !== "undefined") {
      sessionStorage.setItem("c02_serviceMode", mode);
    }
  },

  setPlanSource: async (source: PlanSource) => {
    set({ planSource: source });
    if (typeof window !== "undefined") {
      sessionStorage.setItem("c02_planSource", source);
    }
    // Re-fetch life events from the chosen source for the current persona.
    const id = get().persona;
    if (!id) return;
    try {
      const leResp = await fetch(
        `/api/life-events?persona=${id}&source=${source}`,
      );
      if (leResp.ok) {
        const leData = await leResp.json();
        if (leData.lifeEvents) {
          set({ lifeEvents: leData.lifeEvents });
        }
      }
    } catch {
      // non-critical — keep the existing list on failure
    }
  },

  navigateTo: (
    view: ViewType,
    service?: ServiceType | null,
    serviceName?: string | null,
  ) => {
    const state = get();
    if (state.currentView !== view) {
      set((s) => ({
        viewHistory: [
          ...s.viewHistory,
          {
            view: s.currentView,
            service: s.currentService,
            serviceName: s.serviceName,
          },
        ],
      }));
    }
    set({
      currentView: view,
      currentService: service !== undefined ? service : get().currentService,
      serviceName: serviceName !== undefined ? serviceName : get().serviceName,
    });
    // Scroll to top when navigating to a new view
    if (typeof window !== "undefined") {
      document.getElementById("main-content")?.scrollTo(0, 0);
    }
  },

  navigateBack: () => {
    const state = get();
    if (state.viewHistory.length > 0) {
      const prev = state.viewHistory[state.viewHistory.length - 1];
      set({
        viewHistory: state.viewHistory.slice(0, -1),
        currentView: prev.view,
        currentService: prev.view === "dashboard" ? null : prev.service,
        serviceName: prev.view === "dashboard" ? null : prev.serviceName,
      });
      if (typeof window !== "undefined") {
        document.getElementById("main-content")?.scrollTo(0, 0);
      }
    }
  },

  startNewConversation: (
    service?: ServiceType | null,
    serviceName?: string | null,
  ) => {
    set({
      conversationHistory: [],
      activeConversationId: null,
      activeConversation: null,
      currentReasoning: "",
      hasNewReasoning: false,
      ucState: null,
      ucStateHistory: [],
      lastUcStateInfo: null,
      interactionType: null,
      pendingConsent: [],
      consentDecisions: {},
      consentSubmitted: false,
      lastResponseTasks: [],
      taskCompletions: {},
      tasksSubmitted: false,
      lastPipelineTrace: null,
      pendingCards: [],
      cardsSubmitted: false,
      pendingGates: [],
      gateDecisions: {},
      gateSubmitted: false,
      pendingOutcomes: [],
    });
    if (service !== undefined) {
      set({ currentService: service });
    }
    if (serviceName !== undefined) {
      set({ serviceName: serviceName });
    }
  },

  loadConversation: (conversationId: string) => {
    const state = get();
    if (!state.persona) return;
    const conversations = getConversations(state.persona);
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      set({
        activeConversationId: conv.id,
        activeConversation: conv,
        conversationHistory: conv.messages,
        ucState: conv.ucState ?? null,
        ucStateHistory: conv.ucStateHistory ?? [],
        interactionType: conv.interactionType ?? null,
        lastResponseTasks: conv.tasks ?? [],
        taskCompletions: conv.taskCompletions ?? {},
        tasksSubmitted: conv.tasksSubmitted ?? false,
      });
    }
  },

  sendMessage: async (text: string) => {
    const TERMINAL_STATES = getAllTerminalStateIds();
    const state = get();
    if (!state.persona || !state.personaData || state.isLoading) return;
    if (state.ucState && TERMINAL_STATES.has(state.ucState)) return;

    const service = state.currentService;
    const LEGACY_SCENARIO_MAP: Record<string, string> = {
      driving: "driving",
      benefits: "benefits",
      family: "parenting",
    };
    const scenario = service
      ? LEGACY_SCENARIO_MAP[service] || service
      : "triage";
    const isNewConversation = state.conversationHistory.length === 0;

    const updatedHistory: ChatMessage[] = [
      ...state.conversationHistory,
      { role: "user", content: text },
    ];
    set({ conversationHistory: updatedHistory, isLoading: true });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: state.persona,
          agent: state.agent,
          scenario,
          messages: updatedHistory,
          generateTitle: isNewConversation,
          ucState: state.ucState,
          ucStateHistory: state.ucStateHistory,
          serviceMode: state.serviceMode,
          // Life event mode: pass context for multi-service awareness
          ...(state.lifeEventMode && state.lifeEventId
            ? {
                lifeEventId: state.lifeEventId,
                lifeEventCompletedServices: state.activePlan
                  ? Object.entries(state.activePlan.serviceProgress)
                      .filter(([, s]) => s === "completed")
                      .map(([id]) => id)
                  : [],
              }
            : {}),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<
          string,
          string
        >;
        const detail =
          errorData.details || errorData.error || `HTTP ${response.status}`;
        throw new Error(`Chat request failed: ${detail}`);
      }

      const data: ChatApiResponse = await response.json();

      const newHistory: ChatMessage[] = [
        ...updatedHistory,
        { role: "assistant", content: data.response },
      ];

      const conversationId = state.activeConversationId || `conv_${Date.now()}`;
      const conversation: Conversation = state.activeConversation
        ? {
            ...state.activeConversation,
            messages: newHistory,
            updatedAt: new Date().toISOString(),
          }
        : {
            id: conversationId,
            title: data.conversationTitle || "New conversation",
            service: service || "triage",
            agent: state.agent,
            scenario,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: newHistory,
          };

      if (data.conversationTitle && !state.activeConversation) {
        conversation.title = data.conversationTitle;
      }

      conversation.ucState =
        data.ucState?.currentState ?? state.ucState ?? undefined;
      conversation.ucStateHistory =
        data.ucState?.stateHistory ?? state.ucStateHistory ?? undefined;
      conversation.interactionType =
        data.interactionType ?? state.interactionType ?? undefined;

      if (data.tasks && data.tasks.length > 0) {
        conversation.tasks = data.tasks;
        conversation.taskCompletions = {};
        conversation.tasksSubmitted = false;
      } else {
        conversation.tasks = state.activeConversation?.tasks;
        conversation.taskCompletions = state.taskCompletions;
        conversation.tasksSubmitted = state.tasksSubmitted;
      }

      saveConversation(state.persona, conversation);

      if (data.tasks && data.tasks.length > 0) {
        const existingTasks = getTasks(state.persona);
        for (const task of data.tasks) {
          existingTasks.unshift({
            id: task.id,
            conversationId,
            service: service || "triage",
            description: task.description,
            detail: task.detail,
            type: task.type as "agent" | "user",
            status: "suggested",
            dueDate: task.dueDate,
            dataNeeded: task.dataNeeded,
            ...(task.fields ? { fields: task.fields } : {}),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        saveTasks(state.persona, existingTasks);
      }

      set({
        conversationHistory: newHistory,
        activeConversationId: conversationId,
        activeConversation: conversation,
        currentReasoning: data.reasoning,
        hasNewReasoning: true,
        isLoading: false,
        activeHandoff: data.handoff?.triggered ? data.handoff : null,
        ucState: data.ucState?.currentState ?? state.ucState,
        ucStateHistory: data.ucState?.stateHistory ?? state.ucStateHistory,
        lastUcStateInfo: data.ucState ?? state.lastUcStateInfo,
        pendingConsent: data.consentRequests ?? [],
        resolvedConsents: data.resolvedConsents ?? [],
        lastResponseTasks: data.tasks ?? [],
        taskCompletions:
          data.tasks && data.tasks.length > 0 ? {} : state.taskCompletions,
        tasksSubmitted:
          data.tasks && data.tasks.length > 0 ? false : state.tasksSubmitted,
        interactionType: data.interactionType ?? state.interactionType,
        lastPipelineTrace: data.pipelineTrace ?? null,
        pendingCards: data.cardRequests ?? [],
        cardsSubmitted:
          data.cardRequests && data.cardRequests.length > 0
            ? false
            : state.cardsSubmitted,
        pendingGates: data.gateRequests ?? [],
        gateDecisions:
          data.gateRequests && data.gateRequests.length > 0
            ? {}
            : state.gateDecisions,
        gateSubmitted:
          data.gateRequests && data.gateRequests.length > 0
            ? false
            : state.gateSubmitted,
        pendingOutcomes:
          data.outcomes && data.outcomes.length > 0
            ? (() => {
                const existingIds = new Set(
                  state.pendingOutcomes.map((o) => o.id),
                );
                const newOutcomes = data.outcomes!.filter(
                  (o) => !existingIds.has(o.id),
                );
                return [...state.pendingOutcomes, ...newOutcomes];
              })()
            : state.pendingOutcomes,
        consentDecisions:
          data.ucState?.currentState !== state.ucState
            ? {}
            : state.consentDecisions,
        consentSubmitted:
          data.ucState?.currentState !== state.ucState
            ? false
            : state.consentSubmitted,
      });

      // Add credential outcomes to wallet
      if (data.outcomes && data.outcomes.length > 0) {
        const existingIds = new Set(
          state.earnedCredentials.map(
            (c) => `${c.type}-${c.number}-${c.issuer}`,
          ),
        );
        for (const outcome of data.outcomes) {
          if (outcome.credential) {
            const cred = outcome.credential;
            const key = `${cred.type}-${cred.number}-${cred.issuer}`;
            if (!existingIds.has(key)) {
              get().addToWallet({
                type: cred.type,
                issuer: cred.issuer,
                number: cred.number,
                issued: cred.issued,
                expires: cred.expires,
                status: cred.status,
                claims: outcome.details.reduce(
                  (acc, d) => ({ ...acc, [d.label]: d.value }),
                  {} as Record<string, unknown>,
                ),
              });
            }
          }
        }
      }

      // Update active plan with service completions (life event mode)
      if (data.serviceCompletions && data.serviceCompletions.length > 0 && state.activePlan && state.persona) {
        const updatedPlan = { ...state.activePlan };
        const progress = { ...updatedPlan.serviceProgress };
        for (const completion of data.serviceCompletions) {
          progress[completion.serviceId] = "completed";
          // Unlock downstream services
          const edges = updatedPlan.plan?.edges || [];
          const downstreamIds = edges
            .filter((e) => e.from === completion.serviceId)
            .map((e) => e.to);
          for (const toId of downstreamIds) {
            if (progress[toId] !== "locked") continue;
            const prereqIds = edges.filter((e) => e.to === toId).map((e) => e.from);
            const allMet = prereqIds.every(
              (pid) => progress[pid] === "completed" || progress[pid] === "skipped",
            );
            if (allMet) progress[toId] = "available";
          }
        }
        updatedPlan.serviceProgress = progress;
        updatedPlan.updatedAt = new Date().toISOString();
        saveActivePlan(state.persona, updatedPlan);
        set({ activePlan: updatedPlan });
      }

      // Handle service/need proposals — transition from triage to service
      if (data.serviceProposal) {
        set({
          currentService: data.serviceProposal.serviceId as ServiceType,
          serviceName: data.serviceProposal.serviceName,
        });
        conversation.service = data.serviceProposal.serviceId;
        saveConversation(state.persona, conversation);
      } else if (data.needProposal) {
        if (data.lifeEventContext && state.persona) {
          // Life-event-aware path: create plan behind the scenes, stay in chat
          const lifeEventInfo: LifeEventInfo = {
            id: data.lifeEventContext.lifeEventId,
            name: data.lifeEventContext.lifeEventName,
            icon: data.lifeEventContext.lifeEventIcon,
            desc: "",
            entryNodeCount: data.lifeEventContext.plan?.entryServiceIds.length ?? 0,
            totalServiceCount: data.lifeEventContext.services.length,
            services: data.lifeEventContext.services.map((s) => ({
              id: s.id,
              name: s.name,
              dept: s.dept,
              serviceType: s.serviceType,
              desc: s.desc,
              proactive: false,
              gated: false,
              govuk_url: "",
              eligibility_summary: "",
              proactivity: s.proactivity,
            })),
            plan: data.lifeEventContext.plan,
          };

          const plan = createActivePlan(lifeEventInfo, state.personaData);
          if (plan) {
            saveActivePlan(state.persona, plan);
            set({
              activePlanId: plan.id,
              activePlan: plan,
              lifeEventMode: true,
              lifeEventId: data.lifeEventContext.lifeEventId,
            });
          }

          // Set first service as current but stay in chat
          const primaryService = data.needProposal.services[0];
          if (primaryService) {
            set({
              currentService: primaryService as ServiceType,
              serviceName: data.lifeEventContext.lifeEventName,
            });
            conversation.service = primaryService;
            saveConversation(state.persona, conversation);
          }
        } else {
          // Fallback: no life event match — pick first service
          const primaryService = data.needProposal.services[0];
          if (primaryService) {
            set({
              currentService: primaryService as ServiceType,
              serviceName: data.needProposal.need,
            });
            conversation.service = primaryService;
            saveConversation(state.persona, conversation);
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      const errorHistory: ChatMessage[] = [
        ...updatedHistory,
        {
          role: "assistant",
          content: `Something went wrong.\n\n${errorMessage}\n\nCheck that ANTHROPIC_API_KEY is set correctly in apps/citizen/.env.local`,
        },
      ];
      set({
        conversationHistory: errorHistory,
        isLoading: false,
      });
    }
  },

  setConsentDecision: (grantId: string, decision: "granted" | "denied") => {
    set((s) => ({
      consentDecisions: { ...s.consentDecisions, [grantId]: decision },
    }));
  },

  clearConsentDecision: (grantId: string) => {
    set((s) => {
      const updated = { ...s.consentDecisions };
      delete updated[grantId];
      return { consentDecisions: updated };
    });
  },

  submitConsent: async () => {
    const state = get();
    const { pendingConsent, consentDecisions } = state;

    const lines = ["I have reviewed all consent requests:"];

    for (const grant of pendingConsent) {
      const decision = consentDecisions[grant.id];
      if (decision === "granted") {
        const dataStr = grant.data_shared
          .map((d) => d.replace(/_/g, " "))
          .join(", ");
        lines.push(`- Granted: ${grant.description} (sharing: ${dataStr})`);
      } else if (decision === "denied") {
        lines.push(`- Declined: ${grant.description}`);
      }
    }

    lines.push("");
    lines.push("Please proceed with my application.");

    set({ consentSubmitted: true });
    await state.sendMessage(lines.join("\n"));
  },

  setGateDecision: (gateId: string, value: string) => {
    set({
      gateDecisions: { ...get().gateDecisions, [gateId]: value },
    });
  },

  clearGateDecision: (gateId: string) => {
    const updated = { ...get().gateDecisions };
    delete updated[gateId];
    set({ gateDecisions: updated });
  },

  submitGateDecision: async () => {
    const state = get();
    const { pendingGates, gateDecisions } = state;

    const lines: string[] = [];
    for (const gate of pendingGates) {
      const selectedValue = gateDecisions[gate.gateId];
      if (!selectedValue) continue;

      const selectedOption = gate.definition.options.find(
        (o) => o.value === selectedValue,
      );
      if (selectedOption) {
        lines.push(selectedOption.label);
      }
    }

    set({ gateSubmitted: true });
    if (lines.length > 0) {
      await state.sendMessage(lines.join("\n"));
    }
  },

  setTaskCompletion: (taskId: string, message: string) => {
    const state = get();
    const updatedCompletions = { ...state.taskCompletions, [taskId]: message };
    set({ taskCompletions: updatedCompletions });

    if (state.persona && state.activeConversation) {
      const conv = {
        ...state.activeConversation,
        taskCompletions: updatedCompletions,
      };
      saveConversation(state.persona, conv);
      set({ activeConversation: conv });
    }
  },

  clearTaskCompletion: (taskId: string) => {
    const state = get();
    const updatedCompletions = { ...state.taskCompletions };
    delete updatedCompletions[taskId];
    set({ taskCompletions: updatedCompletions });

    if (state.persona && state.activeConversation) {
      const conv = {
        ...state.activeConversation,
        taskCompletions: updatedCompletions,
      };
      saveConversation(state.persona, conv);
      set({ activeConversation: conv });
    }
  },

  submitTasks: async () => {
    const state = get();
    const { lastResponseTasks, taskCompletions } = state;

    const lines: string[] = [];

    for (const task of lastResponseTasks) {
      const completion = taskCompletions[task.id];
      if (!completion) continue;
      lines.push(completion);
    }

    if (lines.length === 0) return;

    set({ tasksSubmitted: true });

    if (state.persona && state.activeConversation) {
      const conv = { ...state.activeConversation, tasksSubmitted: true };
      saveConversation(state.persona, conv);
      set({ activeConversation: conv });
    }

    if (state.persona) {
      const storedTasks = getTasks(state.persona);
      const completedIds = new Set(Object.keys(taskCompletions));
      for (const st of storedTasks) {
        if (completedIds.has(st.id)) {
          st.status = "completed";
          st.updatedAt = new Date().toISOString();
        }
      }
      saveTasks(state.persona, storedTasks);
    }

    await state.sendMessage("[TASK_RECEIPT]\n" + lines.join("\n\n"));
  },

  submitCardsSummary: async (summaryMessage: string) => {
    set({ cardsSubmitted: true });
    await get().sendMessage(summaryMessage);
  },

  setReasoning: (reasoning: string) => {
    set({ currentReasoning: reasoning, hasNewReasoning: true });
  },

  clearReasoningBadge: () => {
    set({ hasNewReasoning: false });
  },

  dismissTimelineItem: (itemId: string) => {
    const state = get();
    if (!state.persona) return;

    // Task-based items (prefixed "task-")
    if (itemId.startsWith("task-")) {
      const taskId = itemId.slice(5);
      const tasks = getTasks(state.persona);
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = "dismissed";
        task.updatedAt = new Date().toISOString();
        saveTasks(state.persona, tasks);
      }
      return;
    }

    // Data-derived items (MOT, tax, pregnancy) — store dismissed IDs
    try {
      const key = `c02_dismissed_${state.persona}`;
      const raw = localStorage.getItem(key);
      const dismissed: string[] = raw ? JSON.parse(raw) : [];
      if (!dismissed.includes(itemId)) {
        dismissed.push(itemId);
        localStorage.setItem(key, JSON.stringify(dismissed));
      }
    } catch {
      /* ignore */
    }
  },

  addToWallet: (credential: WalletCredential) => {
    const state = get();
    if (!state.persona) return;
    const updated = [...state.earnedCredentials, credential];
    set({ earnedCredentials: updated });
    saveEarnedCredentials(state.persona, updated);
    const typeLabel = credential.type.replace(/-/g, " ");
    get().showToast(`Your new ${typeLabel} has been added to your wallet`);
  },

  loadConsentPreferences: async () => {
    const state = get();
    if (!state.persona) return;
    try {
      const resp = await fetch(`/api/consent-preferences/${state.persona}`);
      if (resp.ok) {
        const data = await resp.json();
        set({ consentPreferences: data.preferences || [] });
      }
    } catch {
      // non-critical
    }
  },

  addConsentPreference: async (pref) => {
    const state = get();
    if (!state.persona) return;
    try {
      const resp = await fetch(`/api/consent-preferences/${state.persona}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pref),
      });
      if (resp.ok) {
        const data = await resp.json();
        set({
          consentPreferences: [...state.consentPreferences, data.preference],
        });
        get().showToast("Consent preference saved");
      }
    } catch {
      // non-critical
    }
  },

  updateConsentPreference: async (id, updates) => {
    const state = get();
    if (!state.persona) return;
    // Optimistic update
    set({
      consentPreferences: state.consentPreferences.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
      ),
    });
    try {
      const existing = state.consentPreferences.find((p) => p.id === id);
      if (!existing) return;
      await fetch(`/api/consent-preferences/${state.persona}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...existing, ...updates }),
      });
      get().showToast("Preference updated");
    } catch {
      // revert
      set({ consentPreferences: state.consentPreferences });
    }
  },

  revokeConsentPreference: async (id) => {
    const state = get();
    if (!state.persona) return;
    set({
      consentPreferences: state.consentPreferences.filter((p) => p.id !== id),
    });
    try {
      await fetch(`/api/consent-preferences/${state.persona}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      get().showToast("Consent preference revoked");
    } catch {
      // revert
      set({ consentPreferences: state.consentPreferences });
    }
  },

  // ── Plan actions ──

  deletePlan: (planId: string) => {
    const state = get();
    if (!state.persona) return;
    const plans = getActivePlans(state.persona).filter((p) => p.id !== planId);
    try {
      localStorage.setItem(`c02_plans_${state.persona}`, JSON.stringify(plans));
    } catch {
      /* ignore */
    }
    if (state.activePlan?.id === planId) {
      set({ activePlan: null, activePlanId: null });
    }
  },

  startPlan: (lifeEvent: LifeEventInfo) => {
    const state = get();
    if (!state.persona || !lifeEvent.plan) return;

    const existing = getActivePlans(state.persona).find(
      (p) => p.lifeEventId === lifeEvent.id,
    );
    if (existing) {
      set({ activePlanId: existing.id, activePlan: existing });
      state.navigateTo("plan");
      return;
    }

    const plan = createActivePlan(lifeEvent, state.personaData);
    if (!plan) return;

    saveActivePlan(state.persona, plan);
    set({ activePlanId: plan.id, activePlan: plan });
    state.navigateTo("plan");
  },

  loadPlan: (planId: string) => {
    const state = get();
    if (!state.persona) return;
    const plans = getActivePlans(state.persona);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      set({ activePlanId: plan.id, activePlan: plan });
    }
  },

  startServiceFromPlan: (serviceId: string, serviceName: string) => {
    const state = get();
    if (!state.persona || !state.activePlan) return;

    state.startNewConversation(serviceId as ServiceType, serviceName);

    const convId = `conv_${Date.now()}`;
    state.markServiceInProgress(serviceId, convId);

    state.navigateTo("chat", serviceId as ServiceType, serviceName);

    state.sendMessage(`I'd like to start ${serviceName}.`);
  },

  markServiceInProgress: (serviceId: string, conversationId: string) => {
    const state = get();
    if (!state.persona || !state.activePlan) return;

    const updated: ActivePlan = {
      ...state.activePlan,
      updatedAt: new Date().toISOString(),
      serviceProgress: {
        ...state.activePlan.serviceProgress,
        [serviceId]: "in_progress",
      },
      serviceConversations: {
        ...state.activePlan.serviceConversations,
        [serviceId]: conversationId,
      },
    };

    saveActivePlan(state.persona, updated);
    set({ activePlan: updated });
  },

  markServiceCompleted: (serviceId: string) => {
    const state = get();
    if (!state.persona || !state.activePlan) return;

    const progress = {
      ...state.activePlan.serviceProgress,
      [serviceId]: "completed" as ServicePlanStatus,
    };

    const edges = state.activePlan.plan.edges;
    const downstreamIds = edges
      .filter((e) => e.from === serviceId)
      .map((e) => e.to);

    for (const toId of downstreamIds) {
      if (progress[toId] !== "locked") continue;
      const prereqIds = edges.filter((e) => e.to === toId).map((e) => e.from);
      const allMet = prereqIds.every(
        (pid) => progress[pid] === "completed" || progress[pid] === "skipped",
      );
      if (allMet) {
        progress[toId] = "available";
      }
    }

    const updated: ActivePlan = {
      ...state.activePlan,
      updatedAt: new Date().toISOString(),
      serviceProgress: progress,
    };

    saveActivePlan(state.persona, updated);
    set({ activePlan: updated });
  },

  markServiceSkipped: (serviceId: string) => {
    const state = get();
    if (!state.persona || !state.activePlan) return;

    const progress = {
      ...state.activePlan.serviceProgress,
      [serviceId]: "skipped" as ServicePlanStatus,
    };

    const edges = state.activePlan.plan.edges;
    const downstreamIds = edges
      .filter((e) => e.from === serviceId)
      .map((e) => e.to);

    for (const toId of downstreamIds) {
      if (progress[toId] !== "locked") continue;
      const prereqIds = edges.filter((e) => e.to === toId).map((e) => e.from);
      const allMet = prereqIds.every(
        (pid) => progress[pid] === "completed" || progress[pid] === "skipped",
      );
      if (allMet) {
        progress[toId] = "available";
      }
    }

    const updated: ActivePlan = {
      ...state.activePlan,
      updatedAt: new Date().toISOString(),
      serviceProgress: progress,
    };

    saveActivePlan(state.persona, updated);
    set({ activePlan: updated });
  },

  completeServiceWithUpload: async (
    serviceId: string,
    fields: Record<string, string | number | boolean>,
  ) => {
    const state = get();
    if (!state.persona || !state.activePlan) return;

    // Submit card data to the personal-data API
    try {
      await fetch(`/api/personal-data/${state.persona}/card-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType: "document-upload",
          serviceId,
          stateId: `${serviceId}-upload`,
          fields,
        }),
      });
    } catch (err) {
      console.error("[Store] completeServiceWithUpload submit error:", err);
    }

    // Mark the service as completed (unlocks downstream)
    get().markServiceCompleted(serviceId);
  },
}));
