/**
 * plan-aggregator.ts — Cross-service plan state, derived deterministically.
 *
 * A plan is an authored scaffold (member services + edges) over which per-service
 * status is a *pure projection* of the member state machines, the accumulated
 * decision-gate context, and persona relevance — never a second hand-authored
 * state machine. All logic here is deterministic; the LLM does language only.
 *
 * Edge semantics (the load-bearing correctness rule):
 *   - REQUIRES = hard gate: locks `to` until `from` is completed or skipped.
 *   - ENABLES  = soft surfacing: relevance only, never blocks.
 */

import type {
  PlanEdge,
  PlanContext,
  MemberStateSnapshot,
  PlanProjection,
  ServicePlanStatus,
  DecisionGateAnswer,
} from "@als/schemas";
import { EMPTY_PLAN_CONTEXT } from "@als/schemas";

export interface PlanScaffold {
  serviceIds: string[];
  edges: PlanEdge[];
}

/**
 * Fold decision-gate answers into an accumulated PlanContext.
 * Deterministic and order-independent for the set fields; facts are last-write-wins.
 * A service appearing in both enable and skip is left in both here — projectPlan
 * resolves the precedence ("skip beats enable unless started").
 */
export function accumulateGateAnswers(
  answers: DecisionGateAnswer[],
): PlanContext {
  const enabled = new Set<string>();
  const skipped = new Set<string>();
  const facts: Record<string, string> = {};

  for (const answer of answers) {
    const effect = answer.routingEffect;
    if (!effect) continue;
    for (const id of effect.enableServices ?? []) enabled.add(id);
    for (const id of effect.skipServices ?? []) skipped.add(id);
    for (const [k, v] of Object.entries(effect.setFacts ?? {})) facts[k] = v;
  }

  return {
    enabledServices: [...enabled],
    skipServices: [...skipped],
    facts,
  };
}

/**
 * Project per-service status across a plan.
 *
 * Pass 1 resolves the statuses that depend only on the service itself —
 * completed (terminal), in_progress (started), skipped (gate/relevance). These
 * take precedence over skip, so a started or completed service is never skipped.
 * Pass 2 resolves the remainder as available vs locked, gating only on
 * intra-plan REQUIRES prerequisites being completed or skipped.
 */
export function projectPlan(
  scaffold: PlanScaffold,
  members: Record<string, MemberStateSnapshot>,
  context: PlanContext = EMPTY_PLAN_CONTEXT,
  relevanceSkips: Record<string, string> = {},
): PlanProjection {
  // Membership = scaffold services plus any gate-enabled services.
  const ids = [...new Set([...scaffold.serviceIds, ...context.enabledServices])];
  const idSet = new Set(ids);
  const skipSet = new Set(context.skipServices);

  const status: Record<string, ServicePlanStatus> = {};

  // Pass 1 — self-determined statuses.
  for (const id of ids) {
    const member = members[id];
    if (member?.isTerminal) {
      status[id] = "completed";
    } else if (member?.started) {
      status[id] = "in_progress";
    } else if (relevanceSkips[id] || skipSet.has(id)) {
      status[id] = "skipped";
    } else {
      status[id] = "available"; // provisional; refined in pass 2
    }
  }

  const isDone = (id: string) =>
    status[id] === "completed" || status[id] === "skipped";

  // Pass 2 — lock the provisional ones whose intra-plan REQUIRES prereqs aren't done.
  for (const id of ids) {
    if (status[id] !== "available") continue;
    const prereqs = scaffold.edges.filter(
      (e) => e.type === "REQUIRES" && e.to === id && idSet.has(e.from),
    );
    const allDone = prereqs.every((e) => isDone(e.from));
    status[id] = allDone ? "available" : "locked";
  }

  return { status };
}
