/**
 * Tool handlers for citizen-03's agentic architecture.
 *
 * Each handler wraps existing platform infrastructure (ServiceGraphEngine,
 * PolicyEvaluator, StateMachine, ArtefactStore) and exposes it as a tool
 * the LLM can call. The platform validates; the agent reasons.
 */

import { ServiceGraphEngine } from "@als/service-graph";
import { ArtefactStore, PolicyEvaluator, StateMachine } from "@als/legibility";
import type {
  ToolCallResult,
  CitizenSession,
  ServiceGraphQueryResult,
  LifeEventPlanResult,
  RelatedServicesResult,
  EligibilityCheckResult,
  CitizenContextResult,
  EvidenceRecordResult,
} from "./types";

// ── Runtime context passed to all handlers ──

export interface ToolContext {
  graph: ServiceGraphEngine;
  artefactStore: ArtefactStore;
  session: CitizenSession;
  /** Citizen's personal data — three-tier model */
  citizenData?: {
    verified: Record<string, unknown>;
    submitted: Record<string, unknown>;
    inferred: Record<string, unknown>;
  };
  /** Active service interactions tracked by the client */
  activeServices?: Map<string, { currentState: string }>;
  /** Callback to record trace events (injected by the app layer) */
  onTraceEvent?: (event: {
    type: string;
    serviceId: string;
    payload: Record<string, unknown>;
    session: CitizenSession;
  }) => Promise<void>;
}

// ── Main dispatcher ──

export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolCallResult> {
  try {
    switch (toolName) {
      case "query_service_graph":
        return handleQueryServiceGraph(args, ctx);
      case "get_life_event_plan":
        return handleGetLifeEventPlan(args, ctx);
      case "get_related_services":
        return handleGetRelatedServices(args, ctx);
      case "check_eligibility":
        return handleCheckEligibility(args, ctx);
      case "get_citizen_context":
        return handleGetCitizenContext(args, ctx);
      case "record_evidence":
        return await handleRecordEvidence(args, ctx);
      default:
        return errorResult(`Unknown tool: ${toolName}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResult(`Tool '${toolName}' failed: ${message}`);
  }
}

// ── Individual tool handlers ──

function handleQueryServiceGraph(
  args: Record<string, unknown>,
  ctx: ToolContext
): ToolCallResult {
  const { life_event_id, department, service_type, keyword } = args as {
    life_event_id?: string;
    department?: string;
    service_type?: string;
    keyword?: string;
  };

  let services = ctx.graph.getServices();

  // Filter by life event — use BFS traversal from entry nodes
  if (life_event_id) {
    services = ctx.graph.getLifeEventServices(life_event_id);
    if (services.length === 0) {
      return errorResult(
        `No life event found with ID '${life_event_id}'. ` +
          `Available: ${ctx.graph.getLifeEvents().map((le) => le.id).join(", ")}`
      );
    }
  }

  // Filter by department
  if (department) {
    services = services.filter(
      (s) => s.deptKey.toLowerCase() === department.toLowerCase()
    );
  }

  // Filter by service type
  if (service_type) {
    services = services.filter((s) => s.serviceType === service_type);
  }

  // Filter by keyword
  if (keyword) {
    const kw = keyword.toLowerCase();
    services = services.filter(
      (s) =>
        s.name.toLowerCase().includes(kw) ||
        s.desc.toLowerCase().includes(kw)
    );
  }

  const result: ServiceGraphQueryResult = {
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      dept: s.dept,
      serviceType: s.serviceType,
      desc: s.desc,
      govuk_url: s.govuk_url,
      proactive: s.proactive,
      gated: s.gated,
      eligibilitySummary: s.eligibility.summary,
    })),
    totalCount: services.length,
  };

  return successResult(result);
}

function handleGetLifeEventPlan(
  args: Record<string, unknown>,
  ctx: ToolContext
): ToolCallResult {
  const { life_event_id } = args as { life_event_id: string };

  if (!life_event_id) {
    return errorResult("life_event_id is required");
  }

  const lifeEvent = ctx.graph.getLifeEvent(life_event_id);
  if (!lifeEvent) {
    return errorResult(
      `No life event found with ID '${life_event_id}'. ` +
        `Available: ${ctx.graph.getLifeEvents().map((le) => le.id).join(", ")}`
    );
  }

  const plan = ctx.graph.getLifeEventPlan(life_event_id);
  if (!plan) {
    return errorResult(`Could not generate plan for life event '${life_event_id}'`);
  }

  // Enrich with service details
  const allServiceIds = plan.groups.flatMap((g) => g.serviceIds);
  const serviceDetails = allServiceIds
    .map((id) => ctx.graph.getService(id))
    .filter(Boolean)
    .map((s) => ({
      id: s!.id,
      name: s!.name,
      serviceType: s!.serviceType,
      desc: s!.desc,
      eligibilitySummary: s!.eligibility.summary,
    }));

  const result: LifeEventPlanResult = {
    lifeEvent: {
      id: lifeEvent.id,
      name: lifeEvent.name,
      desc: lifeEvent.desc,
    },
    plan,
    serviceDetails,
  };

  return successResult(result);
}

function handleGetRelatedServices(
  args: Record<string, unknown>,
  ctx: ToolContext
): ToolCallResult {
  const { service_id } = args as { service_id: string };

  if (!service_id) {
    return errorResult("service_id is required");
  }

  // Try exact match, then slug match
  const service =
    ctx.graph.getService(service_id) || ctx.graph.findBySlug(service_id);

  if (!service) {
    return errorResult(`No service found with ID or slug '${service_id}'`);
  }

  const requires = ctx.graph.getRequiredServices(service.id);
  const enables = ctx.graph.getEnabledServices(service.id);

  const result: RelatedServicesResult = {
    service: {
      id: service.id,
      name: service.name,
      serviceType: service.serviceType,
    },
    requires: requires.map((s) => ({
      id: s.id,
      name: s.name,
      serviceType: s.serviceType,
      desc: s.desc,
    })),
    enables: enables.map((s) => ({
      id: s.id,
      name: s.name,
      serviceType: s.serviceType,
      desc: s.desc,
    })),
  };

  return successResult(result);
}

function handleCheckEligibility(
  args: Record<string, unknown>,
  ctx: ToolContext
): ToolCallResult {
  const { service_id, citizen_data } = args as {
    service_id: string;
    citizen_data?: Record<string, unknown>;
  };

  if (!service_id) {
    return errorResult("service_id is required");
  }

  // Look up service artefacts
  const artefacts = ctx.artefactStore.get(service_id);

  // Also check the graph for basic info
  const graphNode =
    ctx.graph.getService(service_id) || ctx.graph.findBySlug(service_id);

  if (!artefacts && !graphNode) {
    return errorResult(
      `No service found with ID '${service_id}'. ` +
        `Check available services with query_service_graph.`
    );
  }

  // Merge citizen data from all sources
  const mergedData: Record<string, unknown> = {
    ...(ctx.citizenData?.verified || {}),
    ...(ctx.citizenData?.submitted || {}),
    ...(ctx.citizenData?.inferred || {}),
    ...(citizen_data || {}),
  };

  // Evaluate policy if available
  let policyResult = null;
  if (artefacts?.policy) {
    const evaluator = new PolicyEvaluator(artefacts.policy);
    policyResult = evaluator.evaluate(mergedData);
  }

  // Check state machine if available
  let stateInfo = null;
  if (artefacts?.stateModel) {
    const sm = new StateMachine(artefacts.stateModel);
    // Restore state if we have active service tracking
    const activeState = ctx.activeServices?.get(service_id);
    if (activeState) {
      sm.setState(activeState.currentState);
    }
    stateInfo = {
      currentState: sm.getState(),
      allowedTransitions: sm.allowedTransitions(),
      isTerminal: sm.isTerminal(),
    };
  }

  const result: EligibilityCheckResult = {
    serviceId: graphNode?.id || service_id,
    serviceName: graphNode?.name || artefacts?.manifest?.name || service_id,
    policyResult: policyResult || {
      eligible: true,
      passed: [],
      failed: [],
      edgeCases: [],
      explanation:
        "No policy rules defined for this service. " +
        (graphNode?.eligibility
          ? `Graph eligibility: ${graphNode.eligibility.summary}`
          : "Assumed eligible."),
    },
    stateModel: stateInfo,
    artefacts: {
      hasPolicy: !!artefacts?.policy,
      hasStateModel: !!artefacts?.stateModel,
      hasConsent: !!artefacts?.consent,
      hasStateInstructions: !!artefacts?.stateInstructions,
    },
  };

  return successResult(result);
}

function handleGetCitizenContext(
  args: Record<string, unknown>,
  ctx: ToolContext
): ToolCallResult {
  const { include_active_services = true } = args as {
    include_active_services?: boolean;
  };

  const activeServices: CitizenContextResult["activeServices"] = [];

  if (include_active_services && ctx.activeServices) {
    for (const [serviceId, state] of ctx.activeServices) {
      const artefacts = ctx.artefactStore.get(serviceId);
      let isTerminal = false;
      if (artefacts?.stateModel) {
        const sm = new StateMachine(artefacts.stateModel);
        sm.setState(state.currentState);
        isTerminal = sm.isTerminal();
      }
      activeServices.push({
        serviceId,
        currentState: state.currentState,
        isTerminal,
      });
    }
  }

  const result: CitizenContextResult = {
    userId: ctx.session.userId,
    name: ctx.citizenData?.verified
      ? `${ctx.citizenData.verified.firstName || ""} ${ctx.citizenData.verified.lastName || ""}`.trim()
      : ctx.session.userId,
    verifiedData: ctx.citizenData?.verified || {},
    submittedData: ctx.citizenData?.submitted || {},
    inferredData: ctx.citizenData?.inferred || {},
    activeServices,
  };

  return successResult(result);
}

async function handleRecordEvidence(
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolCallResult> {
  const { event_type, service_id, payload } = args as {
    event_type: string;
    service_id: string;
    payload: Record<string, unknown>;
  };

  if (!event_type || !service_id || !payload) {
    return errorResult("event_type, service_id, and payload are all required");
  }

  if (ctx.onTraceEvent) {
    await ctx.onTraceEvent({
      type: event_type,
      serviceId: service_id,
      payload,
      session: ctx.session,
    });
  }

  const result: EvidenceRecordResult = {
    traceId: ctx.session.traceId,
    eventType: event_type,
    recorded: !!ctx.onTraceEvent,
  };

  return successResult(result);
}

// ── Helpers ──

function successResult(data: unknown): ToolCallResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string): ToolCallResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}
