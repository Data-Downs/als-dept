import type { ServiceArtefacts, OpenApiOutput } from "./types";

/**
 * Generate an OpenAPI 3.0 specification from service artefacts.
 */
export function generateOpenApi(artefacts: ServiceArtefacts): OpenApiOutput {
  const { manifest, policy, stateModel } = artefacts;

  if (!manifest) {
    return {
      openapi: "3.0.3",
      info: { title: "Unknown service", description: "", version: "1.0.0" },
      paths: {},
      components: {},
    };
  }

  const basePath = `/services/${manifest.id}`;

  const paths: Record<string, unknown> = {};

  // Service info endpoint
  paths[basePath] = {
    get: {
      summary: `Get information about ${manifest.name}`,
      description: manifest.description || "",
      operationId: `get_${manifest.id.replace(/[^a-z0-9]/gi, "_")}`,
      tags: [manifest.department || "services"],
      responses: {
        "200": {
          description: "Service information",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ServiceInfo" },
            },
          },
        },
      },
    },
  };

  // Eligibility check endpoint
  if (policy) {
    paths[`${basePath}/check-eligibility`] = {
      post: {
        summary: `Check eligibility for ${manifest.name}`,
        description:
          policy.explanation_template ||
          `Evaluates ${policy.rules.length} eligibility rule(s).`,
        operationId: `check_eligibility_${manifest.id.replace(/[^a-z0-9]/gi, "_")}`,
        tags: [manifest.department || "services"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: manifest.input_schema || { type: "object" },
            },
          },
        },
        responses: {
          "200": {
            description: "Eligibility result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EligibilityResult" },
              },
            },
          },
          "403": {
            description: "Not eligible",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    eligible: { type: "boolean", example: false },
                    reasons: {
                      type: "array",
                      items: { type: "string" },
                      description: "Reasons for ineligibility",
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  // State transition endpoints
  if (stateModel) {
    for (const transition of stateModel.transitions) {
      const pathKey = `${basePath}/transitions/${transition.trigger}`;
      paths[pathKey] = {
        post: {
          summary: `${transition.trigger}: ${transition.from} → ${transition.to}`,
          description: transition.condition
            ? `Condition: ${transition.condition}`
            : undefined,
          operationId: `transition_${transition.trigger.replace(/[^a-z0-9]/gi, "_")}`,
          tags: [manifest.department || "services"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    current_state: {
                      type: "string",
                      example: transition.from,
                    },
                  },
                  required: ["current_state"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: `Transitioned to ${transition.to}`,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      previous_state: { type: "string" },
                      current_state: { type: "string" },
                      trigger: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      };
    }
  }

  // Components
  const components: Record<string, unknown> = {
    schemas: {
      ServiceInfo: {
        type: "object",
        properties: {
          id: { type: "string", example: manifest.id },
          name: { type: "string", example: manifest.name },
          department: { type: "string", example: manifest.department },
          description: { type: "string", example: manifest.description || "" },
          jurisdiction: {
            type: "string",
            example: manifest.jurisdiction || "",
          },
        },
      },
      EligibilityResult: {
        type: "object",
        properties: {
          eligible: { type: "boolean" },
          passed_rules: { type: "array", items: { type: "string" } },
          failed_rules: { type: "array", items: { type: "string" } },
          explanation: { type: "string" },
        },
      },
    },
  };

  return {
    openapi: "3.0.3",
    info: {
      title: manifest.name,
      description:
        manifest.description || `API for ${manifest.name} (${manifest.department})`,
      version: manifest.version || "1.0.0",
    },
    paths,
    components,
  };
}
