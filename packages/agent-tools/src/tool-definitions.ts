/**
 * Tool definitions for citizen-03's agentic architecture.
 *
 * These are Anthropic tool_use definitions that get passed to the LLM,
 * allowing it to reason about which services to explore, how they relate,
 * and what data to collect — rather than following a hard-coded pipeline.
 */

import type { AgentToolDefinition } from "./types";

export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: "query_service_graph",
    description:
      "Search the UK government service graph (108 services across 16 life events). " +
      "Use this to find relevant services for a citizen's situation. " +
      "You can filter by life event, department, service type, or search by keyword. " +
      "Returns service details including eligibility summaries and GOV.UK URLs.",
    input_schema: {
      type: "object",
      properties: {
        life_event_id: {
          type: "string",
          description:
            "Filter by life event ID (e.g. 'bereavement', 'having-a-child', 'retiring'). " +
            "Returns all services reachable from that life event via REQUIRES/ENABLES edges.",
        },
        department: {
          type: "string",
          description:
            "Filter by department key (e.g. 'dwp', 'hmrc', 'dvla', 'ho'). " +
            "Returns all services managed by that department.",
        },
        service_type: {
          type: "string",
          enum: [
            "benefit",
            "entitlement",
            "obligation",
            "registration",
            "application",
            "legal_process",
            "document",
            "grant",
          ],
          description: "Filter by service typology.",
        },
        keyword: {
          type: "string",
          description:
            "Search services by keyword match against name and description. " +
            "Case-insensitive partial match.",
        },
      },
      required: [],
    },
  },

  {
    name: "get_life_event_plan",
    description:
      "Get a topologically-ordered plan for a life event. " +
      "Returns services grouped by dependency depth — what to do first, " +
      "what becomes available after each step, and the prerequisite chain. " +
      "Use this when a citizen describes a life situation (e.g. 'my spouse has died', " +
      "'I'm having a baby', 'I've lost my job') to understand the full service landscape.",
    input_schema: {
      type: "object",
      properties: {
        life_event_id: {
          type: "string",
          description:
            "The life event ID. Available events: bereavement, having-a-child, " +
            "retiring, losing-a-job, becoming-disabled, moving-abroad, " +
            "starting-a-business, buying-a-home, getting-divorced, " +
            "leaving-prison, becoming-a-carer, reaching-state-pension-age, " +
            "immigration, leaving-care, entering-education, death-abroad.",
        },
      },
      required: ["life_event_id"],
    },
  },

  {
    name: "get_related_services",
    description:
      "Get services related to a specific service via REQUIRES and ENABLES edges. " +
      "REQUIRES = prerequisite services that must be completed first. " +
      "ENABLES = downstream services that become available after this one. " +
      "Use this to understand service dependencies and suggest next steps.",
    input_schema: {
      type: "object",
      properties: {
        service_id: {
          type: "string",
          description:
            "The service ID to look up relationships for. " +
            "Can be a full ID (e.g. 'dwp-universal-credit') or a slug (e.g. 'universal-credit').",
        },
      },
      required: ["service_id"],
    },
  },

  {
    name: "check_eligibility",
    description:
      "Check a citizen's eligibility for a specific service by evaluating policy rules " +
      "against their known data. Returns which rules pass/fail, the overall eligibility " +
      "determination, and the current state machine position. " +
      "Use this before starting a service interaction to verify the citizen qualifies.",
    input_schema: {
      type: "object",
      properties: {
        service_id: {
          type: "string",
          description: "The service ID to check eligibility for.",
        },
        citizen_data: {
          type: "object",
          description:
            "Known citizen data to evaluate against policy rules. " +
            "Keys should match the field names in the service's policy rules " +
            "(e.g. 'age', 'income', 'employment_status', 'ni_contributions').",
        },
      },
      required: ["service_id"],
    },
  },

  {
    name: "get_citizen_context",
    description:
      "Retrieve the current citizen's personal data profile across all three tiers: " +
      "Tier 1 (verified — from identity credentials), " +
      "Tier 2 (submitted — declared by the citizen), " +
      "Tier 3 (inferred — derived by the system). " +
      "Also returns active service interactions and their current states. " +
      "Use this at the start of a conversation to understand what's already known.",
    input_schema: {
      type: "object",
      properties: {
        include_active_services: {
          type: "boolean",
          description:
            "Whether to include the list of active service interactions. Defaults to true.",
        },
      },
      required: [],
    },
  },

  {
    name: "record_evidence",
    description:
      "Record a trace event in the append-only evidence store. " +
      "Every significant action — policy evaluation, consent decision, state transition, " +
      "data collection, handoff — must be recorded for auditability. " +
      "The platform validates and stores these; the agent calls this tool to declare what happened.",
    input_schema: {
      type: "object",
      properties: {
        event_type: {
          type: "string",
          enum: [
            "policy.evaluated",
            "consent.requested",
            "consent.granted",
            "consent.denied",
            "state.transition",
            "capability.invoked",
            "capability.result",
            "handoff.initiated",
            "receipt.issued",
            "error.raised",
          ],
          description: "The type of trace event to record.",
        },
        service_id: {
          type: "string",
          description: "The service this event relates to.",
        },
        payload: {
          type: "object",
          description:
            "Event-specific data. For policy.evaluated: { eligible, passed, failed }. " +
            "For state.transition: { fromState, toState, trigger }. " +
            "For consent.granted: { grantId, dataShared }. " +
            "For capability.result: { success, output }.",
        },
      },
      required: ["event_type", "service_id", "payload"],
    },
  },
];

/** Get tool definitions in a format ready for Anthropic's tool_use API */
export function getAgentToolDefinitions(): AgentToolDefinition[] {
  return AGENT_TOOLS;
}

/** Look up a tool definition by name */
export function getToolByName(name: string): AgentToolDefinition | undefined {
  return AGENT_TOOLS.find((t) => t.name === name);
}
