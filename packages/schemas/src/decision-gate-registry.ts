/**
 * Decision Gate Registry — resolves gate definitions by ID or context.
 *
 * In the prototype, gates are loaded from static JSON files in
 * data/decision-gates/. In production, this would resolve from a
 * database via the Legibility Studio publishing pipeline.
 */

import type { DecisionGateDefinition } from "./decision-gate-types";

// Static registry populated by loadGatesIntoRegistry()
const gateById = new Map<string, DecisionGateDefinition>();
const gatesByLifeEvent = new Map<string, DecisionGateDefinition[]>();
const gatesByService = new Map<string, DecisionGateDefinition[]>();

/**
 * Load gate definitions into the in-memory registry.
 * Called by the chat route after reading gate JSON files.
 */
export function loadGatesIntoRegistry(
  gates: DecisionGateDefinition[],
): void {
  for (const gate of gates) {
    gateById.set(gate.id, gate);

    if (gate.context?.lifeEventId) {
      const existing = gatesByLifeEvent.get(gate.context.lifeEventId) ?? [];
      if (!existing.some((g) => g.id === gate.id)) {
        existing.push(gate);
        gatesByLifeEvent.set(gate.context.lifeEventId, existing);
      }
    }
    if (gate.context?.serviceId) {
      const existing = gatesByService.get(gate.context.serviceId) ?? [];
      if (!existing.some((g) => g.id === gate.id)) {
        existing.push(gate);
        gatesByService.set(gate.context.serviceId, existing);
      }
    }
  }
}

/**
 * Resolve a single gate by ID.
 */
export function resolveGate(
  gateId: string,
): DecisionGateDefinition | null {
  return gateById.get(gateId) ?? null;
}

/**
 * Get all gates for a life event.
 */
export function getGatesForLifeEvent(
  lifeEventId: string,
): DecisionGateDefinition[] {
  return gatesByLifeEvent.get(lifeEventId) ?? [];
}

/**
 * Get all gates for a specific service.
 */
export function getGatesForService(
  serviceId: string,
): DecisionGateDefinition[] {
  return gatesByService.get(serviceId) ?? [];
}

/**
 * Get available gates for a context, filtering out already-answered gates.
 */
export function getAvailableGates(
  lifeEventId?: string,
  serviceId?: string,
  answeredGateIds?: Set<string>,
): DecisionGateDefinition[] {
  const gates: DecisionGateDefinition[] = [];

  if (lifeEventId) {
    gates.push(...getGatesForLifeEvent(lifeEventId));
  }
  if (serviceId) {
    for (const g of getGatesForService(serviceId)) {
      if (!gates.some((existing) => existing.id === g.id)) {
        gates.push(g);
      }
    }
  }

  if (answeredGateIds && answeredGateIds.size > 0) {
    return gates.filter((g) => !answeredGateIds.has(g.id));
  }

  return gates;
}

/**
 * Build prompt fragment describing available gates for LLM injection.
 */
export function buildGatePromptFragment(
  gates: DecisionGateDefinition[],
): string {
  if (gates.length === 0) return "";

  const lines = gates.map((g) => {
    const optionLabels = g.options.map((o) => o.label).join(" / ");
    return `- ${g.id}: "${g.question}" (${optionLabels})`;
  });

  return `AVAILABLE DECISION GATES:
${lines.join("\n")}

When you recognise the conversation has reached one of these routing questions, set "decisionGateId" in your JSON output to the gate ID.
The UI will render tappable options for the citizen — do NOT ask these questions as plain text.
Only use gate IDs from the list above. Do not fabricate gate IDs.
Only signal ONE gate per response.`;
}
