/**
 * Types for @als/agent-tools — the tool layer for citizen-03's agentic architecture.
 *
 * These tools are designed to be exposed to the LLM via Anthropic's tool_use,
 * letting the agent reason about services rather than having the platform decide.
 */

import type { ServiceNode, Edge, LifeEvent, LifeEventPlan } from "@als/service-graph";
import type { ServiceArtefacts } from "@als/legibility";
import type { PolicyResult, TransitionResult } from "@als/schemas";

// ── Tool Definition (Anthropic tool_use format) ──

export interface AgentToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ── Tool Call Result ──

export interface ToolCallResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// ── Tool-specific result types ──

export interface ServiceGraphQueryResult {
  services: Array<{
    id: string;
    name: string;
    dept: string;
    serviceType: string;
    desc: string;
    govuk_url: string;
    proactive: boolean;
    gated: boolean;
    eligibilitySummary: string;
  }>;
  totalCount: number;
}

export interface LifeEventPlanResult {
  lifeEvent: {
    id: string;
    name: string;
    desc: string;
  };
  plan: LifeEventPlan;
  serviceDetails: Array<{
    id: string;
    name: string;
    serviceType: string;
    desc: string;
    eligibilitySummary: string;
  }>;
}

export interface RelatedServicesResult {
  service: {
    id: string;
    name: string;
    serviceType: string;
  };
  requires: Array<{
    id: string;
    name: string;
    serviceType: string;
    desc: string;
  }>;
  enables: Array<{
    id: string;
    name: string;
    serviceType: string;
    desc: string;
  }>;
}

export interface CitizenContextResult {
  userId: string;
  name: string;
  verifiedData: Record<string, unknown>;
  submittedData: Record<string, unknown>;
  inferredData: Record<string, unknown>;
  activeServices: Array<{
    serviceId: string;
    currentState: string;
    isTerminal: boolean;
  }>;
}

export interface EligibilityCheckResult {
  serviceId: string;
  serviceName: string;
  policyResult: PolicyResult;
  stateModel: {
    currentState: string;
    allowedTransitions: Array<{ to: string; trigger?: string }>;
    isTerminal: boolean;
  } | null;
  artefacts: {
    hasPolicy: boolean;
    hasStateModel: boolean;
    hasConsent: boolean;
    hasStateInstructions: boolean;
  };
}

export interface DataCollectionResult {
  serviceId: string;
  fieldsCollected: Array<{
    key: string;
    tier: "verified" | "submitted" | "inferred";
  }>;
  consentRequired: boolean;
  consentGrants: string[];
}

export interface EvidenceRecordResult {
  traceId: string;
  eventType: string;
  recorded: boolean;
}

// ── Citizen context (passed to tools at runtime) ──

export interface CitizenSession {
  userId: string;
  sessionId: string;
  traceId: string;
}
