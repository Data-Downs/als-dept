/** Core types for citizen-03 — the agentic app */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolUseRecord {
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  durationMs: number;
  isError: boolean;
}

export interface AgentCard {
  type: "service" | "action" | "info";
  id?: string;
  title: string;
  description: string;
  urgency?: "immediate" | "soon" | "later";
  eligible?: boolean | null;
  govuk_url?: string;
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

export interface ConsentGrant {
  id: string;
  description: string;
  data_shared: string[];
  source: string;
  purpose: string;
  duration?: string;
  required?: boolean;
}

export interface ChatApiResponse {
  response: string;
  reasoning: string;
  toolsUsed: string[];
  toolUseLog: ToolUseRecord[];
  cards: AgentCard[];
  quickReplies: string[];
  tasks: AgentTask[];
  consentRequests: ConsentGrant[];
  conversationTitle: string | null;
  traceId: string;
  iterations: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type ViewType =
  | "persona-picker"
  | "dashboard"
  | "chat"
  | "detail"
  | "plan"
  | "tasks";

export interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  daysUntil: number;
  dueLabel: string;
  urgency: "urgent" | "warning" | "ok" | "info";
  service: string;
  source: "data" | "agent" | "user";
  dueDate?: string;
}

export interface PersonaData {
  name?: string;
  personaId?: string;
  personaName?: string;
  description?: string;
  color?: string;
  primaryContact?: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    nationalInsuranceNumber?: string;
    email?: string;
    phone?: string;
  };
  address?: {
    line_1?: string;
    line_2?: string;
    city?: string;
    postcode?: string;
  };
  employment?: Record<string, unknown>;
  financials?: Record<string, unknown>;
  credentials?: Array<{
    type: string;
    issuer: string;
    number: string;
    status: string;
    expires?: string;
  }>;
  vehicles?: Array<{
    make?: string;
    model?: string;
    registrationNumber?: string;
    motExpiry?: string;
    taxExpiry?: string;
    [key: string]: unknown;
  }>;
  pregnancy?: {
    dueDate?: string;
    hospital?: string;
    [key: string]: unknown;
  };
  children?: Array<Record<string, unknown>>;
  benefits?: {
    currentlyReceiving?: Array<Record<string, unknown>>;
    potentiallyEligibleFor?: string[];
    [key: string]: unknown;
  };
  partner?: Record<string, unknown>;
  healthInfo?: Record<string, unknown>;
  family?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Streaming event types from /api/chat/stream */
export interface StreamToolStartEvent {
  type: "tool_start";
  tool: string;
  label: string;
  iteration: number;
}

export interface StreamToolCompleteEvent {
  type: "tool_complete";
  tool: string;
  label: string;
  summary: Record<string, unknown> | null;
  durationMs: number;
  isError: boolean;
}

export interface StreamReasoningEvent {
  type: "reasoning";
  text: string;
}

export interface StreamResponseEvent {
  type: "response";
  response: string;
  reasoning: string;
  toolsUsed: string[];
  toolUseLog: ToolUseRecord[];
  cards: AgentCard[];
  quickReplies: string[];
  tasks: AgentTask[];
  consentRequests: ConsentGrant[];
  conversationTitle: string | null;
  traceId: string;
  iterations: number;
}

export interface StreamErrorEvent {
  type: "error";
  message: string;
}

export type StreamEvent =
  | StreamToolStartEvent
  | StreamToolCompleteEvent
  | StreamReasoningEvent
  | StreamResponseEvent
  | StreamErrorEvent;

/** Tool progress for streaming UI */
export interface ToolProgress {
  tool: string;
  label: string;
  status: "running" | "complete" | "error";
  summary?: Record<string, unknown> | null;
  durationMs?: number;
}

/** Plan types */
export type ServicePlanStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "skipped";

export interface PlanGroup {
  depth: number;
  label: string;
  prerequisiteIds: string[];
  serviceIds: string[];
}

export interface ActivePlan {
  id: string;
  lifeEventId: string;
  lifeEventName: string;
  lifeEventIcon: string;
  startedAt: string;
  updatedAt: string;
  serviceProgress: Record<string, ServicePlanStatus>;
  groups: PlanGroup[];
  services: Array<{
    id: string;
    name: string;
    dept: string;
    serviceType: string;
  }>;
}
