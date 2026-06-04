/**
 * plan-template-types.ts — The plan layer as a first-class published artefact.
 *
 * A PlanTemplate is the authored, publishable form of a "life event": a
 * cross-service journey. It references services by id and never duplicates them.
 * The citizen's personalised, in-flight plan (ActivePlan) is a hydration of a
 * template and lives client-side; the template is what the studio publishes.
 *
 * Two published dials govern a plan (the "plastic to policy" model):
 *   - freshness: how the published structure relates to the live graph
 *   - assembly:  how a citizen's plan is composed (deterministic ↔ probabilistic)
 */

/** Per-service derived status within a plan. Promoted here as the canonical type. */
export type ServicePlanStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "skipped";

/** A scoped edge between two services within a plan. */
export interface PlanEdge {
  from: string;
  to: string;
  /** REQUIRES = hard gate (locks `to` until `from` completes); ENABLES = soft surfacing. */
  type: "REQUIRES" | "ENABLES";
}

// ── Two-axis settings ──

/** Freshness of the published plan relative to the live service graph. */
export type PlanFreshness = "frozen" | "live" | "hybrid";

/** How a citizen's plan is assembled — the deterministic↔probabilistic spectrum. */
export type PlanAssembly = "authored" | "agent" | "hybrid";

export interface PlanSettings {
  freshness: PlanFreshness;
  assembly: PlanAssembly;
}

export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  freshness: "hybrid",
  assembly: "hybrid",
};

// ── Posture / depth (seven-layer framework) ──

/** Posture a negotiable layer may take. */
export type LayerPosture = "deterministic" | "probabilistic-with-audit";

/**
 * How far down the seven layers agentic (probabilistic) operation is permitted.
 * Layer 1 (information) is always probabilistic-permitted; layer 4 (decision) is
 * always the citizen's; layers 5–7 are always deterministic. The only negotiable
 * dials are layer 2 (administration) and layer 3 (orchestration).
 */
export interface ServicePosture {
  administration: LayerPosture;
  orchestration: LayerPosture;
}

export const DEFAULT_POSTURE: ServicePosture = {
  administration: "probabilistic-with-audit",
  orchestration: "deterministic",
};

// ── Plan template ──

export type PlanMembershipMode = "explicit" | "graph-traversal";

export interface PlanMembership {
  mode: PlanMembershipMode;
  /** Pinned member service ids (explicit mode). Ignored for graph-traversal. */
  serviceIds?: string[];
}

/** A field collected once and reused across the plan's services (durable field-merger output). */
export interface PlanSharedField {
  canonicalKey: string;
  label: string;
  neededBy: Array<{ serviceId: string; fieldKey: string }>;
}

/** Plan-level relevance rule: skip a service when a persona fact matches. */
export interface PlanRelevanceRule {
  serviceId: string;
  skipIf: { field: string; operator: string; value: unknown };
  reason: string;
}

export interface PlanTemplate {
  id: string;
  version: string;
  name: string;
  icon: string;
  description: string;
  entryServiceIds: string[];
  membership: PlanMembership;
  edges: PlanEdge[];
  attachedGateIds: string[];
  sharedFields: PlanSharedField[];
  relevanceRules: PlanRelevanceRule[];
  settings: PlanSettings;
  posture: ServicePosture;
}

// ── Runtime projection ──

/** Accumulated, deterministic effect of the decision-gate answers so far. */
export interface PlanContext {
  enabledServices: string[];
  skipServices: string[];
  facts: Record<string, string>;
}

export const EMPTY_PLAN_CONTEXT: PlanContext = {
  enabledServices: [],
  skipServices: [],
  facts: {},
};

/** A snapshot of a member service's state machine, supplied by the caller. */
export interface MemberStateSnapshot {
  /** Member is in a terminal state → rolls up to "completed". */
  isTerminal: boolean;
  /** Member has moved past its initial state → "in_progress". */
  started: boolean;
}

/** Result of projecting plan state over member state machines. */
export interface PlanProjection {
  status: Record<string, ServicePlanStatus>;
}
