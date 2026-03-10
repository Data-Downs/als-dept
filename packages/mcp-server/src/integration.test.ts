/**
 * integration.test.ts — Vitest integration tests for MCP server primitives
 *
 * Converted from test-primitives.ts manual runner.
 * Uses InMemoryTransport for in-process server ↔ client communication
 * against real service data in data/services/.
 */

import path from "path";
import { fileURLToPath } from "url";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServer } from "./server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servicesDir = path.resolve(__dirname, "../../../data/services");

let client: Client;
let server: McpServer;
let toolCount: number;
let resourceCount: number;
let promptCount: number;
let serviceCount: number;

beforeAll(async () => {
  const result = await createServer(servicesDir);
  server = result.server;
  toolCount = result.toolCount;
  resourceCount = result.resourceCount;
  promptCount = result.promptCount;
  serviceCount = result.serviceCount;

  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "0.1.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await server.close();
});

describe("server creation counts", () => {
  it("loads expected number of services, tools, resources, and prompts", () => {
    expect(serviceCount).toBe(4);
    expect(toolCount).toBe(8);
    expect(resourceCount).toBe(16);
    expect(promptCount).toBe(8);
  });
});

describe("resources — listing", () => {
  it("lists all 16 resources", async () => {
    const { resources } = await client.listResources();
    expect(resources).toHaveLength(16);
  });

  it("includes UC manifest, policy, consent, state-model resources", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain("service://dwp.apply-universal-credit/manifest");
    expect(uris).toContain("service://dwp.apply-universal-credit/policy");
    expect(uris).toContain("service://dwp.apply-universal-credit/consent");
    expect(uris).toContain("service://dwp.apply-universal-credit/state-model");
  });

  it("includes DVLA manifest resource", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain("service://dvla.renew-driving-licence/manifest");
  });
});

describe("resources — reading", () => {
  it("reads UC manifest with correct id and name", async () => {
    const result = await client.readResource({
      uri: "service://dwp.apply-universal-credit/manifest",
    });
    const manifest = JSON.parse((result.contents[0] as { text: string }).text);
    expect(manifest.id).toBe("dwp.apply-universal-credit");
    expect(manifest.name).toBe("Apply for Universal Credit");
  });

  it("reads UC policy with expected rules", async () => {
    const result = await client.readResource({
      uri: "service://dwp.apply-universal-credit/policy",
    });
    const policy = JSON.parse((result.contents[0] as { text: string }).text);
    expect(Array.isArray(policy.rules)).toBe(true);
    const ruleIds = policy.rules.map((r: { id: string }) => r.id);
    expect(ruleIds).toContain("age-range");
    expect(ruleIds).toContain("uk-resident");
    expect(ruleIds).toContain("low-savings");
  });
});

describe("tools — listing + annotations", () => {
  it("lists 8 tools total", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(8);
  });

  it("has no legacy tool types (migrated to resources)", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names.some((n) => n.endsWith("_get_service_info"))).toBe(false);
    expect(names.some((n) => n.endsWith("_get_requirements"))).toBe(false);
    expect(names.some((n) => n.endsWith("_get_consent_model"))).toBe(false);
  });

  it("has 4 check_eligibility tools with correct annotations", async () => {
    const { tools } = await client.listTools();
    const eligTools = tools.filter((t) => t.name.endsWith("_check_eligibility"));
    expect(eligTools).toHaveLength(4);
    for (const t of eligTools) {
      const ann = t.annotations as Record<string, unknown> | undefined;
      expect(ann?.readOnlyHint).toBe(true);
      expect(ann?.idempotentHint).toBe(true);
    }
  });

  it("has 4 advance_state tools with correct annotations", async () => {
    const { tools } = await client.listTools();
    const stateTools = tools.filter((t) => t.name.endsWith("_advance_state"));
    expect(stateTools).toHaveLength(4);
    for (const t of stateTools) {
      const ann = t.annotations as Record<string, unknown> | undefined;
      expect(ann?.readOnlyHint).toBe(false);
      expect(ann?.idempotentHint).toBe(false);
    }
  });
});

describe("tools — check_eligibility execution", () => {
  it("returns eligible for qualifying citizen", async () => {
    const result = await client.callTool({
      name: "apply_universal_credit_check_eligibility",
      arguments: {
        citizen_data: { age: 30, jurisdiction: "England", savings: 5000, bank_account: true },
      },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(data.eligible).toBe(true);
    const passedIds = data.passed.map((r: { id: string }) => r.id);
    expect(passedIds).toContain("age-range");
    expect(passedIds).toContain("uk-resident");
  });

  it("returns ineligible for under-18 citizen", async () => {
    const result = await client.callTool({
      name: "apply_universal_credit_check_eligibility",
      arguments: {
        citizen_data: { age: 15, jurisdiction: "England", savings: 5000, bank_account: true },
      },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(data.eligible).toBe(false);
    const failedIds = data.failed.map((r: { id: string }) => r.id);
    expect(failedIds).toContain("age-range");
  });
});

describe("tools — advance_state execution", () => {
  it("succeeds for valid transition", async () => {
    const result = await client.callTool({
      name: "apply_universal_credit_advance_state",
      arguments: { current_state: "not-started", trigger: "verify-identity" },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(data.success).toBe(true);
    expect(data.fromState).toBe("not-started");
    expect(data.toState).toBe("identity-verified");
  });

  it("fails for invalid transition", async () => {
    const result = await client.callTool({
      name: "apply_universal_credit_advance_state",
      arguments: { current_state: "not-started", trigger: "submit-claim" },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(data.success).toBe(false);
  });
});

describe("prompts — listing + execution", () => {
  it("lists 8 prompts total", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts).toHaveLength(8);
  });

  it("includes expected prompt names", async () => {
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name);
    expect(names).toContain("apply_universal_credit_journey");
    expect(names).toContain("apply_universal_credit_eligibility_check");
    expect(names).toContain("renew_driving_licence_journey");
  });

  it("journey prompt returns correct content", async () => {
    const result = await client.getPrompt({
      name: "apply_universal_credit_journey",
      arguments: {},
    });
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages[0].role).toBe("user");
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain("Apply for Universal Credit");
    expect(text).toMatch(/State Machine|Journey Flow/);
  });

  it("eligibility prompt includes rules and citizen data", async () => {
    const result = await client.getPrompt({
      name: "apply_universal_credit_eligibility_check",
      arguments: { citizen_data_json: '{"age": 25}' },
    });
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain("age-range");
    expect(text).toContain('"age": 25');
  });
});
