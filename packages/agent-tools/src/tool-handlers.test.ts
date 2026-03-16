import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleToolCall, type ToolContext } from "./tool-handlers";
import { ServiceGraphEngine } from "@als/service-graph";
import { ArtefactStore } from "@als/legibility";
import { getAgentToolDefinitions, getToolByName } from "./tool-definitions";

// ── Test fixtures ──

function createTestContext(overrides?: Partial<ToolContext>): ToolContext {
  const graph = new ServiceGraphEngine();
  const artefactStore = new ArtefactStore();

  return {
    graph,
    artefactStore,
    session: {
      userId: "test-user-001",
      sessionId: "sess-001",
      traceId: "trace-001",
    },
    citizenData: {
      verified: {
        firstName: "Emma",
        lastName: "Parker",
        dateOfBirth: "1985-03-15",
      },
      submitted: { employmentStatus: "employed" },
      inferred: { ageGroup: "35-44" },
    },
    ...overrides,
  };
}

// ── Tool definitions tests ──

describe("tool-definitions", () => {
  it("returns all 6 tool definitions", () => {
    const tools = getAgentToolDefinitions();
    expect(tools).toHaveLength(6);
    expect(tools.map((t) => t.name)).toEqual([
      "query_service_graph",
      "get_life_event_plan",
      "get_related_services",
      "check_eligibility",
      "get_citizen_context",
      "record_evidence",
    ]);
  });

  it("each tool has valid Anthropic tool_use schema", () => {
    const tools = getAgentToolDefinitions();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.input_schema.type).toBe("object");
      expect(tool.input_schema.properties).toBeDefined();
    }
  });

  it("looks up tool by name", () => {
    const tool = getToolByName("query_service_graph");
    expect(tool).toBeDefined();
    expect(tool!.name).toBe("query_service_graph");
  });

  it("returns undefined for unknown tool", () => {
    expect(getToolByName("nonexistent")).toBeUndefined();
  });
});

// ── query_service_graph tests ──

describe("query_service_graph", () => {
  it("returns all services with no filters", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall("query_service_graph", {}, ctx);

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.totalCount).toBeGreaterThan(0);
    expect(data.services[0]).toHaveProperty("id");
    expect(data.services[0]).toHaveProperty("name");
    expect(data.services[0]).toHaveProperty("serviceType");
  });

  it("filters by life event", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "query_service_graph",
      { life_event_id: "bereavement" },
      ctx,
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.totalCount).toBeGreaterThan(0);
    // All bereavement services should be present
    expect(
      data.services.some(
        (s: { id: string }) =>
          s.id.includes("bereavement") || s.id.includes("death"),
      ),
    ).toBe(true);
  });

  it("returns error for invalid life event", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "query_service_graph",
      { life_event_id: "nonexistent-event" },
      ctx,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("No life event found");
    expect(data.error).toContain("bereavement"); // lists available events
  });

  it("filters by department", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "query_service_graph",
      { department: "dwp" },
      ctx,
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.totalCount).toBeGreaterThan(0);
    for (const svc of data.services) {
      expect(svc.dept.toLowerCase()).toContain("dwp");
    }
  });

  it("filters by service type", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "query_service_graph",
      { service_type: "benefit" },
      ctx,
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.totalCount).toBeGreaterThan(0);
    for (const svc of data.services) {
      expect(svc.serviceType).toBe("benefit");
    }
  });

  it("filters by keyword", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "query_service_graph",
      { keyword: "pension" },
      ctx,
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.totalCount).toBeGreaterThan(0);
    for (const svc of data.services) {
      const combined = `${svc.name} ${svc.desc}`.toLowerCase();
      expect(combined).toContain("pension");
    }
  });

  it("combines multiple filters", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "query_service_graph",
      { service_type: "benefit", keyword: "pension" },
      ctx,
    );

    const data = JSON.parse(result.content[0].text);
    for (const svc of data.services) {
      expect(svc.serviceType).toBe("benefit");
    }
  });
});

// ── get_life_event_plan tests ──

describe("get_life_event_plan", () => {
  it("returns a topological plan for bereavement", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "get_life_event_plan",
      { life_event_id: "bereavement" },
      ctx,
    );

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.lifeEvent.id).toBe("bereavement");
    expect(data.lifeEvent.name).toBeTruthy();
    expect(data.plan.groups).toBeDefined();
    expect(data.plan.groups.length).toBeGreaterThan(0);
    expect(data.plan.groups[0].depth).toBe(0);
    expect(data.plan.groups[0].label).toBe("Start here");
    expect(data.serviceDetails.length).toBeGreaterThan(0);
  });

  it("returns error for missing life_event_id", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall("get_life_event_plan", {}, ctx);

    expect(result.isError).toBe(true);
  });

  it("returns error for invalid life event", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "get_life_event_plan",
      { life_event_id: "fake-event" },
      ctx,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("No life event found");
  });
});

// ── get_related_services tests ──

describe("get_related_services", () => {
  it("returns related services for a known service", async () => {
    const ctx = createTestContext();
    // Use a service we know exists in the graph
    const allServices = ctx.graph.getServices();
    const testService = allServices[0];

    const result = await handleToolCall(
      "get_related_services",
      { service_id: testService.id },
      ctx,
    );

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.service.id).toBe(testService.id);
    expect(data.requires).toBeDefined();
    expect(data.enables).toBeDefined();
  });

  it("supports slug-based lookup", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "get_related_services",
      { service_id: "universal-credit" },
      ctx,
    );

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.service.name.toLowerCase()).toContain("universal credit");
  });

  it("returns error for unknown service", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "get_related_services",
      { service_id: "nonexistent-service" },
      ctx,
    );

    expect(result.isError).toBe(true);
  });

  it("returns error when service_id missing", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall("get_related_services", {}, ctx);
    expect(result.isError).toBe(true);
  });
});

// ── check_eligibility tests ──

describe("check_eligibility", () => {
  it("returns eligibility info for a graph-only service", async () => {
    const ctx = createTestContext();
    const allServices = ctx.graph.getServices();
    const testService = allServices[0];

    const result = await handleToolCall(
      "check_eligibility",
      { service_id: testService.id },
      ctx,
    );

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.serviceId).toBe(testService.id);
    expect(data.policyResult).toBeDefined();
    expect(data.artefacts).toBeDefined();
  });

  it("merges citizen data for evaluation", async () => {
    const ctx = createTestContext();
    const allServices = ctx.graph.getServices();

    const result = await handleToolCall(
      "check_eligibility",
      {
        service_id: allServices[0].id,
        citizen_data: { customField: "value" },
      },
      ctx,
    );

    expect(result.isError).toBeFalsy();
  });

  it("returns error for unknown service", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall(
      "check_eligibility",
      { service_id: "totally-fake-service" },
      ctx,
    );

    expect(result.isError).toBe(true);
  });

  it("returns error when service_id missing", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall("check_eligibility", {}, ctx);
    expect(result.isError).toBe(true);
  });
});

// ── get_citizen_context tests ──

describe("get_citizen_context", () => {
  it("returns citizen profile with all three tiers", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall("get_citizen_context", {}, ctx);

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.userId).toBe("test-user-001");
    expect(data.name).toBe("Emma Parker");
    expect(data.verifiedData.firstName).toBe("Emma");
    expect(data.submittedData.employmentStatus).toBe("employed");
    expect(data.inferredData.ageGroup).toBe("35-44");
  });

  it("includes active services by default", async () => {
    const activeServices = new Map([
      ["dwp-universal-credit", { currentState: "identity-verification" }],
    ]);
    const ctx = createTestContext({ activeServices });
    const result = await handleToolCall("get_citizen_context", {}, ctx);

    const data = JSON.parse(result.content[0].text);
    expect(data.activeServices).toHaveLength(1);
    expect(data.activeServices[0].serviceId).toBe("dwp-universal-credit");
  });

  it("excludes active services when requested", async () => {
    const activeServices = new Map([
      ["dwp-universal-credit", { currentState: "identity-verification" }],
    ]);
    const ctx = createTestContext({ activeServices });
    const result = await handleToolCall(
      "get_citizen_context",
      { include_active_services: false },
      ctx,
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.activeServices).toHaveLength(0);
  });

  it("handles missing citizen data gracefully", async () => {
    const ctx = createTestContext({ citizenData: undefined });
    const result = await handleToolCall("get_citizen_context", {}, ctx);

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.verifiedData).toEqual({});
  });
});

// ── record_evidence tests ──

describe("record_evidence", () => {
  it("records a trace event via callback", async () => {
    const onTraceEvent = vi.fn().mockResolvedValue(undefined);
    const ctx = createTestContext({ onTraceEvent });

    const result = await handleToolCall(
      "record_evidence",
      {
        event_type: "policy.evaluated",
        service_id: "dwp-universal-credit",
        payload: { eligible: true, passed: 3, failed: 0 },
      },
      ctx,
    );

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.recorded).toBe(true);
    expect(data.traceId).toBe("trace-001");
    expect(onTraceEvent).toHaveBeenCalledWith({
      type: "policy.evaluated",
      serviceId: "dwp-universal-credit",
      payload: { eligible: true, passed: 3, failed: 0 },
      session: ctx.session,
    });
  });

  it("reports recorded=false when no callback", async () => {
    const ctx = createTestContext({ onTraceEvent: undefined });

    const result = await handleToolCall(
      "record_evidence",
      {
        event_type: "state.transition",
        service_id: "test-service",
        payload: { fromState: "a", toState: "b" },
      },
      ctx,
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.recorded).toBe(false);
  });

  it("returns error when required fields missing", async () => {
    const ctx = createTestContext();

    const result = await handleToolCall(
      "record_evidence",
      { event_type: "policy.evaluated" },
      ctx,
    );

    expect(result.isError).toBe(true);
  });
});

// ── Unknown tool test ──

describe("unknown tool", () => {
  it("returns error for unknown tool name", async () => {
    const ctx = createTestContext();
    const result = await handleToolCall("nonexistent_tool", {}, ctx);

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain("Unknown tool");
  });
});
