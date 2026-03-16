/**
 * citizen-03 Streaming Chat API — SSE Agent Loop
 *
 * Streams tool progress events in real-time as the agent loop runs,
 * then sends the final response. Gives citizens immediate feedback
 * about what the agent is doing.
 *
 * Events:
 *   tool_start    — agent is calling a tool
 *   tool_complete — tool returned a result
 *   reasoning     — agent's current thinking
 *   response      — final text + cards + quick replies
 *   error         — something went wrong
 */

import { NextRequest } from "next/server";
import { AnthropicAdapter } from "@als/adapters";
import type { AnthropicChatInput, AnthropicChatOutput } from "@als/adapters";
import {
  getAgentToolDefinitions,
  handleToolCall,
  type ToolContext,
  type CitizenSession,
} from "@als/agent-tools";
import { ServiceGraphEngine } from "@als/service-graph";
import { ArtefactStore } from "@als/legibility";
import path from "path";

// ── Reuse singletons from the main route ──

let adapter: AnthropicAdapter | null = null;
let adapterPromise: Promise<AnthropicAdapter> | null = null;

async function getAdapter(): Promise<AnthropicAdapter> {
  if (adapter) return adapter;
  if (adapterPromise) return adapterPromise;
  adapterPromise = (async () => {
    let apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      try {
        const { getCloudflareContext } = await import("@opennextjs/cloudflare");
        const { env } = getCloudflareContext() as {
          env: Record<string, string>;
        };
        apiKey = env?.ANTHROPIC_API_KEY;
      } catch {
        /* Not on Cloudflare */
      }
    }
    adapter = new AnthropicAdapter();
    adapter.initialize({ apiKey });
    return adapter;
  })();
  return adapterPromise;
}

let graphEngine: ServiceGraphEngine | null = null;
function getGraph(): ServiceGraphEngine {
  if (!graphEngine) graphEngine = new ServiceGraphEngine();
  return graphEngine;
}

let artefactStore: ArtefactStore | null = null;
let artefactStorePromise: Promise<ArtefactStore> | null = null;

async function getArtefactStore(): Promise<ArtefactStore> {
  if (artefactStore) return artefactStore;
  if (artefactStorePromise) return artefactStorePromise;
  artefactStorePromise = (async () => {
    const store = new ArtefactStore();
    for (const base of [
      path.join(process.cwd(), "..", "..", "data", "services"),
      path.join(process.cwd(), "data", "services"),
    ]) {
      try {
        const count = await store.loadFromDirectory(base);
        if (count > 0) break;
      } catch {
        continue;
      }
    }
    artefactStore = store;
    return store;
  })();
  return artefactStorePromise;
}

async function loadPersonaData(
  personaId: string,
): Promise<Record<string, unknown>> {
  const fs = await import("fs/promises");
  for (const base of [
    path.join(process.cwd(), "..", "..", "data", "simulated", "users"),
    path.join(process.cwd(), "data", "simulated", "users"),
  ]) {
    try {
      const raw = await fs.readFile(
        path.join(base, `${personaId}.json`),
        "utf-8",
      );
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return { name: personaId };
}

// ── Tool labels for streaming UX ──

const TOOL_LABELS: Record<string, string> = {
  query_service_graph: "Searching services",
  get_life_event_plan: "Loading life event plan",
  get_related_services: "Finding related services",
  check_eligibility: "Checking eligibility",
  get_citizen_context: "Loading your profile",
  record_evidence: "Recording to ledger",
};

// ── Summarize tool output ──

function summarizeToolOutput(
  toolName: string,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  switch (toolName) {
    case "query_service_graph": {
      const services = (raw.services || []) as Array<Record<string, unknown>>;
      return {
        totalCount: raw.totalCount,
        services: services
          .slice(0, 6)
          .map((s) => ({ id: s.id, name: s.name, serviceType: s.serviceType })),
        truncated: services.length > 6,
      };
    }
    case "get_life_event_plan": {
      const le = raw.lifeEvent as Record<string, unknown> | undefined;
      const plan = raw.plan as Record<string, unknown> | undefined;
      const groups = (plan?.groups || []) as Array<Record<string, unknown>>;
      return {
        lifeEvent: le?.name,
        groupCount: groups.length,
        groups: groups.map((g) => ({
          label: g.label,
          serviceCount: (g.serviceIds as string[])?.length || 0,
        })),
        totalServices: (raw.serviceDetails as unknown[])?.length || 0,
      };
    }
    case "get_related_services": {
      const svc = raw.service as Record<string, unknown> | undefined;
      const requires = (raw.requires || []) as Array<Record<string, unknown>>;
      const enables = (raw.enables || []) as Array<Record<string, unknown>>;
      return {
        service: svc?.name,
        requiresCount: requires.length,
        requires: requires.map((s) => s.name),
        enablesCount: enables.length,
        enables: enables.map((s) => s.name),
      };
    }
    case "check_eligibility": {
      const pr = raw.policyResult as Record<string, unknown> | undefined;
      return {
        service: raw.serviceName,
        eligible: pr?.eligible,
        explanation:
          typeof pr?.explanation === "string"
            ? pr.explanation.slice(0, 200)
            : undefined,
        hasPolicy: (raw.artefacts as Record<string, unknown>)?.hasPolicy,
      };
    }
    case "get_citizen_context":
      return {
        name: raw.name,
        verifiedFieldCount: Object.keys(
          (raw.verifiedData as Record<string, unknown>) || {},
        ).length,
        submittedFieldCount: Object.keys(
          (raw.submittedData as Record<string, unknown>) || {},
        ).length,
        inferredFieldCount: Object.keys(
          (raw.inferredData as Record<string, unknown>) || {},
        ).length,
      };
    case "record_evidence":
      return { eventType: raw.eventType, recorded: raw.recorded };
    default:
      return raw;
  }
}

// ── System prompt (same as main route) ──

function buildSystemPrompt(personaData: Record<string, unknown>): string {
  const name =
    (personaData.name as string) ||
    `${(personaData.primaryContact as Record<string, string>)?.firstName || ""} ${(personaData.primaryContact as Record<string, string>)?.lastName || ""}`.trim() ||
    "the citizen";

  return `You are a UK government services assistant helping ${name}.

## Your Role
You help citizens navigate UK government services one step at a time. You have tools to search services, check eligibility, and understand service relationships.

## CRITICAL: Response Format

Your response MUST be SHORT — 2-4 sentences of conversational text, maximum. Do NOT list every service. Do NOT write walls of text. Do NOT use long markdown lists.

After your short text response, you MUST include a structured JSON block that provides interactive cards and suggested next actions. The UI renders these as tappable cards — this is how citizens navigate, not by reading paragraphs.

Format your response EXACTLY like this:

Your short conversational text here (2-4 sentences only).

\`\`\`json
{
  "cards": [
    {
      "type": "service",
      "id": "service-id-from-graph",
      "title": "Service Name",
      "description": "One sentence about what this is and why it matters to them",
      "urgency": "immediate" | "soon" | "later",
      "eligible": true | false | null,
      "govuk_url": "https://..."
    },
    {
      "type": "action",
      "title": "What the citizen should do",
      "description": "Brief explanation"
    },
    {
      "type": "info",
      "title": "Important information",
      "description": "Brief explanation"
    }
  ],
  "quickReplies": [
    "Check my eligibility for Bereavement Support Payment",
    "Tell me about registering the death",
    "What documents will I need?"
  ],
  "tasks": [
    {
      "id": "unique-task-id",
      "description": "Short task title",
      "detail": "What to do and why",
      "type": "user",
      "dueDate": "2026-04-01" or null,
      "dataNeeded": ["email", "phone", "national_insurance_number"],
      "fields": [
        { "key": "email", "label": "Email address", "type": "email", "placeholder": "e.g. name@email.com", "prefill": "known-value-or-empty" }
      ]
    }
  ],
  "consentRequests": [
    {
      "id": "consent-id",
      "description": "Share your income data with HMRC",
      "data_shared": ["income", "employment_status"],
      "source": "dwp",
      "purpose": "To verify your benefit eligibility",
      "duration": "6 months",
      "required": true
    }
  ]
}
\`\`\`

## Guidelines for cards

- Show 2-4 cards maximum, not every service you found
- Prioritise by urgency: what MUST they do first?
- For a life event with many services, show the FIRST STEP only, then offer to show more
- "service" cards should reference real service IDs from the graph
- "action" cards are for things the citizen needs to do
- "info" cards are for important context
- Quick replies should be 2-4 natural follow-up questions

## Guidelines for tasks

- Emit tasks when the citizen needs to provide specific data (bank details, address, NI number, etc.)
- Use "user" type for data the citizen must provide, "agent" type for things the system will handle
- Include "fields" array with structured field definitions when you know the exact data needed
- Known field keys: email, phone, full_name, date_of_birth, national_insurance_number, address, sort_code, account_number, tenure_type, monthly_rent, employer_name, employment_status, employment_end_date, income_amount, landlord_name, landlord_address
- Pre-fill field values from citizen context when available
- Set dueDate when there's a real deadline

## Guidelines for consent requests

- Emit consentRequests when data sharing between government departments is needed
- Mark as required: true when the service cannot proceed without this consent
- Be specific about what data is shared and why
- Include the source department and purpose

## How to Work

1. Use \`get_citizen_context\` to understand their situation
2. Use \`get_life_event_plan\` or \`query_service_graph\` to find services
3. Use \`check_eligibility\` before saying someone qualifies
4. Guide them ONE STEP AT A TIME — don't overwhelm

## Constraints
- Never fabricate service information
- Check eligibility before claiming someone qualifies
- If unsure, say so
- Offer human advisor connection for complex situations

## Citizen Profile
Name: ${name}
${personaData.address ? `Location: ${(personaData.address as Record<string, string>).city || ""}, ${(personaData.address as Record<string, string>).postcode || ""}` : ""}`;
}

// ── SSE helpers ──

function sseEvent(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, ...(data as object) })}\n\n`;
}

// ── The Streaming Agent Loop ──

const MAX_TOOL_ITERATIONS = 8;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { persona, messages, generateTitle } = body as {
      persona: string;
      messages: Array<{ role: string; content: string }>;
      generateTitle?: boolean;
    };

    if (!persona || !messages) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: persona, messages" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const traceId = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const sessionId = `session_${Date.now()}`;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // ── Step 1: Load context ──
          const [personaData, llmAdapter, store] = await Promise.all([
            loadPersonaData(persona),
            getAdapter(),
            getArtefactStore(),
          ]);

          const session: CitizenSession = {
            userId: persona,
            sessionId,
            traceId,
          };
          const toolContext: ToolContext = {
            graph: getGraph(),
            artefactStore: store,
            session,
            citizenData: {
              verified: {
                firstName: (
                  personaData.primaryContact as Record<string, unknown>
                )?.firstName,
                lastName: (
                  personaData.primaryContact as Record<string, unknown>
                )?.lastName,
                dateOfBirth: (
                  personaData.primaryContact as Record<string, unknown>
                )?.dateOfBirth,
                nationalInsuranceNumber: (
                  personaData.primaryContact as Record<string, unknown>
                )?.nationalInsuranceNumber,
              },
              submitted: {
                address: personaData.address,
                employment: personaData.employment,
                financials: personaData.financials,
              },
              inferred: {},
            },
          };

          // ── Step 2: Build prompt + tools ──
          const systemPrompt = buildSystemPrompt(personaData);
          const tools = getAgentToolDefinitions();
          const anthropicTools = tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.input_schema,
          }));

          // ── Step 3: Streaming agent loop ──
          interface ToolRecord {
            tool: string;
            input: Record<string, unknown>;
            output: Record<string, unknown> | null;
            durationMs: number;
            isError: boolean;
          }
          const toolUseLog: ToolRecord[] = [];
          let currentMessages = messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

          let finalResponse = "";
          let reasoning = "";
          let iterations = 0;

          while (iterations < MAX_TOOL_ITERATIONS) {
            iterations++;

            const adapterInput: AnthropicChatInput = {
              systemPrompt,
              messages: currentMessages,
              tools: anthropicTools as unknown as Array<
                Record<string, unknown>
              >,
            };

            const result = await llmAdapter.execute({
              input: adapterInput,
              context: { sessionId, traceId, userId: persona },
            });

            if (!result.success)
              throw new Error(result.error || "LLM call failed");

            const output = result.output as AnthropicChatOutput;
            reasoning = output.reasoning || reasoning;

            if (output.toolCalls && output.toolCalls.length > 0) {
              currentMessages.push({
                role: "assistant",
                content: output.rawContent as unknown as string,
              });

              const toolResults: Array<{
                type: "tool_result";
                tool_use_id: string;
                content: string;
              }> = [];

              for (const toolCall of output.toolCalls) {
                // Stream: tool starting
                controller.enqueue(
                  encoder.encode(
                    sseEvent("tool_start", {
                      tool: toolCall.name,
                      label: TOOL_LABELS[toolCall.name] || toolCall.name,
                      iteration: iterations,
                    }),
                  ),
                );

                const start = Date.now();
                const toolResult = await handleToolCall(
                  toolCall.name,
                  toolCall.input as Record<string, unknown>,
                  toolContext,
                );
                const durationMs = Date.now() - start;

                let parsedOutput: Record<string, unknown> | null = null;
                try {
                  const raw = JSON.parse(toolResult.content[0].text);
                  parsedOutput = summarizeToolOutput(toolCall.name, raw);
                } catch {
                  /* non-JSON */
                }

                const record: ToolRecord = {
                  tool: toolCall.name,
                  input: toolCall.input as Record<string, unknown>,
                  output: parsedOutput,
                  durationMs,
                  isError: !!toolResult.isError,
                };
                toolUseLog.push(record);

                // Stream: tool complete
                controller.enqueue(
                  encoder.encode(
                    sseEvent("tool_complete", {
                      tool: toolCall.name,
                      label: TOOL_LABELS[toolCall.name] || toolCall.name,
                      summary: parsedOutput,
                      durationMs,
                      isError: record.isError,
                    }),
                  ),
                );

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolCall.id,
                  content: toolResult.content[0].text,
                });
              }

              currentMessages.push({
                role: "user",
                content: toolResults as unknown as string,
              });

              // Stream: reasoning update
              if (reasoning) {
                controller.enqueue(
                  encoder.encode(sseEvent("reasoning", { text: reasoning })),
                );
              }

              continue;
            }

            finalResponse = output.responseText;
            break;
          }

          // ── Parse structured output ──
          let cards: Array<Record<string, unknown>> = [];
          let quickReplies: string[] = [];
          let tasks: Array<Record<string, unknown>> = [];
          let consentRequests: Array<Record<string, unknown>> = [];
          let cleanResponse = finalResponse;

          const jsonMatch = finalResponse.match(/```json\s*([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              cards = parsed.cards || [];
              quickReplies = parsed.quickReplies || [];
              tasks = parsed.tasks || [];
              consentRequests = parsed.consentRequests || [];
              cleanResponse = finalResponse
                .replace(/```json\s*[\s\S]*?```/, "")
                .trim();
            } catch {
              /* malformed */
            }
          }
          finalResponse = cleanResponse;

          if (!finalResponse && iterations >= MAX_TOOL_ITERATIONS) {
            finalResponse =
              "I've been exploring your options. Could you tell me more about your specific situation?";
          }

          // ── Generate title ──
          let conversationTitle: string | null = null;
          if (generateTitle && messages.length <= 2) {
            try {
              const titleResult = await llmAdapter.execute({
                input: {
                  systemPrompt:
                    "Generate a concise 3-6 word title for this conversation. Return only the title, nothing else.",
                  messages: [
                    {
                      role: "user",
                      content: messages[messages.length - 1]?.content || "",
                    },
                    { role: "assistant", content: finalResponse },
                  ],
                },
                context: { sessionId, traceId, userId: persona },
              });
              if (titleResult.success) {
                conversationTitle = (
                  titleResult.output as AnthropicChatOutput
                ).responseText
                  .replace(/["']/g, "")
                  .trim();
              }
            } catch {
              /* non-critical */
            }
          }

          // ── Stream final response ──
          controller.enqueue(
            encoder.encode(
              sseEvent("response", {
                response: finalResponse,
                reasoning,
                toolsUsed: toolUseLog.map((t) => t.tool),
                toolUseLog,
                cards,
                quickReplies,
                tasks,
                consentRequests,
                conversationTitle,
                traceId,
                iterations,
              }),
            ),
          );

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              sseEvent("error", {
                message: error instanceof Error ? error.message : String(error),
              }),
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to start stream",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
