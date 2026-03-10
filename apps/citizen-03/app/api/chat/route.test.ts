// @vitest-environment node
/**
 * Tests for the citizen-03 thin agent loop chat route.
 *
 * The route uses module-level singletons with lazy initialization,
 * so we test it by mocking at the adapter level with proper class mocks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Create a mock adapter instance
const mockExecute = vi.fn();
const mockInitialize = vi.fn();

// Mock AnthropicAdapter as a proper class
vi.mock("@als/adapters", () => ({
  AnthropicAdapter: class MockAnthropicAdapter {
    initialize = mockInitialize;
    execute = mockExecute;
  },
}));

// Mock fs for persona loading
vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn().mockImplementation(async (filePath: string) => {
      if (filePath.includes("emma-parker")) {
        return JSON.stringify({
          name: "Emma Parker",
          primaryContact: {
            firstName: "Emma",
            lastName: "Parker",
            dateOfBirth: "1998-06-15",
          },
          address: { city: "Bristol", postcode: "BS1 1AA" },
        });
      }
      throw new Error("File not found");
    }),
    readdir: vi.fn().mockResolvedValue([]),
  },
}));

describe("chat route - agent loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles a simple text response (no tool use)", async () => {
    mockExecute.mockResolvedValueOnce({
      success: true,
      output: {
        responseText: "Hello Emma, how can I help?",
        reasoning: "Greeting the user",
        toolCalls: null,
        rawContent: [],
        stopReason: "end_turn",
      },
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost:3103/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: "emma-parker",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBe("Hello Emma, how can I help?");
    expect(data.reasoning).toBe("Greeting the user");
    expect(data.toolsUsed).toEqual([]);
    expect(data.iterations).toBe(1);
    expect(data.traceId).toMatch(/^trace_/);
  });

  it("handles tool use followed by text response", async () => {
    // First call: model wants to use a tool
    mockExecute.mockResolvedValueOnce({
      success: true,
      output: {
        responseText: "",
        reasoning: "Looking up citizen data",
        toolCalls: [
          { id: "tool_1", name: "get_citizen_context", input: {} },
        ],
        rawContent: [
          { type: "tool_use", id: "tool_1", name: "get_citizen_context", input: {} },
        ],
        stopReason: "tool_use",
      },
    });

    // Second call: model gives final response
    mockExecute.mockResolvedValueOnce({
      success: true,
      output: {
        responseText: "I can see you're Emma Parker from Bristol.",
        reasoning: "Using citizen context to personalize",
        toolCalls: null,
        rawContent: [],
        stopReason: "end_turn",
      },
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost:3103/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: "emma-parker",
        messages: [{ role: "user", content: "What do you know about me?" }],
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBe("I can see you're Emma Parker from Bristol.");
    expect(data.toolsUsed).toEqual(["get_citizen_context"]);
    expect(data.iterations).toBe(2);
    expect(data.toolUseLog).toHaveLength(1);
    expect(data.toolUseLog[0].tool).toBe("get_citizen_context");
    expect(data.toolUseLog[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("handles multiple tool calls in sequence", async () => {
    // Iteration 1: two tools
    mockExecute.mockResolvedValueOnce({
      success: true,
      output: {
        responseText: "",
        toolCalls: [
          { id: "t1", name: "get_citizen_context", input: {} },
          { id: "t2", name: "query_service_graph", input: { keyword: "pension" } },
        ],
        rawContent: [
          { type: "tool_use", id: "t1", name: "get_citizen_context", input: {} },
          { type: "tool_use", id: "t2", name: "query_service_graph", input: { keyword: "pension" } },
        ],
        stopReason: "tool_use",
      },
    });

    // Iteration 2: one more tool
    mockExecute.mockResolvedValueOnce({
      success: true,
      output: {
        responseText: "",
        toolCalls: [
          { id: "t3", name: "check_eligibility", input: { service_id: "dwp-pension-credit" } },
        ],
        rawContent: [
          { type: "tool_use", id: "t3", name: "check_eligibility", input: { service_id: "dwp-pension-credit" } },
        ],
        stopReason: "tool_use",
      },
    });

    // Iteration 3: final response
    mockExecute.mockResolvedValueOnce({
      success: true,
      output: {
        responseText: "You may be eligible for Pension Credit.",
        toolCalls: null,
        rawContent: [],
        stopReason: "end_turn",
      },
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost:3103/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: "emma-parker",
        messages: [{ role: "user", content: "Am I eligible for pension credit?" }],
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBe("You may be eligible for Pension Credit.");
    expect(data.toolsUsed).toEqual([
      "get_citizen_context",
      "query_service_graph",
      "check_eligibility",
    ]);
    expect(data.iterations).toBe(3);
    expect(data.toolUseLog).toHaveLength(3);
  });

  it("returns 400 for missing required fields", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost:3103/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: "test" }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 500 when LLM call fails", async () => {
    mockExecute.mockResolvedValueOnce({
      success: false,
      error: "API key invalid",
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost:3103/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: "emma-parker",
        messages: [{ role: "user", content: "test" }],
      }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.details).toContain("API key invalid");
  });
});
