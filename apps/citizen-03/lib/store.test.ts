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
    lastToolUseLog: [],
    lastIterations: 0,
    lastTraceId: "",
    cards: [],
    quickReplies: [],
    toolProgress: [],
    streamingText: "",
    settingsPanelOpen: false,
    showTrace: false,
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

  it("clears tool progress and cards on new conversation", () => {
    useAppStore.setState({
      toolProgress: [{ tool: "test", label: "Test", status: "complete" }],
      cards: [{ type: "info", title: "Test", description: "Test" }],
      quickReplies: ["test"],
    });
    useAppStore.getState().startNewConversation();
    expect(useAppStore.getState().toolProgress).toEqual([]);
    expect(useAppStore.getState().cards).toEqual([]);
    expect(useAppStore.getState().quickReplies).toEqual([]);
  });
});

describe("store - reasoning", () => {
  it("clears reasoning badge", () => {
    useAppStore.setState({ hasNewReasoning: true });
    useAppStore.getState().clearReasoningBadge();
    expect(useAppStore.getState().hasNewReasoning).toBe(false);
  });
});

describe("store - UI panels", () => {
  it("toggles settings panel", () => {
    expect(useAppStore.getState().settingsPanelOpen).toBe(false);
    useAppStore.getState().toggleSettings();
    expect(useAppStore.getState().settingsPanelOpen).toBe(true);
    useAppStore.getState().toggleSettings();
    expect(useAppStore.getState().settingsPanelOpen).toBe(false);
  });

  it("toggles trace and clears new reasoning badge", () => {
    useAppStore.setState({ hasNewReasoning: true, showTrace: false });
    useAppStore.getState().toggleTrace();
    expect(useAppStore.getState().showTrace).toBe(true);
    expect(useAppStore.getState().hasNewReasoning).toBe(false);
  });

  it("toggles trace off normally", () => {
    useAppStore.setState({ showTrace: true, hasNewReasoning: false });
    useAppStore.getState().toggleTrace();
    expect(useAppStore.getState().showTrace).toBe(false);
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
    global.fetch = vi.fn().mockRejectedValue(new Error("mock"));
    useAppStore.setState({ persona: "test-user" });

    const promise = useAppStore.getState().sendMessage("hello");
    expect(useAppStore.getState().messages).toHaveLength(1);
    expect(useAppStore.getState().messages[0]).toEqual({
      role: "user",
      content: "hello",
    });

    await promise;
    expect(useAppStore.getState().isLoading).toBe(false);
    expect(useAppStore.getState().messages).toHaveLength(2);
    expect(useAppStore.getState().messages[1].role).toBe("assistant");
  });

  it("handles non-streaming JSON response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () =>
        Promise.resolve({
          response: "Here are the services available.",
          reasoning: "Used service graph to find...",
          toolsUsed: ["query_service_graph", "check_eligibility"],
          toolUseLog: [
            {
              tool: "query_service_graph",
              input: { keyword: "pension" },
              durationMs: 5,
            },
            {
              tool: "check_eligibility",
              input: { service_id: "dwp-pension-credit" },
              durationMs: 3,
            },
          ],
          cards: [
            { type: "service", title: "Pension Credit", description: "Test" },
          ],
          quickReplies: ["Tell me more"],
          conversationTitle: "Pension Credit Inquiry",
          traceId: "trace_123",
          iterations: 2,
        }),
    });

    useAppStore.setState({ persona: "test-user" });
    await useAppStore
      .getState()
      .sendMessage("Am I eligible for pension credit?");

    const state = useAppStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1].content).toBe("Here are the services available.");
    expect(state.reasoning).toBe("Used service graph to find...");
    expect(state.hasNewReasoning).toBe(true);
    expect(state.lastToolsUsed).toEqual([
      "query_service_graph",
      "check_eligibility",
    ]);
    expect(state.lastIterations).toBe(2);
    expect(state.cards).toHaveLength(1);
    expect(state.quickReplies).toEqual(["Tell me more"]);
    expect(state.activeConversationId).toBeTruthy();
  });

  it("handles streaming SSE response", async () => {
    const events = [
      `data: ${JSON.stringify({ type: "tool_start", tool: "get_citizen_context", label: "Loading your profile", iteration: 1 })}\n\n`,
      `data: ${JSON.stringify({ type: "tool_complete", tool: "get_citizen_context", label: "Loading your profile", summary: { name: "Emma" }, durationMs: 10, isError: false })}\n\n`,
      `data: ${JSON.stringify({ type: "reasoning", text: "Checking context" })}\n\n`,
      `data: ${JSON.stringify({ type: "response", response: "Hello Emma!", reasoning: "Greeted user", toolsUsed: ["get_citizen_context"], toolUseLog: [{ tool: "get_citizen_context", input: {}, output: { name: "Emma" }, durationMs: 10, isError: false }], cards: [], quickReplies: ["What can you do?"], conversationTitle: "Greeting", traceId: "trace_456", iterations: 2 })}\n\n`,
      "data: [DONE]\n\n",
    ];

    let eventIndex = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        if (eventIndex < events.length) {
          const data = new TextEncoder().encode(events[eventIndex]);
          eventIndex++;
          return Promise.resolve({ done: false, value: data });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "text/event-stream" }),
      body: { getReader: () => mockReader },
    });

    useAppStore.setState({ persona: "test-user" });
    await useAppStore.getState().sendMessage("Hello");

    const state = useAppStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1].content).toBe("Hello Emma!");
    expect(state.lastToolsUsed).toEqual(["get_citizen_context"]);
    expect(state.quickReplies).toEqual(["What can you do?"]);
    expect(state.lastTraceId).toBe("trace_456");
  });
});
