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
import type { ChatMessage, ChatApiResponse, Conversation, ViewType, PersonaData, ToolUseRecord, AgentCard } from "./types";

interface AppStore {
  // Identity
  persona: string | null;
  personaData: PersonaData | null;

  // Navigation
  currentView: ViewType;

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
  cards: AgentCard[];
  quickReplies: string[];

  // Actions
  setPersona: (id: string) => Promise<void>;
  navigateTo: (view: ViewType) => void;
  sendMessage: (text: string) => Promise<void>;
  startNewConversation: () => void;
  loadConversation: (id: string) => void;
  clearReasoningBadge: () => void;
}

// localStorage-backed conversations
function getConversations(personaId: string): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`c03_conversations_${personaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
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
  } catch { /* storage full */ }
}

export { getConversations };

export const useAppStore = create<AppStore>((set, get) => ({
  persona: null,
  personaData: null,
  currentView: "persona-picker",
  messages: [],
  activeConversationId: null,
  activeConversation: null,
  reasoning: "",
  hasNewReasoning: false,
  isLoading: false,
  lastToolsUsed: [],
  lastToolUseLog: [],
  lastIterations: 0,
  cards: [],
  quickReplies: [],

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

    // Load persona data from file
    try {
      const response = await fetch(`/api/persona/${id}`);
      if (response.ok) {
        const data = await response.json();
        set({ personaData: data });
      }
    } catch {
      // persona data is optional for the chat to work
    }
  },

  navigateTo: (view: ViewType) => set({ currentView: view }),

  startNewConversation: () => {
    set({
      messages: [],
      activeConversationId: null,
      activeConversation: null,
      reasoning: "",
      hasNewReasoning: false,
      lastToolsUsed: [],
      lastToolUseLog: [],
      lastIterations: 0,
      cards: [],
      quickReplies: [],
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
    set({ messages: updated, isLoading: true });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: state.persona,
          messages: updated,
          generateTitle: isNew,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as Record<string, string>;
        throw new Error(err.details || err.error || `HTTP ${response.status}`);
      }

      const data: ChatApiResponse = await response.json();

      const newHistory: ChatMessage[] = [
        ...updated,
        { role: "assistant", content: data.response },
      ];

      const conversationId = state.activeConversationId || `conv_${Date.now()}`;
      const conversation: Conversation = state.activeConversation
        ? { ...state.activeConversation, messages: newHistory, updatedAt: new Date().toISOString() }
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
        cards: data.cards || [],
        quickReplies: data.quickReplies || [],
      });
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = error instanceof Error ? error.message : "Something went wrong";
      set({
        messages: [
          ...updated,
          { role: "assistant", content: `Something went wrong.\n\n${errorMsg}` },
        ],
        isLoading: false,
      });
    }
  },

  clearReasoningBadge: () => set({ hasNewReasoning: false }),
}));
