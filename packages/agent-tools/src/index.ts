/**
 * @als/agent-tools — Tool layer for citizen-03's agentic architecture.
 *
 * Exposes platform infrastructure (service graph, policy engine, state machines,
 * evidence store) as tools the LLM can call via Anthropic's tool_use API.
 *
 * Architecture principle: "LLM reasons with tools, platform validates."
 * The agent decides WHAT to do; the platform ensures HOW is correct.
 */

// Tool definitions (passed to Anthropic's tool_use)
export {
  AGENT_TOOLS,
  getAgentToolDefinitions,
  getToolByName,
} from "./tool-definitions";

// Tool dispatch (called when the LLM invokes a tool)
export { handleToolCall } from "./tool-handlers";
export type { ToolContext } from "./tool-handlers";

// Types
export type {
  AgentToolDefinition,
  ToolCallResult,
  CitizenSession,
  ServiceGraphQueryResult,
  LifeEventPlanResult,
  RelatedServicesResult,
  EligibilityCheckResult,
  CitizenContextResult,
  EvidenceRecordResult,
  DataCollectionResult,
} from "./types";
