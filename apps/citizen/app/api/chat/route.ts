import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import * as mcpClient from "@/lib/mcp-client";
import * as localMcpClient from "@/lib/local-mcp-client";
import {
  CapabilityInvoker,
  Orchestrator,
  JsonServiceStrategy,
  McpServiceStrategy,
} from "@als/runtime";
import type {
  LLMAdapter,
  LLMChatResult,
  OrchestratorOutput,
} from "@als/runtime";
import { AnthropicAdapter } from "@als/adapters";
import type { AnthropicChatInput, AnthropicChatOutput } from "@als/adapters";
import type {
  InvocationContext,
  PolicyRuleset,
  StateModelDefinition,
  StateInstructions,
  CardRequest,
  TemplateContext,
} from "@als/schemas";
import {
  resolveCardsWithOverrides,
  inferInteractionType,
  INSTRUCTION_TEMPLATE_REGISTRY,
  resolveTemplateInstructions,
  templateToStateModel,
  OUTCOME_TEMPLATE_REGISTRY,
  buildOutcomeFromTemplate,
  resolveTerminalConfig,
  type InteractionType,
} from "@als/schemas";
import type { JourneyOutcome } from "@als/schemas";
import type { StateCardMapping } from "@als/schemas";
import { getTraceEmitter, getReceiptGenerator } from "@/lib/evidence";
import {
  getServiceArtefact,
  getPersonaData,
  getPromptFile,
  getAnyManifest,
  getGraphNode,
  getCardDefinitions,
} from "@/lib/service-data";
import {
  getInferredStore,
  getServiceAccessStore,
  getSubmittedStore,
} from "@/lib/personal-data-store";

// ── AnthropicAdapter — the ONLY Anthropic SDK usage ──
// Lazy-initialized at request time so Cloudflare Worker secrets are available
let llmAdapter: AnthropicAdapter | null = null;
let llmAdapterPromise: Promise<AnthropicAdapter> | null = null;

async function getLLMAdapter(): Promise<AnthropicAdapter> {
  if (llmAdapter) return llmAdapter;
  if (llmAdapterPromise) return llmAdapterPromise;

  llmAdapterPromise = (async () => {
    try {
      let apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        try {
          const { getCloudflareContext } =
            await import("@opennextjs/cloudflare");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { env } = getCloudflareContext() as { env: any };
          apiKey = env?.ANTHROPIC_API_KEY;
        } catch {
          // Not on Cloudflare
        }
      }
      if (!apiKey) {
        console.warn("⚠️  ANTHROPIC_API_KEY is not set — chat will fail.");
      }
      llmAdapter = new AnthropicAdapter();
      llmAdapter.initialize({ apiKey });
      return llmAdapter;
    } catch (err) {
      llmAdapterPromise = null;
      throw err;
    }
  })();

  return llmAdapterPromise;
}

/** Wrap AnthropicAdapter to satisfy the Orchestrator's LLMAdapter interface */
function wrapAsLLMAdapter(adapter: AnthropicAdapter): LLMAdapter {
  return {
    async chat(params): Promise<LLMChatResult> {
      const adapterInput: AnthropicChatInput = {
        systemPrompt: params.systemPrompt,
        messages: params.messages,
        tools: params.tools
          ? (params.tools as unknown as Array<Record<string, unknown>>)
          : undefined,
      };
      const result = await adapter.execute({
        input: adapterInput,
        context: { sessionId: "", traceId: "", userId: "" },
      });
      if (!result.success) {
        throw new Error(result.error || "LLM adapter call failed");
      }
      const output = result.output as AnthropicChatOutput;
      return {
        responseText: output.responseText,
        reasoning: output.reasoning || "",
        toolCalls: output.toolCalls,
        rawContent: output.rawContent,
        stopReason: output.stopReason,
      };
    },
  };
}

// ── Singleton CapabilityInvoker ──
const invoker = new CapabilityInvoker();

// ── Scenario → service mapping ──
const LEGACY_SCENARIO_MAP: Record<string, string> = {
  driving: "dvla.renew-driving-licence",
  benefits: "dwp.apply-universal-credit",
  parenting: "dwp.check-state-pension",
};

function resolveServiceId(scenario: string): string {
  if (LEGACY_SCENARIO_MAP[scenario]) return LEGACY_SCENARIO_MAP[scenario];
  if (scenario.includes(".")) return scenario;
  const graphNode = getGraphNode(scenario);
  if (graphNode) return graphNode.id;
  return scenario;
}

// ── MCP connection ──
let mcpConnected = false;
async function ensureMcpConnection() {
  if (!mcpConnected) {
    mcpConnected = true;
    mcpClient.connect().then((success) => {
      if (success) {
        console.log("MCP connected — live GOV.UK data available");
      } else {
        console.log("MCP unavailable — chat works without live data");
      }
    });
  }
}

let localMcpConnecting = false;
async function ensureLocalMcpConnection() {
  if (localMcpClient.isLocalConnected()) return;
  if (localMcpConnecting) return;
  localMcpConnecting = true;
  try {
    const success = await localMcpClient.connectLocal();
    if (success) {
      console.log("Local MCP connected — service tools available");
    } else {
      console.warn(
        "Local MCP unavailable — MCP mode will have no service tools",
      );
    }
  } finally {
    localMcpConnecting = false;
  }
}

// ── Data Loading (app layer — filesystem/DB access) ──

async function loadFile(filePath: string): Promise<string> {
  const bundled = getPromptFile(filePath);
  if (bundled) return bundled;
  const fullPath = path.join(process.cwd(), filePath);
  return fs.readFile(fullPath, "utf-8");
}

async function loadPersonaData(personaId: string) {
  try {
    const submittedStore = await getSubmittedStore();
    const bundled = getPersonaData(personaId);
    if (bundled) {
      await submittedStore.seedFromPersona(personaId, bundled);
    }
    const data = await submittedStore.reconstructPersonaData(personaId);
    if (data) return data;
  } catch {
    // Fall through to bundled/filesystem
  }
  const bundled = getPersonaData(personaId);
  if (bundled) return bundled;
  const raw = await loadFile(`data/${personaId}.json`);
  return JSON.parse(raw);
}

function serviceDirSlug(serviceId: string): string {
  const parts = serviceId.split(".");
  return parts.length > 1 ? parts.slice(1).join(".") : parts[0];
}

async function loadPolicyRuleset(
  serviceId: string,
): Promise<PolicyRuleset | null> {
  const bundled = await getServiceArtefact(serviceId, "policy");
  if (bundled) return bundled as unknown as PolicyRuleset;
  const slug = serviceDirSlug(serviceId);
  for (const base of [
    path.join(process.cwd(), "..", "..", "data", "services"),
    path.join(process.cwd(), "data", "services"),
  ]) {
    try {
      const raw = await fs.readFile(
        path.join(base, slug, "policy.json"),
        "utf-8",
      );
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
}

async function loadStateModel(
  serviceId: string,
): Promise<StateModelDefinition | null> {
  const bundled = await getServiceArtefact(serviceId, "stateModel");
  if (bundled) return bundled as unknown as StateModelDefinition;
  const slug = serviceDirSlug(serviceId);
  for (const base of [
    path.join(process.cwd(), "..", "..", "data", "services"),
    path.join(process.cwd(), "data", "services"),
  ]) {
    try {
      const raw = await fs.readFile(
        path.join(base, slug, "state-model.json"),
        "utf-8",
      );
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }

  // Template fallback: infer interaction type from graph node → generate template state model
  const graphNode = getGraphNode(serviceId);
  if (graphNode) {
    const interactionType = inferInteractionType(
      graphNode.serviceType,
    ) as keyof typeof INSTRUCTION_TEMPLATE_REGISTRY;
    if (INSTRUCTION_TEMPLATE_REGISTRY[interactionType]) {
      console.log(
        `   Using ${interactionType} template state model for ${serviceId}`,
      );
      return templateToStateModel(interactionType, serviceId);
    }
  }

  return null;
}

async function loadConsentModel(
  serviceId: string,
): Promise<Record<string, unknown> | null> {
  const bundled = await getServiceArtefact(serviceId, "consent");
  if (bundled) return bundled;
  const slug = serviceDirSlug(serviceId);
  for (const base of [
    path.join(process.cwd(), "..", "..", "data", "services"),
    path.join(process.cwd(), "data", "services"),
  ]) {
    try {
      const raw = await fs.readFile(
        path.join(base, slug, "consent.json"),
        "utf-8",
      );
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
}

async function loadStateInstructions(
  serviceId: string,
): Promise<StateInstructions | null> {
  // 1. Try bundled data (service-data.ts imports)
  const bundled = await getServiceArtefact(serviceId, "stateInstructions");
  if (bundled) return bundled as unknown as StateInstructions;

  // 2. Try filesystem (hand-crafted JSON files)
  const slug = serviceDirSlug(serviceId);
  for (const base of [
    path.join(process.cwd(), "..", "..", "data", "services"),
    path.join(process.cwd(), "data", "services"),
  ]) {
    try {
      const raw = await fs.readFile(
        path.join(base, slug, "state-instructions.json"),
        "utf-8",
      );
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }

  // 3. Template fallback: infer interaction type from graph node → resolve template
  const graphNode = getGraphNode(serviceId);
  if (graphNode) {
    const interactionType = inferInteractionType(
      graphNode.serviceType,
    ) as keyof typeof INSTRUCTION_TEMPLATE_REGISTRY;
    const template = INSTRUCTION_TEMPLATE_REGISTRY[interactionType];
    if (template) {
      const ctx: TemplateContext = {
        serviceName: graphNode.name,
        department: graphNode.dept,
        govukUrl: graphNode.govuk_url,
        eligibilitySummary: graphNode.eligibility.summary,
        serviceId,
      };
      console.log(
        `   Using ${interactionType} template instructions for ${serviceId}`,
      );
      return resolveTemplateInstructions(template, ctx);
    }
  }

  return null;
}

async function loadManifest(
  serviceId: string,
): Promise<Record<string, unknown> | null> {
  const bundled = await getServiceArtefact(serviceId, "manifest");
  if (bundled) return bundled;
  const slug = serviceDirSlug(serviceId);
  for (const base of [
    path.join(process.cwd(), "..", "..", "data", "services"),
    path.join(process.cwd(), "data", "services"),
  ]) {
    try {
      const raw = await fs.readFile(
        path.join(base, slug, "manifest.json"),
        "utf-8",
      );
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
}

function generateScenarioPrompt(
  manifest: Record<string, unknown>,
  serviceId?: string,
): string {
  const lines: string[] = [];
  lines.push(`SERVICE: ${manifest.name}`);
  lines.push(`DEPARTMENT: ${manifest.department}`);
  lines.push(`DESCRIPTION: ${manifest.description}`);

  const graphNode = serviceId ? getGraphNode(serviceId) : null;
  if (graphNode) {
    lines.push("");
    lines.push(`GOV.UK PAGE: ${graphNode.govuk_url}`);
    lines.push(`SERVICE TYPE: ${graphNode.serviceType}`);
    if (graphNode.deadline) lines.push(`DEADLINE: ${graphNode.deadline}`);
    lines.push("");
    lines.push(`ELIGIBILITY SUMMARY: ${graphNode.eligibility.summary}`);
    if (graphNode.eligibility.means_tested)
      lines.push("NOTE: This service is means-tested.");
    if (graphNode.eligibility.criteria.length > 0) {
      lines.push("");
      lines.push("ELIGIBILITY CRITERIA:");
      for (const c of graphNode.eligibility.criteria) {
        lines.push(`  - [${c.factor}] ${c.description}`);
      }
    }
    if (graphNode.eligibility.keyQuestions.length > 0) {
      lines.push("");
      lines.push("KEY QUESTIONS TO ASK THE CITIZEN:");
      for (const q of graphNode.eligibility.keyQuestions) {
        lines.push(`  - ${q}`);
      }
    }
    if (graphNode.eligibility.exclusions?.length) {
      lines.push("");
      lines.push("COMMON EXCLUSIONS:");
      for (const e of graphNode.eligibility.exclusions) {
        lines.push(`  - ${e}`);
      }
    }
    if (graphNode.eligibility.evidenceRequired?.length) {
      lines.push("");
      lines.push("EVIDENCE TYPICALLY REQUIRED:");
      for (const e of graphNode.eligibility.evidenceRequired) {
        lines.push(`  - ${e}`);
      }
    }
  } else {
    const constraints = manifest.constraints as
      | Record<string, unknown>
      | undefined;
    if (constraints) {
      if (constraints.sla) lines.push(`SLA: ${constraints.sla}`);
      if (constraints.fee) {
        const fee = constraints.fee as Record<string, unknown>;
        lines.push(`FEE: ${fee.amount} ${fee.currency}`);
      }
      if (constraints.availability)
        lines.push(`AVAILABILITY: ${constraints.availability}`);
    }
    const redress = manifest.redress as Record<string, unknown> | undefined;
    if (redress) {
      if (redress.complaint_url)
        lines.push(`COMPLAINTS: ${redress.complaint_url}`);
      if (redress.appeal_process)
        lines.push(`APPEALS: ${redress.appeal_process}`);
      if (redress.ombudsman) lines.push(`OMBUDSMAN: ${redress.ombudsman}`);
    }
    const handoff = manifest.handoff as Record<string, unknown> | undefined;
    if (handoff) {
      if (handoff.escalation_phone)
        lines.push(`PHONE: ${handoff.escalation_phone}`);
      if (handoff.opening_hours) lines.push(`HOURS: ${handoff.opening_hours}`);
    }
    const inputSchema = manifest.input_schema as
      | Record<string, unknown>
      | undefined;
    if (inputSchema?.properties) {
      const props = Object.keys(
        inputSchema.properties as Record<string, unknown>,
      );
      lines.push(`INPUTS REQUIRED: ${props.join(", ")}`);
    }
  }

  lines.push("");
  lines.push("You are helping a citizen with this government service.");
  lines.push(
    "Use the service details above to answer their questions accurately.",
  );
  lines.push(
    "If the service has eligibility criteria or policy rules, apply them to the citizen's situation.",
  );
  lines.push(
    "If you don't have enough information to determine eligibility, ask the citizen for the missing details.",
  );

  return lines.join("\n");
}

function extractEmploymentStatus(
  employment: Record<string, unknown> | undefined,
): string {
  if (!employment) return "unknown";
  if (typeof employment.status === "string") return employment.status;
  for (const val of Object.values(employment)) {
    if (
      typeof val === "object" &&
      val !== null &&
      "status" in (val as Record<string, unknown>)
    ) {
      return (val as Record<string, unknown>).status as string;
    }
  }
  return "unknown";
}

function buildPolicyContext(
  personaData: Record<string, unknown>,
): Record<string, unknown> {
  const contact = personaData.primaryContact as
    | Record<string, unknown>
    | undefined;
  const dob =
    (contact?.dateOfBirth as string) ||
    (personaData.date_of_birth as string) ||
    undefined;
  const address = personaData.address as Record<string, unknown> | undefined;

  let age = (personaData.age as number) || 0;
  if (!age && dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
  }

  const financials = personaData.financials as
    | Record<string, unknown>
    | undefined;
  let savings = (personaData.savings as number) || 0;
  if (!savings && financials?.savingsAccount) {
    savings =
      ((financials.savingsAccount as Record<string, unknown>)
        ?.balance as number) || 0;
  }

  const employment = personaData.employment as
    | Record<string, unknown>
    | undefined;
  const empStatus =
    (personaData.employment_status as string) ||
    extractEmploymentStatus(employment);
  const niNumber =
    (personaData.national_insurance_number as string) ||
    (contact?.nationalInsuranceNumber as string) ||
    undefined;

  const healthInfo = personaData.healthInfo as
    | Record<string, unknown>
    | undefined;
  const conditions = (healthInfo?.conditions || []) as Array<
    Record<string, unknown>
  >;
  const hasMobilityCondition = conditions.some((c) => {
    const name = ((c.name as string) || "").toLowerCase();
    const affects = (
      (c.affectsMobility as string) ||
      (c.affects_mobility as string) ||
      ""
    ).toLowerCase();
    return (
      affects === "yes" ||
      affects === "true" ||
      name.includes("mobility") ||
      name.includes("arthritis") ||
      name.includes("wheelchair")
    );
  });

  return {
    age,
    jurisdiction: (personaData.jurisdiction as string) || "England",
    national_insurance_number: niNumber,
    driving_licence_number: personaData.vehicles
      ? "exists"
      : personaData.credentials
        ? "exists"
        : undefined,
    savings,
    bank_account: personaData.bank_account ?? true,
    self_employed:
      empStatus === "Self-employed" || empStatus === "self-employed",
    employment_status: empStatus,
    over_70: (personaData.over_70 as boolean) ?? age >= 70,
    no_fixed_address: !address,
    licence_status: "valid",
    has_mobility_condition: hasMobilityCondition,
    has_health_conditions: conditions.length > 0,
    ...personaData,
  };
}

async function getLocalFloodData(city: string): Promise<string> {
  try {
    const raw = await mcpClient.callTool("ea_current_floods", {
      severity: 3,
      limit: 100,
    });
    let data: Record<string, unknown>;
    try {
      data =
        typeof raw === "string"
          ? JSON.parse(raw)
          : (raw as Record<string, unknown>);
    } catch {
      return JSON.stringify({
        warnings: [],
        summary: "No flood data available.",
      });
    }
    const result = data?.result as Record<string, unknown> | undefined;
    const items =
      ((result?.items || data?.items) as Array<Record<string, unknown>>) || [];
    if (items.length === 0) {
      return JSON.stringify({
        warnings: [],
        summary: "No active flood warnings anywhere in England.",
      });
    }
    const cityLower = (city || "").toLowerCase();
    const localWarnings = items.filter((item) => {
      const floodArea = item.floodArea as Record<string, string> | undefined;
      const county = (floodArea?.county || "").toLowerCase();
      const area = ((item.eaAreaName as string) || "").toLowerCase();
      const desc = ((item.description as string) || "").toLowerCase();
      return (
        county.includes(cityLower) ||
        area.includes(cityLower) ||
        desc.includes(cityLower)
      );
    });
    const summary = localWarnings.map((w) => ({
      area: w.description,
      severity: w.severity,
      river: (w.floodArea as Record<string, string>)?.riverOrSea || "Unknown",
      message: ((w.message as string) || "").slice(0, 200),
      updated: w.timeMessageChanged,
    }));
    return JSON.stringify({
      localWarnings: summary.length,
      nationalWarnings: items.length,
      location: city,
      warnings: summary,
      summary:
        summary.length > 0
          ? `${summary.length} active flood warning(s) near ${city}.`
          : `No active flood warnings near ${city}. There are ${items.length} warnings elsewhere in England.`,
    });
  } catch (error) {
    console.error("Flood data lookup failed:", error);
    return JSON.stringify({ error: "Flood data temporarily unavailable." });
  }
}

// ── Chat Handler — delegates to Orchestrator ──

interface ChatInput {
  persona: string;
  agent: string;
  scenario: string;
  messages: Array<{ role: string; content: unknown }>;
  generateTitle?: boolean;
  ucState?: string;
  ucStateHistory?: string[];
  serviceMode?: "json" | "mcp";
}

type ChatOutput = OrchestratorOutput & {
  cardRequests?: CardRequest[];
  interactionType?: string;
  outcomes?: JourneyOutcome[];
};

async function chatHandler(input: unknown): Promise<ChatOutput> {
  const {
    persona,
    agent,
    scenario,
    messages,
    generateTitle,
    ucState: clientUcState,
    ucStateHistory: clientStateHistory,
    serviceMode,
  } = input as ChatInput;

  const isMcpMode = serviceMode === "mcp";

  await ensureMcpConnection();
  if (isMcpMode) {
    await ensureLocalMcpConnection();
  }

  console.log(`\n--- Chat Request ---`);
  console.log(
    `Persona: ${persona}, Agent: ${agent}, Scenario: ${scenario}, Mode: ${isMcpMode ? "MCP" : "JSON"}`,
  );
  console.log(`Messages: ${messages.length} in history`);

  // ── Load data ──
  const personaData = await loadPersonaData(persona);
  const agentPrompt = await loadFile(`data/prompts/${agent}-system.txt`);

  let personaPrompt: string;
  try {
    personaPrompt = await loadFile(`data/prompts/persona-${persona}.txt`);
  } catch {
    const personaData2 = getPersonaData(persona);
    const name = (personaData2?.name as string) || persona;
    personaPrompt = `You are communicating with ${name}. Be helpful, clear, and respectful.`;
  }

  const serviceId = resolveServiceId(scenario);

  let scenarioPrompt: string;
  try {
    scenarioPrompt = await loadFile(`data/prompts/scenario-${scenario}.txt`);
  } catch {
    const manifest = await loadManifest(serviceId);
    if (manifest) {
      scenarioPrompt = generateScenarioPrompt(manifest, serviceId);
    } else {
      const graphManifest = await getAnyManifest(serviceId);
      scenarioPrompt = graphManifest
        ? generateScenarioPrompt(
            graphManifest as unknown as Record<string, unknown>,
            serviceId,
          )
        : `You are helping a citizen with a government service related to: ${scenario}. Answer their questions helpfully.`;
    }
  }

  // ── Load service artefacts ──
  const policyRuleset = isMcpMode ? null : await loadPolicyRuleset(serviceId);
  const stateModelDef = isMcpMode ? null : await loadStateModel(serviceId);
  const consentModelRaw = isMcpMode ? null : await loadConsentModel(serviceId);
  const stateInstructions = isMcpMode
    ? null
    : await loadStateInstructions(serviceId);
  const manifest = await loadManifest(serviceId);

  const currentState = clientUcState || "not-started";

  if (stateModelDef) {
    (await getTraceEmitter()).setTotalStates(
      serviceId,
      stateModelDef.states.length,
    );
  }

  // ── Known facts for dedup ──
  let factsAlreadyKnown = "";
  let unresolvedContradictions = "";
  try {
    const inferredStoreForPrompt = await getInferredStore();
    const allFacts = await inferredStoreForPrompt.getAll(persona);
    const activeFacts = allFacts.filter((f) => !f.supersededBy).slice(0, 30);
    if (activeFacts.length > 0) {
      factsAlreadyKnown =
        "\n\nFACTS ALREADY KNOWN (from previous chat):\n" +
        activeFacts
          .map(
            (f) =>
              `- ${f.fieldKey}: ${JSON.stringify(f.fieldValue)} (confidence: ${f.confidence}, mentions: ${f.mentions})`,
          )
          .join("\n") +
        "\n\nIMPORTANT: Use the EXACT key names listed above when re-referencing these facts. Do NOT re-extract facts that have the same key AND the same value as above.";
    }
    const contradictions =
      await inferredStoreForPrompt.getContradictions(persona);
    if (contradictions.length > 0) {
      unresolvedContradictions =
        "\n\nUNRESOLVED CONTRADICTIONS:\n" +
        contradictions
          .map(
            (c) =>
              `- "${c.old.fieldKey}": was "${JSON.stringify(c.old.fieldValue)}", now "${JSON.stringify(c.new.fieldValue)}"`,
          )
          .join("\n") +
        "\n\nIMPORTANT: Ask the user to clarify which value is correct for the contradictions above.";
    }
  } catch (err) {
    console.warn("Failed to load existing facts for prompt:", err);
  }

  // ── Build strategy ──
  const adapter = wrapAsLLMAdapter(await getLLMAdapter());
  const policyContext = buildPolicyContext(personaData);

  let strategy;
  if (isMcpMode) {
    const localTools = localMcpClient.getLocalToolsForClaude();
    const govmcpTools = mcpClient.getToolsForClaude();
    strategy = new McpServiceStrategy({
      localTools,
      govmcpTools,
      localToolDispatcher: async (name, toolInput) => {
        const result = await localMcpClient.callLocalTool(
          name,
          toolInput as Record<string, unknown>,
        );
        return typeof result === "string" ? result : JSON.stringify(result);
      },
      govmcpToolDispatcher: async (name, toolInput) => {
        const result = await mcpClient.callTool(
          name,
          toolInput as Record<string, unknown>,
        );
        return typeof result === "string" ? result : JSON.stringify(result);
      },
      mcpResourceReader: async (uri) => localMcpClient.readLocalResource(uri),
      mcpPromptReader: async (name) => localMcpClient.getLocalPrompt(name),
    });
  } else {
    const govmcpTools = mcpClient.getToolsForClaude();
    strategy = new JsonServiceStrategy({
      govmcpTools,
      toolDispatcher: async (name, toolInput) => {
        const result = await mcpClient.callTool(
          name,
          toolInput as Record<string, unknown>,
        );
        return typeof result === "string" ? result : JSON.stringify(result);
      },
    });
  }

  // ── Run Orchestrator ──
  const orchestrator = new Orchestrator({ adapter, strategy });

  // Force journey mode when transitioning from triage (service was proposed
  // by triage agent on the previous turn, client updated currentService)
  const forceJourney =
    serviceId !== "triage" &&
    serviceId !== scenario &&
    currentState === "not-started" &&
    !stateModelDef;

  const result = await orchestrator.run({
    persona,
    agent,
    scenario,
    serviceId,
    messages,
    generateTitle,
    currentState,
    stateHistory: clientStateHistory || [],
    forceJourney,
    personaData,
    agentPrompt,
    personaPrompt,
    scenarioPrompt,
    policyRuleset: policyRuleset || undefined,
    stateModelDef: stateModelDef || undefined,
    consentModel: consentModelRaw
      ? {
          id: (consentModelRaw.id as string) || serviceId,
          version: (consentModelRaw.version as string) || "1.0.0",
          grants: (
            (consentModelRaw.grants || []) as Array<Record<string, unknown>>
          ).map((g) => ({
            id: g.id as string,
            description: g.description as string,
            data_shared: g.data_shared as string[],
            source: g.source as string,
            purpose: g.purpose as string,
            duration: (g.duration as "session" | "until-revoked") || "session",
            required: (g.required as boolean) ?? true,
          })),
        }
      : undefined,
    stateInstructions: stateInstructions || undefined,
    policyContext,
    factsAlreadyKnown,
    unresolvedContradictions,
    floodDataHandler: getLocalFloodData,
    artefacts: manifest
      ? {
          manifest:
            manifest as unknown as import("@als/schemas").CapabilityManifest,
        }
      : undefined,
  });

  // ── Validate and resolve service/need proposals ──
  if (result.serviceProposal) {
    let proposedId = result.serviceProposal.serviceId;
    let proposedNode = getGraphNode(proposedId);
    let isValidService = !!proposedNode;

    // Try resolving partial IDs (e.g. "renew-driving-licence" → "dvla.renew-driving-licence")
    if (!proposedNode) {
      const resolved = resolveServiceId(proposedId);
      if (resolved !== proposedId) {
        proposedNode = getGraphNode(resolved);
        if (proposedNode) {
          console.log(
            `   [Triage] Resolved serviceProposal: ${proposedId} → ${resolved}`,
          );
          proposedId = resolved;
          isValidService = true;
        }
      }
    }

    // Also check hand-crafted services (not in graph but have manifest/state-model)
    if (!isValidService) {
      const handcraftedManifest = await loadManifest(proposedId);
      if (handcraftedManifest) {
        isValidService = true;
        console.log(
          `   [Triage] Matched hand-crafted service: ${proposedId}`,
        );
      }
    }

    if (!isValidService) {
      console.warn(
        `   [Triage] Invalid serviceProposal: ${result.serviceProposal.serviceId} — stripping`,
      );
      result.serviceProposal = undefined;
    } else {
      result.serviceProposal.serviceId = proposedId;
      result.serviceProposal.serviceName =
        result.serviceProposal.serviceName ||
        proposedNode?.name ||
        proposedId;
      console.log(
        `   [Triage] Proposing service: ${proposedId} (${result.serviceProposal.serviceName})`,
      );
    }
  }
  if (result.needProposal) {
    // Resolve and validate each service ID (graph + hand-crafted)
    const resolvedServices: string[] = [];
    for (const id of result.needProposal.services) {
      let node = getGraphNode(id);
      if (!node) {
        const resolved = resolveServiceId(id);
        node = getGraphNode(resolved);
        if (node) {
          resolvedServices.push(resolved);
          continue;
        }
        // Check hand-crafted services
        const hcManifest = await loadManifest(id);
        if (hcManifest) {
          resolvedServices.push(id);
          continue;
        }
      } else {
        resolvedServices.push(id);
      }
    }
    if (resolvedServices.length === 0) {
      console.warn(
        `   [Triage] needProposal had no valid service IDs — stripping`,
      );
      result.needProposal = undefined;
    } else {
      result.needProposal.services = resolvedServices;
      console.log(
        `   [Triage] Need proposal: "${result.needProposal.need}" with ${resolvedServices.length} services`,
      );
    }
  }

  // ── Store extracted facts (Tier 3) ──
  if (result.extractedFields && result.extractedFields.length > 0) {
    try {
      const inferredStoreInstance = await getInferredStore();
      const sessionId = `session_${Date.now()}`;
      for (const fact of result.extractedFields) {
        const storeResult = await inferredStoreInstance.storeOrMerge(persona, {
          fieldKey: fact.key,
          fieldValue: fact.value,
          confidence: fact.confidence,
          source: "conversation",
          sessionId,
          extractedFrom: fact.source_snippet,
        });
        console.log(
          `   Fact "${fact.key}": ${storeResult.outcome}${storeResult.outcome === "contradiction" ? ` (was: ${JSON.stringify(storeResult.existing?.fieldValue)}, now: ${JSON.stringify(fact.value)})` : ""}`,
        );
      }
    } catch (err) {
      console.warn("Failed to store extracted facts:", err);
    }
  }

  // ── Wire consent grants to service access records ──
  if (result.ucState?.trigger === "grant-consent" && consentModelRaw) {
    try {
      const accessStoreInstance = await getServiceAccessStore();
      const TIER1_FIELDS = new Set([
        "national_insurance_number",
        "full_name",
        "date_of_birth",
        "name",
        "ni_number",
        "nino",
      ]);
      const grants = (consentModelRaw.grants || []) as Array<
        Record<string, unknown>
      >;
      for (const g of grants) {
        const dataShared = (g.data_shared || []) as string[];
        for (const field of dataShared) {
          const tier = TIER1_FIELDS.has(field.toLowerCase())
            ? "tier1"
            : "tier2";
          await accessStoreInstance.grant(persona, {
            serviceId,
            fieldKey: field,
            dataTier: tier,
            purpose: (g.purpose as string) || "service access",
            consentRecordId: g.id as string,
          });
        }
      }
    } catch (err) {
      console.warn("Failed to create service access records:", err);
    }
  }

  // ── Dynamic Card Resolution ──
  // Resolve structured form cards based on (interactionType, currentState).
  // Resolution chain: per-service DB overrides → static card registry.
  let cardRequests: CardRequest[] = [];

  // Determine interaction type from graph node, with fallback for hand-crafted services
  const graphNodeForCards = serviceId ? getGraphNode(serviceId) : null;
  const serviceTypeForCards = graphNodeForCards?.serviceType ?? null;
  let resolvedInteractionType = inferInteractionType(serviceTypeForCards);

  // Hand-crafted services (e.g. dvla.renew-driving-licence) have no graph node.
  // Fall back to matching the serviceId against known patterns.
  if (!graphNodeForCards && serviceId) {
    const HANDCRAFTED_INTERACTION_TYPES: Record<string, InteractionType> = {
      "dvla.renew-driving-licence": "license",
      "dwp.apply-universal-credit": "application",
      "dwp.check-state-pension": "application",
    };
    if (HANDCRAFTED_INTERACTION_TYPES[serviceId]) {
      resolvedInteractionType = HANDCRAFTED_INTERACTION_TYPES[serviceId];
    }
  }

  if (result.ucState) {
    const postTransitionState = result.ucState.currentState;
    const interactionType = resolvedInteractionType;

    // ── Card resolution trace (Part 2A) ──
    const isHandcrafted = !graphNodeForCards && !!serviceId;
    const cardTrace = {
      serviceId,
      stateId: postTransitionState,
      inferredInteractionType: interactionType,
      graphNodeServiceType: serviceTypeForCards,
      isHandcrafted,
      stateAllowlisted: true as boolean, // updated below
      resolutionLevel: null as string | null,
      cardsResolved: [] as string[],
    };

    console.log(
      `   [CardResolver] interactionType=${interactionType}, state=${postTransitionState}, history=${result.ucState.stateHistory?.join(" → ")}`,
    );

    // Load DB card overrides (from Studio)
    let dbCardOverrides: StateCardMapping[] | null = null;
    try {
      const raw = await getCardDefinitions(serviceId);
      if (raw) dbCardOverrides = raw as unknown as StateCardMapping[];
    } catch {
      /* Studio unavailable — fall through to static registry */
    }

    // Hand-crafted services handle most states conversationally via state-instructions.
    // Only resolve registry cards at states where a structured UI card is appropriate.
    const HANDCRAFTED_CARD_STATES: Record<string, Set<string>> = {
      "dvla.renew-driving-licence": new Set([
        "details-confirmed",
        "photo-submitted",
        "payment-made",
      ]),
      "dwp.apply-universal-credit": new Set([
        "personal-details-collected",
        "housing-details-collected",
        "income-details-collected",
        "bank-details-verified",
        "payment-made",
      ]),
    };
    const allowedStates = HANDCRAFTED_CARD_STATES[serviceId];
    const shouldResolveCards =
      !allowedStates || allowedStates.has(postTransitionState);
    cardTrace.stateAllowlisted = shouldResolveCards;

    // Resolve cards: DB overrides → static registry → template → fallback.
    // For graph services (non-hand-crafted), enable the fallback informational
    // card so citizens always get a next step (GOV.UK link or call centre)
    // rather than a silent resolution miss.
    // States that should never show cards:
    // - Process states: handled conversationally by state instructions
    // - Terminal states: journey is over, no further cards needed
    const NO_CARD_STATES = new Set([
      // Process states
      "not-started",
      "identity-verified",
      "eligibility-checked",
      "consent-given",
      "account-accessed",
      "browsing",
      // Terminal states (success)
      "completed",
      "claim-active",
      "benefit-active",
      "issued",
      "registered",
      "confirmed",
      "approved",
      "attended",
      "all-steps-complete",
      "referred-to-service",
      // Terminal states (failure/handoff)
      "rejected",
      "refused",
      "cancelled",
      "handed-off",
      // Decision/assessment states (conversational)
      "decision",
      "assessment",
      "review",
    ]);
    const skipFallback = NO_CARD_STATES.has(postTransitionState);
    const useCardFallback = !cardTrace.isHandcrafted && !skipFallback;
    const cardDefs = shouldResolveCards
      ? resolveCardsWithOverrides(
          interactionType,
          postTransitionState,
          serviceId,
          dbCardOverrides,
          { useFallback: useCardFallback },
        )
      : [];
    cardTrace.cardsResolved = cardDefs.map((d) => d.cardType);
    // Determine which resolution level produced the cards
    if (cardDefs.length > 0) {
      if (dbCardOverrides?.some((m) => m.stateId === postTransitionState)) {
        cardTrace.resolutionLevel = "db-override";
      } else if (
        cardDefs.some((d) => d.cardType === "fallback-informational")
      ) {
        cardTrace.resolutionLevel = "fallback";
      } else {
        cardTrace.resolutionLevel = "static-or-template";
      }
    }
    console.log(
      `   [CardResolver] resolved ${cardDefs.length} cards for (${interactionType}, ${postTransitionState})${!shouldResolveCards ? " [skipped — hand-crafted service, state not allowlisted]" : ""}`,
    );
    console.log(`   [CardTrace]`, JSON.stringify(cardTrace));
    if (cardDefs.length > 0) {
      cardRequests = cardDefs.map((def) => ({
        cardType: def.cardType,
        serviceId: serviceId || scenario,
        stateId: postTransitionState,
        definition: def,
      }));

      // Strip LLM-generated tasks that overlap with card data categories
      const CARD_DATA_KEYWORDS =
        /housing|tenure|rent|bank\s*account|sort\s*code|payment\s*account|payment.*fee|fee.*payment|make\s*payment|complete\s*payment|pay\s*(?:by|with|£)/i;
      result.tasks = result.tasks.filter((t) => {
        const text = `${t.description} ${t.detail}`;
        return !CARD_DATA_KEYWORDS.test(text);
      });
    }

    // Strip eligibility-related tasks — eligibility is checked automatically by the
    // server, never as a user-clickable task card.
    const ELIGIBILITY_KEYWORDS =
      /eligib|verify.*identity|identity.*verif|check.*uc|uc.*check/i;
    result.tasks = result.tasks.filter((t) => {
      const text = `${t.description} ${t.detail}`;
      return !ELIGIBILITY_KEYWORDS.test(text);
    });

    // Strip overly generic tasks that don't collect data or prompt useful action.
    // Tasks like "Complete X application" or "Submit your claim" are noise — the
    // actual data collection happens through structured cards at the right states.
    const GENERIC_TASK_KEYWORDS =
      /^complete\b|^submit\b|^finish\b|^fill in\b|^provide (your |all )?details|^apply for\b|^start (your |the )?application/i;
    result.tasks = result.tasks.filter((t) => {
      return !GENERIC_TASK_KEYWORDS.test(t.description.trim());
    });

    // ── Pre-fill cards from persona data ──
    // Principle: if we already have the citizen's data, pre-fill it.
    // The citizen shouldn't re-enter information government already holds.
    // This works regardless of consent — consent is about sharing data
    // with departments, not about showing the citizen their own data.
    if (cardRequests.length > 0) {
      try {
        // Build a flat lookup map from all available data sources
        const prefillMap = new Map<string, unknown>();

        // Tier 2: submitted data (card form submissions)
        const submittedStore = await getSubmittedStore();
        const allSubmitted = await submittedStore.getAll(persona);
        for (const field of allSubmitted) {
          prefillMap.set(field.fieldKey, field.fieldValue);
        }

        // Tier 1: persona data (identity, credentials, financials)
        const raw = personaData as unknown as Record<string, unknown>;

        // Flatten common persona fields into the lookup
        if (personaData.primaryContact) {
          const pc = personaData.primaryContact as Record<string, unknown>;
          if (pc.firstName) prefillMap.set("full_name", `${pc.firstName} ${pc.middleName ? pc.middleName + " " : ""}${pc.lastName || ""}`);
          if (pc.nationalInsuranceNumber) prefillMap.set("national_insurance_number", pc.nationalInsuranceNumber);
          if (pc.dateOfBirth) prefillMap.set("date_of_birth", pc.dateOfBirth);
          if (pc.email) prefillMap.set("email", pc.email);
          if (pc.phone) prefillMap.set("phone", pc.phone);
        }
        if (personaData.address) {
          const addr = personaData.address as Record<string, unknown>;
          prefillMap.set("address_line1", addr.line1 || addr.line_1 || "");
          prefillMap.set("postcode", addr.postcode || "");
        }
        // Credentials (driving licence, NI, etc.)
        const credentials = raw.credentials as Array<Record<string, unknown>> | undefined;
        if (credentials) {
          const licence = credentials.find((c) => c.type === "driving-licence");
          if (licence?.number) {
            prefillMap.set("driving_licence_number", licence.number);
            prefillMap.set("licence_number", licence.number);
            prefillMap.set("licence_expiry", licence.expires || "");
          }
        }
        // Financials
        const financials = raw.financials as Record<string, unknown> | undefined;
        if (financials) {
          const account = (financials.currentAccount ?? financials.personalAccount) as Record<string, unknown> | undefined;
          if (account) {
            if (account.sortCode) prefillMap.set("sort_code", account.sortCode);
            if (account.accountNumber) prefillMap.set("account_number", account.accountNumber);
            if (account.bank) prefillMap.set("bank_name", account.bank);
          }
        }

        // Check for consent-driven fields (Tier 1 verified = readonly)
        let tier1GrantedFields = new Set<string>();
        try {
          const accessStore = await getServiceAccessStore();
          const grants = await accessStore.getServiceFields(persona, serviceId);
          tier1GrantedFields = new Set(
            grants.filter((g) => g.dataTier === "tier1").map((g) => g.fieldKey),
          );
        } catch {
          // No consent grants — still pre-fill, just not readonly
        }

        for (const card of cardRequests) {
          const prefillData: Record<string, string | number | boolean> = {};
          const readonlyFields: string[] = [];

          for (const field of card.definition.fields) {
            const lookupKey = field.prefillFrom || field.key;
            const value = prefillMap.get(lookupKey);
            if (value !== undefined && value !== null && value !== "") {
              if (
                typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"
              ) {
                prefillData[field.key] = value;
              } else {
                prefillData[field.key] = String(value);
              }

              if (tier1GrantedFields.has(lookupKey)) {
                readonlyFields.push(field.key);
              }
            }
          }

          if (Object.keys(prefillData).length > 0) {
            card.prefillData = prefillData;
          }
          if (readonlyFields.length > 0) {
            card.readonlyFields = readonlyFields;
          }
        }
      } catch (err) {
        console.warn("Failed to build card pre-fill data:", err);
        // Graceful degradation — cards render empty
      }
    }
  }

  // ── Outcome Building for Terminal Success States ──
  let outcomes: JourneyOutcome[] | undefined;
  if (result.ucState) {
    const postState = result.ucState.currentState;
    const terminalConfig = resolveTerminalConfig(
      postState,
      resolvedInteractionType,
    );
    if (terminalConfig.isSuccess) {
      try {
        const interactionType = resolvedInteractionType;
        const template =
          OUTCOME_TEMPLATE_REGISTRY[
            interactionType as keyof typeof OUTCOME_TEMPLATE_REGISTRY
          ];
        if (template) {
          // Gather inferred facts as a flat Record
          let inferredFacts: Record<string, unknown> = {};
          try {
            const inferredStoreForOutcome = await getInferredStore();
            const allFacts = await inferredStoreForOutcome.getAll(persona);
            const activeFacts = allFacts.filter((f) => !f.supersededBy);
            for (const f of activeFacts) {
              inferredFacts[f.fieldKey] = f.fieldValue;
            }
          } catch {
            // Graceful — outcome builds with whatever data is available
          }

          // Gather submitted data as a flat Record
          let submittedData: Record<string, unknown> = {};
          try {
            const submittedStoreForOutcome = await getSubmittedStore();
            const allSubmitted =
              await submittedStoreForOutcome.getAll(persona);
            for (const field of allSubmitted) {
              submittedData[field.fieldKey] = field.fieldValue;
            }
          } catch {
            // Graceful degradation
          }

          const graphNodeForOutcome = serviceId
            ? getGraphNode(serviceId)
            : null;
          const manifest = await loadManifest(serviceId);

          const outcome = buildOutcomeFromTemplate(
            template,
            {
              serviceId,
              serviceName:
                graphNodeForOutcome?.name ||
                (manifest?.name as string) ||
                serviceId,
              department:
                graphNodeForOutcome?.dept ||
                (manifest?.department as string) ||
                "Government",
              govukUrl: graphNodeForOutcome?.govuk_url,
              conversationId: `trace_${Date.now()}`,
              issuedAt: new Date().toISOString().split("T")[0],
            },
            {
              outcomeHints: (
                result as OrchestratorOutput & {
                  outcomeHints?: Record<string, unknown>;
                }
              ).outcomeHints,
              inferredFacts,
              submittedData,
              personaData: personaData as unknown as Record<string, unknown>,
            },
          );

          if (outcome) {
            outcomes = [outcome];
            console.log(
              `   [Outcome] Built ${outcome.type} outcome for ${serviceId} at terminal state "${postState}"`,
            );
          }
        }
      } catch (err) {
        console.warn("Failed to build outcome for terminal state:", err);
      }
    }
  }

  console.log(
    `   Done. Tools: ${result.toolsUsed.length > 0 ? result.toolsUsed.join(", ") : "none"}${result.conversationTitle ? `, Title: "${result.conversationTitle}"` : ""}${result.tasks.length > 0 ? `, Tasks: ${result.tasks.length}` : ""}${cardRequests.length > 0 ? `, Cards: ${cardRequests.map((c) => c.cardType).join(", ")}` : ""}${outcomes ? `, Outcomes: ${outcomes.length}` : ""}`,
  );

  return {
    ...result,
    cardRequests: cardRequests.length > 0 ? cardRequests : undefined,
    interactionType: resolvedInteractionType,
    outcomes,
  };
}

// Register the handler
invoker.registerHandler("agent.chat", chatHandler);

// ── POST /api/chat ──

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      persona,
      agent,
      scenario,
      messages,
      generateTitle,
      ucState,
      ucStateHistory,
      serviceMode,
    } = body;

    if (!persona || !agent || !scenario || !messages) {
      return NextResponse.json(
        {
          error: "Missing required fields: persona, agent, scenario, messages",
        },
        { status: 400 },
      );
    }

    // ── DEMO MODE: Scripted responses (no LLM needed) ──
    // When serviceMode is "demo" (default), use scripted responses.
    // When "json" or "mcp", fall through to the real orchestrator.
    if (serviceMode !== "json" && serviceMode !== "mcp") {
    const { findScriptedResponse } = await import("@/lib/demo-data");
    const {
      OUTCOME_TEMPLATE_REGISTRY,
      buildOutcomeFromTemplate,
      inferInteractionType: inferType,
    } = await import("@als/schemas");

    // Lazily load persona-specific scripts only when needed (server-only)
    let personaScripts: Parameters<typeof findScriptedResponse>[2];
    if (persona === "sarah-okafor") {
      const { SARAH_OKAFOR_CHAT } = await import(
        "@/lib/demo-scripts/sarah-okafor"
      );
      personaScripts = SARAH_OKAFOR_CHAT;
    } else if (persona === "marcus-taylor") {
      const { MARCUS_TAYLOR_CHAT } = await import(
        "@/lib/demo-scripts/marcus-taylor"
      );
      personaScripts = MARCUS_TAYLOR_CHAT;
    } else if (persona === "james-whitfield") {
      const { JAMES_WHITFIELD_CHAT } = await import(
        "@/lib/demo-scripts/james-whitfield"
      );
      personaScripts = JAMES_WHITFIELD_CHAT;
    } else if (persona === "daniel-obi") {
      const { DANIEL_OBI_CHAT } = await import(
        "@/lib/demo-scripts/daniel-obi"
      );
      personaScripts = DANIEL_OBI_CHAT;
    } else if (persona === "priya-anand") {
      const { PRIYA_ANAND_CHAT } = await import(
        "@/lib/demo-scripts/priya-anand"
      );
      personaScripts = PRIYA_ANAND_CHAT;
    }

    const lastUserMsg = [...messages]
      .reverse()
      .find((m: { role: string; content: string }) => m.role === "user");
    const userText =
      typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";
    const scripted = findScriptedResponse(userText, persona, personaScripts);

    // Add a small delay to make it feel realistic
    await new Promise((resolve) => setTimeout(resolve, 800));

    const traceId = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Resolve journey outcomes via template system
    let outcomes;
    if (scripted.outcomes && scripted.outcomes.length > 0) {
      try {
        const personaData = await loadPersonaData(persona);
        const built: import("@als/schemas").JourneyOutcome[] = [];

        for (const entry of scripted.outcomes) {
          const serviceId = entry.serviceId;
          const hints = entry.hints;

          // Resolve the interaction type for this service
          const graphNode = getGraphNode(serviceId);
          const serviceType = graphNode?.serviceType ?? null;
          const interactionType = inferType(serviceType);
          const template =
            OUTCOME_TEMPLATE_REGISTRY[
              interactionType as keyof typeof OUTCOME_TEMPLATE_REGISTRY
            ];
          if (!template) continue;

          const outcome = buildOutcomeFromTemplate(
            template,
            {
              serviceId,
              serviceName:
                graphNode?.name ||
                ((await loadManifest(serviceId))?.name as string) ||
                serviceId,
              department:
                graphNode?.dept ||
                ((await loadManifest(serviceId))?.department as string) ||
                "Government",
              govukUrl: graphNode?.govuk_url,
              conversationId: traceId,
              issuedAt: "2026-03-20",
            },
            {
              outcomeHints: hints,
              personaData: personaData as unknown as Record<string, unknown>,
            },
          );
          if (outcome) built.push(outcome);
        }

        if (built.length > 0) outcomes = built;
      } catch (err) {
        console.warn("Failed to build outcomes:", err);
      }
    }

    return NextResponse.json({
      response: scripted.response,
      reasoning: scripted.reasoning,
      toolsUsed: [],
      conversationTitle: scripted.conversationTitle,
      tasks: scripted.tasks,
      traceId,
      consentRequests: scripted.consentRequests,
      outcomes,
    });
    } // end demo mode

    // ── REAL MODE: LLM-driven orchestrator ──
    const result = await chatHandler({
      persona,
      agent,
      scenario,
      messages,
      generateTitle,
      ucState,
      ucStateHistory,
      serviceMode,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json(
      {
        error: "Failed to get response from AI agent",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
