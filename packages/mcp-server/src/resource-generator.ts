/**
 * resource-generator.ts — Generates MCP Resource registrations from service artefacts
 *
 * Each service gets 4 fixed-URI resources:
 *   - service://{serviceId}/manifest    → full manifest.json
 *   - service://{serviceId}/policy      → eligibility rules
 *   - service://{serviceId}/consent     → consent model
 *   - service://{serviceId}/state-model → state machine definition
 *
 * Personas get 1 resource each:
 *   - persona://{personaId}/profile     → full persona JSON
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ArtefactStore, type ServiceArtefacts } from "@als/legibility";
import { serviceToMarkdown, planToMarkdown } from "@als/schemas";
import type {
  PlanTemplate,
  PlanServiceSummary,
  DecisionGateDefinition,
} from "@als/schemas";

function slugToPrefix(serviceId: string): string {
  const slug = ArtefactStore.slugFromId(serviceId);
  return slug.replace(/-/g, "_");
}

export function registerResourcesForService(
  mcpServer: McpServer,
  serviceId: string,
  artefacts: ServiceArtefacts,
): number {
  const prefix = slugToPrefix(serviceId);
  const serviceName = artefacts.manifest.name;
  let count = 0;

  // Markdown capability card — prose rendering for the agent to read before
  // calling the structured tools.
  mcpServer.resource(
    `${prefix}-capability-card`,
    `service://${serviceId}/capability-card`,
    {
      description: `Human-readable capability card for ${serviceName}`,
      mimeType: "text/markdown",
    },
    () => ({
      contents: [
        {
          uri: `service://${serviceId}/capability-card`,
          text: serviceToMarkdown({
            manifest: artefacts.manifest,
            policy: artefacts.policy,
            stateModel: artefacts.stateModel,
            consent: artefacts.consent,
          }),
        },
      ],
    }),
  );
  count++;

  // Always register manifest
  mcpServer.resource(
    `${prefix}-manifest`,
    `service://${serviceId}/manifest`,
    {
      description: `Service metadata for ${serviceName}`,
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: `service://${serviceId}/manifest`,
          text: JSON.stringify(artefacts.manifest, null, 2),
        },
      ],
    }),
  );
  count++;

  // Policy (optional)
  if (artefacts.policy) {
    mcpServer.resource(
      `${prefix}-policy`,
      `service://${serviceId}/policy`,
      {
        description: `Eligibility rules for ${serviceName}`,
        mimeType: "application/json",
      },
      () => ({
        contents: [
          {
            uri: `service://${serviceId}/policy`,
            text: JSON.stringify(artefacts.policy, null, 2),
          },
        ],
      }),
    );
    count++;
  }

  // Consent (optional)
  if (artefacts.consent) {
    mcpServer.resource(
      `${prefix}-consent`,
      `service://${serviceId}/consent`,
      {
        description: `Consent model for ${serviceName}`,
        mimeType: "application/json",
      },
      () => ({
        contents: [
          {
            uri: `service://${serviceId}/consent`,
            text: JSON.stringify(artefacts.consent, null, 2),
          },
        ],
      }),
    );
    count++;
  }

  // State model (optional)
  if (artefacts.stateModel) {
    mcpServer.resource(
      `${prefix}-state-model`,
      `service://${serviceId}/state-model`,
      {
        description: `State machine for ${serviceName}`,
        mimeType: "application/json",
      },
      () => ({
        contents: [
          {
            uri: `service://${serviceId}/state-model`,
            text: JSON.stringify(artefacts.stateModel, null, 2),
          },
        ],
      }),
    );
    count++;
  }

  return count;
}

export function registerAllResources(
  mcpServer: McpServer,
  store: ArtefactStore,
): number {
  let total = 0;
  for (const serviceId of store.listServices()) {
    const artefacts = store.get(serviceId);
    if (!artefacts) continue;
    total += registerResourcesForService(mcpServer, serviceId, artefacts);
  }
  return total;
}

/**
 * Register a plan template as MCP resources:
 *   - plan://{planId}/capability-card → Markdown plan card
 *   - plan://{planId}/template        → structured plan template JSON
 */
export function registerResourcesForPlan(
  mcpServer: McpServer,
  plan: PlanTemplate,
  services: PlanServiceSummary[],
  gates: DecisionGateDefinition[],
): number {
  const prefix = plan.id.replace(/[^a-z0-9]/gi, "_");

  mcpServer.resource(
    `${prefix}-plan-card`,
    `plan://${plan.id}/capability-card`,
    {
      description: `Capability card for the ${plan.name} plan`,
      mimeType: "text/markdown",
    },
    () => ({
      contents: [
        {
          uri: `plan://${plan.id}/capability-card`,
          text: planToMarkdown({ plan, services, gates }),
        },
      ],
    }),
  );

  mcpServer.resource(
    `${prefix}-plan-template`,
    `plan://${plan.id}/template`,
    {
      description: `Structured plan template for ${plan.name}`,
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: `plan://${plan.id}/template`,
          text: JSON.stringify(plan, null, 2),
        },
      ],
    }),
  );

  return 2;
}

/**
 * Register a single persona as an MCP resource.
 * URI: persona://{personaId}/profile
 */
export function registerPersonaResource(
  mcpServer: McpServer,
  personaId: string,
  persona: Record<string, unknown>,
): void {
  const name = (persona.name as string) ?? personaId;
  mcpServer.resource(
    `persona-${personaId}`,
    `persona://${personaId}/profile`,
    {
      description: `Citizen persona: ${name}`,
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: `persona://${personaId}/profile`,
          text: JSON.stringify(persona, null, 2),
        },
      ],
    }),
  );
}

/**
 * Register all personas from an array of persona objects.
 * Each persona must have an `id` field.
 */
export function registerAllPersonaResources(
  mcpServer: McpServer,
  personas: Record<string, unknown>[],
): number {
  let count = 0;
  for (const persona of personas) {
    const id = persona.id as string | undefined;
    if (!id) continue;
    registerPersonaResource(mcpServer, id, persona);
    count++;
  }
  return count;
}
