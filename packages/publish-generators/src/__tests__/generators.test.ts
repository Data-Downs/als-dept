import { describe, it, expect } from "vitest";
import { generateMcp } from "../mcp";
import { generateOpenApi } from "../openapi";
import { generateCatalogue } from "../catalogue";
import { generateHtml } from "../html";
import type { ServiceArtefacts } from "../types";

const SAMPLE_ARTEFACTS: ServiceArtefacts = {
  manifest: {
    id: "dwp.apply-universal-credit",
    version: "1.0.0",
    name: "Apply for Universal Credit",
    description: "Apply for Universal Credit — income-related benefit",
    department: "DWP",
    jurisdiction: "England, Wales, Scotland",
    input_schema: {
      type: "object",
      properties: {
        full_name: { type: "string" },
        national_insurance_number: { type: "string" },
      },
    },
    output_schema: {
      type: "object",
      properties: {
        claim_reference: { type: "string" },
      },
    },
    constraints: { sla: "10 working days", fee: "Free" },
    eligibility_ruleset_id: "dwp.universal-credit.eligibility",
    consent_requirements: ["identity-verification"],
    evidence_requirements: ["identity-verified"],
    redress: {
      complaint_url: "https://www.gov.uk/dwp-complaints",
      appeal_process: "Mandatory reconsideration, then tribunal",
      ombudsman: "Parliamentary and Health Service Ombudsman",
    },
    audit_requirements: {
      retention_period: "6 years",
      data_controller: "DWP",
      lawful_basis: "Legal obligation",
    },
    handoff: {
      escalation_phone: "0800 328 5644",
      opening_hours: "Mon-Fri 8am-6pm",
    },
    promoted: true,
    source: "full" as const,
    serviceType: "benefit",
    govuk_url: "https://www.gov.uk/universal-credit",
    eligibility_summary: "You must be 18+, in the UK, and on a low income.",
    proactive: false,
    gated: false,
  },
  policy: {
    id: "dwp.universal-credit.eligibility",
    version: "1.0.0",
    rules: [
      {
        id: "age-check",
        description: "You must be 18 or over",
        condition: { field: "age", operator: "gte", value: 18 },
        reason_if_failed: "You must be at least 18 years old to apply.",
      },
      {
        id: "residency",
        description: "You must live in England, Wales, or Scotland",
        condition: { field: "country", operator: "in", value: ["England", "Wales", "Scotland"] },
        reason_if_failed: "Universal Credit is not available in Northern Ireland through this service.",
      },
    ],
    explanation_template: "Universal Credit eligibility: {outcome}",
    edge_cases: [
      {
        id: "sanctions",
        description: "Citizen has an active sanction",
        detection: "sanction_flag",
        action: "Inform citizen of sanction status and appeal rights.",
      },
    ],
  },
  stateModel: {
    id: "dwp.universal-credit.states",
    version: "1.0.0",
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "eligibility-checked" },
      { id: "consent-given" },
      { id: "completed", type: "terminal", receipt: true },
    ],
    transitions: [
      { from: "not-started", to: "identity-verified", trigger: "verify-identity" },
      { from: "identity-verified", to: "eligibility-checked", trigger: "check-eligibility" },
      { from: "eligibility-checked", to: "consent-given", trigger: "grant-consent", condition: "eligible" },
      { from: "consent-given", to: "completed", trigger: "submit-application" },
    ],
  },
  consent: {
    id: "dwp.universal-credit.consent",
    version: "1.0.0",
    grants: [
      {
        id: "identity-verification",
        description: "Verify your identity through One Login",
        data_shared: ["full_name", "date_of_birth", "national_insurance_number"],
        source: "one-login",
        purpose: "To confirm your identity for the application",
        duration: "session",
        required: true,
      },
    ],
    revocation: {
      mechanism: "Contact DWP to withdraw your application before a decision is made.",
      effect: "Your application will be cancelled and data deleted within 30 days.",
    },
    delegation: {
      agent_identity: "GOV.UK AI Agent",
      scopes: ["verify-identity", "submit-application"],
      limitations: "Agent cannot approve or reject claims.",
    },
  },
  cardDefinitions: null,
};

const EMPTY_ARTEFACTS: ServiceArtefacts = {
  manifest: null,
  policy: null,
  stateModel: null,
  consent: null,
  cardDefinitions: null,
};

describe("generateMcp", () => {
  it("generates tools, resources, and prompts from full artefacts", () => {
    const result = generateMcp(SAMPLE_ARTEFACTS);

    expect(result.resources).toHaveLength(4); // manifest + policy + state-model + consent
    expect(result.tools).toHaveLength(2); // eligibility + advance
    expect(result.prompts).toHaveLength(2); // journey + eligibility

    expect(result.tools[0].name).toBe("dwp_apply_universal_credit_check_eligibility");
    expect(result.tools[1].name).toBe("dwp_apply_universal_credit_advance_state");
    expect(result.resources[0].uri).toBe("service://dwp.apply-universal-credit/manifest");
  });

  it("returns empty output for null manifest", () => {
    const result = generateMcp(EMPTY_ARTEFACTS);
    expect(result.tools).toHaveLength(0);
    expect(result.resources).toHaveLength(0);
    expect(result.prompts).toHaveLength(0);
  });
});

describe("generateOpenApi", () => {
  it("generates valid OpenAPI structure", () => {
    const result = generateOpenApi(SAMPLE_ARTEFACTS);

    expect(result.openapi).toBe("3.0.3");
    expect(result.info.title).toBe("Apply for Universal Credit");
    expect(result.info.version).toBe("1.0.0");

    const pathKeys = Object.keys(result.paths);
    expect(pathKeys).toContain("/services/dwp.apply-universal-credit");
    expect(pathKeys).toContain("/services/dwp.apply-universal-credit/check-eligibility");
    // 4 transition endpoints
    expect(pathKeys.filter((k) => k.includes("/transitions/"))).toHaveLength(4);
  });

  it("returns minimal spec for null manifest", () => {
    const result = generateOpenApi(EMPTY_ARTEFACTS);
    expect(result.openapi).toBe("3.0.3");
    expect(Object.keys(result.paths)).toHaveLength(0);
  });
});

describe("generateCatalogue", () => {
  it("generates Schema.org and DCAT entries", () => {
    const result = generateCatalogue(SAMPLE_ARTEFACTS);

    expect(result.schemaOrg["@type"]).toBe("GovernmentService");
    expect(result.schemaOrg.name).toBe("Apply for Universal Credit");
    expect(result.schemaOrg.url).toBe("https://www.gov.uk/universal-credit");

    expect(result.dcat["@type"]).toBe("dcat:DataService");
    expect(result.dcat["dct:title"]).toBe("Apply for Universal Credit");
  });

  it("returns empty objects for null manifest", () => {
    const result = generateCatalogue(EMPTY_ARTEFACTS);
    expect(result.schemaOrg).toEqual({});
    expect(result.dcat).toEqual({});
  });
});

describe("generateHtml", () => {
  it("generates valid HTML document", () => {
    const result = generateHtml(SAMPLE_ARTEFACTS);

    expect(result).toContain("<!doctype html>");
    expect(result).toContain("Apply for Universal Credit");
    expect(result).toContain("DWP");
    expect(result).toContain("You must be 18 or over");
    expect(result).toContain("Verify your identity through One Login");
    expect(result).toContain("not-started");
    expect(result).toContain("completed");
  });

  it("generates minimal HTML for empty artefacts", () => {
    const result = generateHtml(EMPTY_ARTEFACTS);
    expect(result).toContain("<!doctype html>");
    expect(result).toContain("Unknown service");
  });
});
