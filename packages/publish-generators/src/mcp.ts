import type { ServiceArtefacts, McpOutput } from "./types";

/**
 * Generate MCP tool, resource, and prompt definitions from service artefacts.
 */
export function generateMcp(artefacts: ServiceArtefacts): McpOutput {
  const { manifest, policy, stateModel, consent } = artefacts;

  if (!manifest) {
    return { tools: [], resources: [], prompts: [] };
  }

  const slug = manifest.id.replace(/[^a-z0-9]/gi, "_");

  // Resources — one per artefact
  const resources: McpOutput["resources"] = [
    {
      uri: `service://${manifest.id}/manifest`,
      name: `${manifest.name} — manifest`,
      mimeType: "application/json",
    },
  ];

  if (policy) {
    resources.push({
      uri: `service://${manifest.id}/policy`,
      name: `${manifest.name} — policy`,
      mimeType: "application/json",
    });
  }

  if (stateModel) {
    resources.push({
      uri: `service://${manifest.id}/state-model`,
      name: `${manifest.name} — state model`,
      mimeType: "application/json",
    });
  }

  if (consent) {
    resources.push({
      uri: `service://${manifest.id}/consent`,
      name: `${manifest.name} — consent model`,
      mimeType: "application/json",
    });
  }

  // Tools — eligibility check + state advance
  const tools: McpOutput["tools"] = [];

  if (policy) {
    tools.push({
      name: `${slug}_check_eligibility`,
      description: `Check eligibility for ${manifest.name}. Evaluates policy rules against citizen data.`,
      inputSchema: {
        type: "object",
        properties: {
          citizen_data: {
            type: "object",
            description: "Citizen data fields to evaluate against policy rules",
          },
        },
        required: ["citizen_data"],
      },
    });
  }

  if (stateModel) {
    tools.push({
      name: `${slug}_advance_state`,
      description: `Advance the journey state for ${manifest.name}. Transitions from current state via trigger.`,
      inputSchema: {
        type: "object",
        properties: {
          current_state: {
            type: "string",
            description: "The current state ID",
          },
          trigger: {
            type: "string",
            description: "The transition trigger to fire",
          },
        },
        required: ["current_state", "trigger"],
      },
    });
  }

  // Prompts
  const prompts: McpOutput["prompts"] = [
    {
      name: `${slug}_journey`,
      description: `Full journey prompt for guiding a citizen through ${manifest.name}`,
    },
  ];

  if (policy) {
    prompts.push({
      name: `${slug}_eligibility_check`,
      description: `Eligibility assessment prompt for ${manifest.name}`,
    });
  }

  return { tools, resources, prompts };
}
