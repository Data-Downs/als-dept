export interface ChannelDefinition {
  id: string;
  name: string;
  description: string;
  status: "operational" | "in-development" | "planned";
  artefactsUsed: string[];
}

export const CHANNELS: ChannelDefinition[] = [
  {
    id: "mcp",
    name: "AI agent (MCP)",
    description:
      "Tools, resources, and prompts for AI agents via Model Context Protocol.",
    status: "operational",
    artefactsUsed: [
      "manifest",
      "policy",
      "state-model",
      "consent",
      "card-definitions",
    ],
  },
  {
    id: "forms",
    name: "Web form (GOV.UK Forms)",
    description:
      "GOV.UK Forms-compatible pages with questions, routing, and confirmation.",
    status: "in-development",
    artefactsUsed: ["card-definitions", "state-model", "consent"],
  },
  {
    id: "openapi",
    name: "API (OpenAPI 3.0)",
    description:
      "REST API specification with request/response schemas and endpoint paths.",
    status: "in-development",
    artefactsUsed: ["manifest", "state-model", "policy"],
  },
  {
    id: "catalogue",
    name: "Service catalogue",
    description:
      "Schema.org/GovernmentService and DCAT DataService metadata entries.",
    status: "in-development",
    artefactsUsed: ["manifest"],
  },
  {
    id: "notify",
    name: "Notifications (GOV.UK Notify)",
    description:
      "Email and SMS templates for each stage of the service journey.",
    status: "planned",
    artefactsUsed: ["state-model", "consent"],
  },
  {
    id: "html",
    name: "Accessible summary (HTML)",
    description:
      "Printable, accessible HTML page summarising the service for citizens.",
    status: "planned",
    artefactsUsed: [
      "manifest",
      "policy",
      "state-model",
      "consent",
      "card-definitions",
    ],
  },
];
