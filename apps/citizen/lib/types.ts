/** Core types for the citizen-02 app */

import type {
  CitizenProfile,
  Vehicle,
} from "@als/personal-data/src/citizen-data-model";

/**
 * PersonaData — extends the unified CitizenProfile from @als/personal-data.
 * Kept as a type alias for backwards compatibility across the citizen app.
 */
export type PersonaData = CitizenProfile;

export type { Vehicle } from "@als/personal-data/src/citizen-data-model";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
}

export interface TaskField {
  key: string;
  label: string;
  type:
    | "text"
    | "email"
    | "tel"
    | "currency"
    | "date"
    | "number"
    | "confirm"
    | "select";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  prefill?: string;
  required?: boolean;
}

export interface AgentTask {
  id: string;
  description: string;
  detail: string;
  type: "agent" | "user";
  dueDate: string | null;
  dataNeeded: string[];
  options?: Array<{ value: string; label: string }>;
  fields?: TaskField[];
}

export interface UCStateInfo {
  currentState: string;
  previousState?: string;
  trigger?: string;
  allowedTransitions: string[];
  stateHistory: string[];
}

export interface ConsentGrant {
  id: string;
  description: string;
  data_shared: string[];
  source: string;
  purpose: string;
  duration?: string;
  required?: boolean;
}

export interface ChatApiRequest {
  persona: string;
  agent: string;
  scenario: string;
  messages: ChatMessage[];
  generateTitle?: boolean;
  ucState?: string;
  ucStateHistory?: string[];
  serviceMode?: ServiceMode;
}

export interface ChatApiResponse {
  response: string;
  reasoning: string;
  toolsUsed: string[];
  conversationTitle: string | null;
  tasks: AgentTask[];
  traceId?: string;
  policyResult?: {
    eligible: boolean;
    explanation: string;
    passedCount: number;
    failedCount: number;
    edgeCaseCount: number;
  };
  handoff?: {
    triggered: boolean;
    reason?: string;
    description?: string;
    urgency?: string;
    routing?: Record<string, unknown>;
  };
  ucState?: UCStateInfo;
  consentRequests?: ConsentGrant[];
  resolvedConsents?: Array<{
    grantId: string;
    preferenceId: string;
    reason: string;
  }>;
  cardRequests?: import("@als/schemas").CardRequest[];
  interactionType?: string;
  pipelineTrace?: import("@als/schemas").PipelineTrace;
  outcomes?: import("./outcome-types").JourneyOutcome[];
  serviceProposal?: {
    serviceId: string;
    serviceName: string;
    reason: string;
  };
  needProposal?: {
    need: string;
    services: string[];
    sharedDataNeeded: string[];
    lifeEventId?: string;
  };
  lifeEventContext?: {
    lifeEventId: string;
    lifeEventName: string;
    lifeEventIcon: string;
    services: Array<{
      id: string;
      name: string;
      dept: string;
      serviceType: string;
      desc: string;
    }>;
    plan?: LifeEventPlan;
    mergedFieldPrompt: string;
  };
  serviceCompletions?: Array<{
    serviceId: string;
    status: "data_complete" | "submitted";
  }>;
}

export interface Conversation {
  id: string;
  title: string;
  service: string;
  agent: string;
  scenario: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  ucState?: string;
  ucStateHistory?: string[];
  interactionType?: string;
  tasks?: AgentTask[];
  taskCompletions?: Record<string, string>;
  tasksSubmitted?: boolean;
}

export interface StoredTask {
  id: string;
  conversationId: string;
  service: string;
  description: string;
  detail: string;
  type: "agent" | "user";
  status: "suggested" | "accepted" | "completed" | "dismissed";
  dueDate: string | null;
  dataNeeded: string[];
  options?: Array<{ value: string; label: string }>;
  fields?: TaskField[];
  createdAt: string;
  updatedAt: string;
}

export type AgentType = "dot" | "max" | "none";
export type ServiceMode = "json" | "mcp" | "demo";
export type ServiceType = "driving" | "benefits" | "family" | (string & {});
export type ViewType =
  | "persona-picker"
  | "dashboard"
  | "detail"
  | "chat"
  | "tasks"
  | "plan"
  | "services"
  | "wallet";

export type ServicePlanStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "skipped";

export interface ActivePlan {
  id: string;
  lifeEventId: string;
  lifeEventName: string;
  lifeEventIcon: string;
  startedAt: string;
  updatedAt: string;
  serviceProgress: Record<string, ServicePlanStatus>;
  serviceConversations: Record<string, string>;
  /** Human-readable reasons for auto-skipped services */
  skipReasons?: Record<string, string>;
  plan: LifeEventPlan;
  services: LifeEventService[];
}

export {
  PERSONA_NAMES,
  PERSONA_COLORS,
  PERSONA_INITIALS,
} from "./persona-meta";

export interface PlanGroup {
  depth: number;
  label: string;
  prerequisiteIds: string[];
  serviceIds: string[];
}

export interface LifeEventPlan {
  entryServiceIds: string[];
  groups: PlanGroup[];
  edges: Array<{ from: string; to: string; type: "REQUIRES" | "ENABLES" }>;
}

export interface LifeEventInfo {
  id: string;
  icon: string;
  name: string;
  desc: string;
  entryNodeCount: number;
  totalServiceCount: number;
  services: LifeEventService[];
  plan?: LifeEventPlan;
}

export interface LifeEventService {
  id: string;
  name: string;
  dept: string;
  serviceType: string;
  interactionType?: string;
  proactive: boolean;
  gated: boolean;
  desc: string;
  govuk_url: string;
  eligibility_summary: string;
  proactivity?: {
    mode: "suggest" | "warn" | "inform";
    framingPrefix: string;
    priority: number;
    iconHint: string;
    accentColor: string;
  };
}

// ── New types for citizen-02 ──

/** Unified timeline item merging data-driven upcoming dates with agent/user tasks */
export interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  daysUntil: number;
  dueLabel: string;
  urgency: "urgent" | "warning" | "ok" | "info";
  service: string;
  source: "data" | "agent" | "user";
  isLive?: boolean;
  taskStatus?: StoredTask["status"];
  taskType?: "agent" | "user";
  detail?: string;
  dueDate?: string;
}

/** A topic question for service detail views */
export interface TopicQuestion {
  id: string;
  topic: string;
  question: string;
  service: string;
}

/** MCP live data enrichment result */
export interface EnrichedData {
  enriched: boolean;
  postcode?: {
    admin_district: string;
    parliamentary_constituency: string;
    region: string;
  };
  mp?: {
    name: string;
    party: string;
    constituency: string;
  };
  floods?: {
    count: number;
    warnings: Array<{
      severity: string;
      description: string;
      area: string;
    }>;
  };
  bankHolidays?: Array<{
    title: string;
    date: string;
    daysUntil: number;
  }>;
}

/** Bottom sheet state management */
export type BottomSheetType =
  | "agent-selection"
  | "task-detail"
  | "topic-questions"
  | "filing-prompt"
  | "payment"
  | "wallet-credential"
  | "consent-preference"
  | null;

export interface BottomSheetState {
  type: BottomSheetType;
  data?: unknown;
}

/** Toast notification */
export interface ToastMessage {
  id: string;
  text: string;
}

// Simulated "today" for demo — makes upcoming dates interesting
export const DEMO_TODAY = new Date("2026-02-15");
