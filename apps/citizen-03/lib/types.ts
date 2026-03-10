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

export interface ChatApiResponse {
  response: string;
  reasoning: string;
  toolsUsed: string[];
  toolUseLog: ToolUseRecord[];
  cards: AgentCard[];
  quickReplies: string[];
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

export type ViewType = "persona-picker" | "dashboard" | "chat";

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
  vehicles?: Array<Record<string, unknown>>;
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
