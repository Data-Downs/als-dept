/**
 * prompt-generator.test.ts — Unit tests for prompt generation
 *
 * Tests buildJourneyPrompt and buildEligibilityPrompt with synthetic
 * service artefacts (no filesystem or MCP server needed).
 */

import { describe, it, expect } from "vitest";
import { buildJourneyPrompt, buildEligibilityPrompt } from "./prompt-generator";
import type {
  CapabilityManifest,
  PolicyRuleset,
  StateModelDefinition,
  ConsentModel,
} from "@als/schemas";
import type { ServiceArtefacts } from "@als/legibility";

// ── Fixtures ──

const manifest: CapabilityManifest = {
  id: "test.full-service",
  version: "1.0.0",
  name: "Full Test Service",
  description: "A test service with all artefacts",
  department: "Test Department",
  jurisdiction: "England",
  input_schema: { type: "object" },
  output_schema: { type: "object" },
  constraints: {
    sla: "5 working days",
    fee: { amount: 14, currency: "GBP" },
    availability: "24/7",
  },
  handoff: { escalation_phone: "0800 123 456", opening_hours: "Mon-Fri 9-5" },
  redress: {
    complaint_url: "https://example.gov.uk/complaints",
    appeal_process: "Internal review within 28 days",
    ombudsman: "Parliamentary Ombudsman",
  },
};

const policy: PolicyRuleset = {
  id: "test.full-service.eligibility",
  version: "1.0.0",
  rules: [
    {
      id: "age-check",
      description: "Must be 18 or over",
      condition: { field: "age", operator: "gte", value: 18 },
      reason_if_failed: "You must be at least 18 years old",
    },
    {
      id: "residency",
      description: "Must be UK resident",
      condition: {
        field: "jurisdiction",
        operator: "in",
        value: ["England", "Wales", "Scotland", "NI"],
      },
      reason_if_failed: "Must reside in the UK",
    },
  ],
  edge_cases: [
    {
      id: "approaching-18",
      description: "Citizen turns 18 within 3 months",
      detection: "age >= 17.75 && age < 18",
      action: "Advise to apply after 18th birthday",
    },
  ],
};

const stateModel: StateModelDefinition = {
  id: "test.full-service.states",
  version: "1.0.0",
  states: [
    { id: "not-started", type: "initial" },
    { id: "verified", type: "normal" },
    { id: "completed", type: "terminal" },
    { id: "rejected", type: "terminal" },
  ],
  transitions: [
    { from: "not-started", to: "verified", trigger: "verify" },
    { from: "verified", to: "completed", trigger: "submit" },
    {
      from: "verified",
      to: "rejected",
      trigger: "reject",
      condition: "eligibility_failed",
    },
  ],
};

const consent: ConsentModel = {
  id: "test.full-service.consent",
  version: "1.0.0",
  grants: [
    {
      id: "identity-check",
      description: "Share identity for verification",
      data_shared: ["name", "date_of_birth", "address"],
      source: "one-login",
      purpose: "Identity verification",
      duration: "session",
      required: true,
    },
    {
      id: "income-share",
      description: "Share income data with HMRC",
      data_shared: ["income", "employer"],
      source: "hmrc",
      purpose: "Income verification",
      duration: "30 days",
      required: false,
    },
  ],
  revocation: {
    mechanism: "online portal",
    effect: "stops data sharing immediately",
  },
  delegation: { agent_identity: "AI Agent", scopes: ["read"] },
};

const fullArtefacts: ServiceArtefacts = {
  manifest,
  policy,
  stateModel,
  consent,
};

const minimalManifest: CapabilityManifest = {
  id: "test.minimal",
  version: "1.0.0",
  name: "Minimal Service",
  description: "A service with manifest only",
  department: "Minimal Dept",
  input_schema: { type: "object" },
  output_schema: { type: "object" },
};

const minimalArtefacts: ServiceArtefacts = { manifest: minimalManifest };

// ── buildJourneyPrompt ──

describe("buildJourneyPrompt", () => {
  it("includes service overview", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("# Journey Guide: Full Test Service");
    expect(text).toContain("**Service:** Full Test Service");
    expect(text).toContain("**Department:** Test Department");
    expect(text).toContain("**Jurisdiction:** England");
  });

  it("includes service constraints", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("## Service Constraints");
    expect(text).toContain("**SLA:** 5 working days");
    expect(text).toContain("**Fee:** 14 GBP");
    expect(text).toContain("**Availability:** 24/7");
  });

  it("includes eligibility rules with failure reasons", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("## Eligibility Rules");
    expect(text).toContain("**age-check:** Must be 18 or over");
    expect(text).toContain("If failed: You must be at least 18 years old");
    expect(text).toContain("**residency:** Must be UK resident");
  });

  it("includes edge cases", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("### Edge Cases");
    expect(text).toContain("**approaching-18:**");
    expect(text).toContain("Advise to apply after 18th birthday");
  });

  it("includes state machine flow with state types", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("## Journey Flow (State Machine)");
    expect(text).toContain("**not-started** (START)");
    expect(text).toContain("**completed** (END)");
    expect(text).toContain("**rejected** (END)");
    expect(text).toContain("**verified**");
    // Should not mark normal states
    expect(text).not.toContain("**verified** (START)");
    expect(text).not.toContain("**verified** (END)");
  });

  it("includes transitions with conditions", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("### Transitions");
    expect(text).toContain("not-started → verified (trigger: verify)");
    expect(text).toContain(
      "verified → rejected (trigger: reject) [eligibility_failed]",
    );
  });

  it("includes consent grants and revocation", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("## Consent Requirements");
    expect(text).toContain(
      "**identity-check:** Share identity for verification",
    );
    expect(text).toContain("Data shared: name, date_of_birth, address");
    expect(text).toContain("Purpose: Identity verification");
    expect(text).toContain("Required: Yes");
    expect(text).toContain("**income-share:**");
    expect(text).toContain("Required: No");
    expect(text).toContain("**Revocation:** online portal");
    expect(text).toContain(
      "**Effect of revocation:** stops data sharing immediately",
    );
  });

  it("includes handoff info", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("## Escalation / Handoff");
    expect(text).toContain("**Phone:** 0800 123 456");
    expect(text).toContain("**Hours:** Mon-Fri 9-5");
  });

  it("includes redress info", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("## Redress");
    expect(text).toContain("**Complaints:** https://example.gov.uk/complaints");
    expect(text).toContain("**Appeals:** Internal review within 28 days");
    expect(text).toContain("**Ombudsman:** Parliamentary Ombudsman");
  });

  it("includes instructions section", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("## Instructions");
    expect(text).toContain("Follow the state machine flow above");
    expect(text).toContain("Never fabricate reference numbers");
  });

  it("appends citizen context when provided", () => {
    const text = buildJourneyPrompt(
      "test.full-service",
      fullArtefacts,
      "Citizen is 25, lives in Wales",
    );
    expect(text).toContain("## Citizen Context");
    expect(text).toContain("Citizen is 25, lives in Wales");
  });

  it("omits citizen context section when not provided", () => {
    const text = buildJourneyPrompt("test.full-service", fullArtefacts);
    expect(text).not.toContain("## Citizen Context");
  });

  it("handles minimal artefacts (manifest only)", () => {
    const text = buildJourneyPrompt("test.minimal", minimalArtefacts);
    expect(text).toContain("# Journey Guide: Minimal Service");
    expect(text).toContain("**Department:** Minimal Dept");
    // Should not include optional sections
    expect(text).not.toContain("## Eligibility Rules");
    expect(text).not.toContain("## Journey Flow");
    expect(text).not.toContain("## Consent Requirements");
    expect(text).not.toContain("## Service Constraints");
    expect(text).not.toContain("## Escalation / Handoff");
    expect(text).not.toContain("## Redress");
    // Should still include instructions
    expect(text).toContain("## Instructions");
  });
});

// ── buildEligibilityPrompt ──

describe("buildEligibilityPrompt", () => {
  it("includes service header", () => {
    const text = buildEligibilityPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("# Eligibility Assessment: Full Test Service");
    expect(text).toContain("**Full Test Service** (Test Department)");
  });

  it("includes rules with condition details", () => {
    const text = buildEligibilityPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("## Rules to Evaluate");
    expect(text).toContain("**age-check:** Must be 18 or over");
    expect(text).toContain("`age` gte 18");
    expect(text).toContain('If failed: "You must be at least 18 years old"');
    expect(text).toContain("**residency:** Must be UK resident");
    expect(text).toContain("`jurisdiction` in");
  });

  it("includes edge cases", () => {
    const text = buildEligibilityPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("## Edge Cases to Watch For");
    expect(text).toContain("**approaching-18:**");
    expect(text).toContain("Detection: age >= 17.75 && age < 18");
    expect(text).toContain("Action: Advise to apply after 18th birthday");
  });

  it("includes assessment instructions", () => {
    const text = buildEligibilityPrompt("test.full-service", fullArtefacts);
    expect(text).toContain("## Instructions");
    expect(text).toContain("Evaluate each rule against the citizen's data");
    expect(text).toContain("Flag any edge cases that apply");
    expect(text).toContain("mention any alternative services");
  });

  it("appends citizen data JSON when provided", () => {
    const citizenJson = '{"age": 25, "jurisdiction": "England"}';
    const text = buildEligibilityPrompt(
      "test.full-service",
      fullArtefacts,
      citizenJson,
    );
    expect(text).toContain("## Citizen Data");
    expect(text).toContain("```json");
    expect(text).toContain(citizenJson);
  });

  it("omits citizen data section when not provided", () => {
    const text = buildEligibilityPrompt("test.full-service", fullArtefacts);
    expect(text).not.toContain("## Citizen Data");
    expect(text).not.toContain("```json");
  });

  it("handles artefacts without policy gracefully", () => {
    const text = buildEligibilityPrompt("test.minimal", minimalArtefacts);
    expect(text).toContain("# Eligibility Assessment: Minimal Service");
    // No rules or edge cases sections
    expect(text).not.toContain("## Rules to Evaluate");
    expect(text).not.toContain("## Edge Cases to Watch For");
    // Still includes instructions
    expect(text).toContain("## Instructions");
  });

  it("handles policy without edge cases", () => {
    const policyNoEdges: PolicyRuleset = {
      id: "test.no-edges",
      version: "1.0.0",
      rules: [
        {
          id: "r1",
          description: "Rule one",
          condition: { field: "x", operator: "eq", value: 1 },
          reason_if_failed: "x must be 1",
        },
      ],
    };
    const artefacts: ServiceArtefacts = {
      manifest: minimalManifest,
      policy: policyNoEdges,
    };
    const text = buildEligibilityPrompt("test.no-edges", artefacts);
    expect(text).toContain("## Rules to Evaluate");
    expect(text).toContain("**r1:** Rule one");
    expect(text).not.toContain("## Edge Cases to Watch For");
  });
});
