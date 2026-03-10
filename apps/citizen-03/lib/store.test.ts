import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore } from "./store";

// Reset store between tests
beforeEach(() => {
  useAppStore.setState({
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
    lastIterations: 0,
  });
});

describe("store - navigation", () => {
  it("starts at persona-picker", () => {
    expect(useAppStore.getState().currentView).toBe("persona-picker");
  });

  it("navigates to dashboard", () => {
    useAppStore.getState().navigateTo("dashboard");
    expect(useAppStore.getState().currentView).toBe("dashboard");
  });

  it("navigates to chat", () => {
    useAppStore.getState().navigateTo("chat");
    expect(useAppStore.getState().currentView).toBe("chat");
  });
});

describe("store - conversations", () => {
  it("starts a new conversation", () => {
    useAppStore.setState({ messages: [{ role: "user", content: "hi" }] });
    useAppStore.getState().startNewConversation();
    expect(useAppStore.getState().messages).toEqual([]);
    expect(useAppStore.getState().activeConversationId).toBeNull();
    expect(useAppStore.getState().currentView).toBe("chat");
  });

  it("clears reasoning on new conversation", () => {
    useAppStore.setState({
      reasoning: "some reasoning",
      hasNewReasoning: true,
      lastToolsUsed: ["tool1"],
      lastIterations: 3,
    });
    useAppStore.getState().startNewConversation();
    expect(useAppStore.getState().reasoning).toBe("");
    expect(useAppStore.getState().hasNewReasoning).toBe(false);
    expect(useAppStore.getState().lastToolsUsed).toEqual([]);
    expect(useAppStore.getState().lastIterations).toBe(0);
  });
});

describe("store - reasoning", () => {
  it("clears reasoning badge", () => {
    useAppStore.setState({ hasNewReasoning: true });
    useAppStore.getState().clearReasoningBadge();
    expect(useAppStore.getState().hasNewReasoning).toBe(false);
  });
});

describe("store - sendMessage", () => {
  it("does nothing without persona", async () => {
    await useAppStore.getState().sendMessage("hello");
    expect(useAppStore.getState().messages).toEqual([]);
  });

  it("does nothing while loading", async () => {
    useAppStore.setState({ persona: "test", isLoading: true });
    await useAppStore.getState().sendMessage("hello");
    expect(useAppStore.getState().messages).toEqual([]);
  });

  it("adds user message and sets loading", async () => {
    // Mock fetch to avoid real API call
    global.fetch = vi.fn().mockRejectedValue(new Error("mock"));
    useAppStore.setState({ persona: "test-user" });

    const promise = useAppStore.getState().sendMessage("hello");
    // After initiating, messages should have user message and isLoading should be true
    expect(useAppStore.getState().messages).toHaveLength(1);
    expect(useAppStore.getState().messages[0]).toEqual({
      role: "user",
      content: "hello",
    });

    await promise;
    // After error, should have error message
    expect(useAppStore.getState().isLoading).toBe(false);
    expect(useAppStore.getState().messages).toHaveLength(2);
    expect(useAppStore.getState().messages[1].role).toBe("assistant");
  });

  it("handles successful API response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: "Here are the services available.",
        reasoning: "Used service graph to find...",
        toolsUsed: ["query_service_graph", "check_eligibility"],
        toolUseLog: [
          { tool: "query_service_graph", input: { keyword: "pension" }, durationMs: 5 },
          { tool: "check_eligibility", input: { service_id: "dwp-pension-credit" }, durationMs: 3 },
        ],
        conversationTitle: "Pension Credit Inquiry",
        traceId: "trace_123",
        iterations: 2,
      }),
    });

    useAppStore.setState({ persona: "test-user" });
    await useAppStore.getState().sendMessage("Am I eligible for pension credit?");

    const state = useAppStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1].content).toBe("Here are the services available.");
    expect(state.reasoning).toBe("Used service graph to find...");
    expect(state.hasNewReasoning).toBe(true);
    expect(state.lastToolsUsed).toEqual(["query_service_graph", "check_eligibility"]);
    expect(state.lastIterations).toBe(2);
    expect(state.activeConversationId).toBeTruthy();
  });
});
