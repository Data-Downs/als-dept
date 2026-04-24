import type {
  CapabilityManifest,
  PolicyRuleset,
  StateModelDefinition,
  ConsentModel,
} from "@als/schemas";
import type { CardDefinition } from "@als/schemas";

export interface ServiceArtefacts {
  manifest: CapabilityManifest | null;
  policy: PolicyRuleset | null;
  stateModel: StateModelDefinition | null;
  consent: ConsentModel | null;
  cardDefinitions: CardDefinition[] | null;
}

export interface McpOutput {
  tools: McpToolDefinition[];
  resources: McpResourceDefinition[];
  prompts: McpPromptDefinition[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  mimeType: string;
}

export interface McpPromptDefinition {
  name: string;
  description: string;
}

export interface OpenApiOutput {
  openapi: "3.0.3";
  info: {
    title: string;
    description: string;
    version: string;
  };
  paths: Record<string, unknown>;
  components: Record<string, unknown>;
}

export interface CatalogueOutput {
  schemaOrg: Record<string, unknown>;
  dcat: Record<string, unknown>;
}
