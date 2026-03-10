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
  };
  address?: {
    city?: string;
    postcode?: string;
  };
  [key: string]: unknown;
}
