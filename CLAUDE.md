# Agentic Legibility Stack — Department Demo

## What is this project?

A Turborepo monorepo implementing a reference architecture for UK government services accessed through AI agents. This fork is specifically for demonstrating the citizen experience and legibility studio to permanent secretaries of UK government departments (Home Office, MoJ, DWP, HMRC, Cabinet Office).

The project has two sides:

1. **Citizen Experience** — a prototype of how the future GOV.UK app could be delivered through agentic technology
2. **Legibility Studio** — an admin platform showing departments what they need to publish to make their services legible to agents

## Project structure

```
apps/
  citizen/              → Citizen app for department demos (Next.js, port 3106)
  legibility-studio/    → Admin dashboard for services, traces, gap analysis (Next.js, port 3101)

packages/
  adapters/       → LLM + MCP client integration (Anthropic SDK lives here ONLY)
  evidence/       → SQLite append-only store for traces + receipts
  identity/       → User identity and authentication
  legibility/     → State models and legibility logic (PolicyEvaluator, StateMachine, ConsentManager, FieldCollector)
  mcp-server/     → Local MCP server exposing service JSON artefacts as tools
  personal-data/  → Personal data handling
  runtime/        → CapabilityInvoker, Orchestrator, and runtime orchestration
  schemas/        → Shared TypeScript schemas
  service-graph/  → GOV.UK service graph integration
  service-store/  → Service storage and retrieval

data/
  services/*/     → manifest.json, policy.json, state-model.json, consent.json, state-instructions.json per service
  simulated/      → test user personas, wallet credentials
  traces.db       → SQLite evidence store (created at runtime)

docs/
  index.html      → Project overview document
```

## Commands

- `npm run dev` — start all apps in dev mode
- `npm run build` — build everything
- `npm test` — run tests across all packages (vitest via turbo)
- `npm run seed` — seed the traces database
- `npm run seed:ledger` — seed the ledger
- `npm run seed:services` — seed the service store

## Architecture rules — IMPORTANT

- ALL service calls route through `CapabilityInvoker` in `@als/runtime` (single choke point)
- ALL LLM calls go through `AnthropicAdapter` in `@als/adapters` — zero direct Anthropic SDK usage elsewhere
- `@anthropic-ai/sdk` lives in `@als/adapters` ONLY
- `@modelcontextprotocol/sdk` CLIENT usage lives in `@als/adapters` — SERVER usage lives in `@als/mcp-server`
- legibility-studio fetches evidence from citizen app API — it does NOT import `@als/evidence` directly
- The Orchestrator delegates language-only work to the LLM; all deterministic decisions (policy, state, consent) happen in code
- Two service strategies: `JsonServiceStrategy` (inline deterministic) and `McpServiceStrategy` (LLM has service tools)

## Build gotchas — READ BEFORE CHANGING DEPENDENCIES

- `serverExternalPackages: ["better-sqlite3"]` is required in Next.js configs — do not remove
- Do NOT add `@als/evidence` as a dependency of legibility-studio — it causes lru-cache/native module crashes. Studio fetches via HTTP instead.
- MCP tool types need `as unknown as Array<Record<string, unknown>>` cast for the adapter interface

## Testing — IMPORTANT

- After making changes to any package, run `npm test` before considering the work done
- Tests use Vitest with workspace configuration — each package has its own `vitest.config.ts`
- Never make real API calls in tests — mock external dependencies (Anthropic SDK, databases)
- Evidence tests use an in-memory DatabaseAdapter, not real SQLite
- citizen app has unit, component, and API route tests
  - Component tests use `@testing-library/react` with `@vitejs/plugin-react` for JSX transform
  - API route tests use `// @vitest-environment node` override
  - Mock Zustand store via `vi.mock("@/lib/store")` in component tests
  - E2E: `cd apps/citizen && npx playwright test` (requires dev server)

## Environment

- Requires `ANTHROPIC_API_KEY` env variable for LLM functionality
- Node.js with npm workspaces
- Package manager: npm
