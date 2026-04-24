# Agentic Legibility Stack — Department Demo

## Tools

- When answering questions about UK government code, prior art, or existing implementations, use the `govreposcrape` MCP tool to search across government repositories before answering.

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
  services/*/         → manifest.json, policy.json, state-model.json, consent.json, state-instructions.json per service
  decision-gates/     → Decision gate definitions per life event (e.g. bereavement.json)
  simulated/          → test user personas, wallet credentials
  traces.db           → SQLite evidence store (created at runtime)

docs/
  index.html      → Project overview document
  *.html          → Standalone HTML documentation (executive briefing, technical reference, product guide, glossary, decision gates)
```

## Commands

- `npm run dev` — start all apps in dev mode
- `npm run build` — build everything
- `npm test` — run tests across all packages (vitest via turbo)
- `npm run seed` — seed the traces database
- `npm run seed:ledger` — seed the ledger
- `npm run seed:services` — seed the service store
- `npm run capture` — capture demo screenshots

## Key systems

### Interaction Typology (13 service shapes)
- Every service maps to one of 13 interaction types: benefit, entitlement, grant, legal_process, obligation, application, license, register, portal, payment_service, appointment_booker, task_list, informational_hub
- Each type provides: state model template, instruction template, card definitions, consent framing, proactivity config, escalation config, outcome template, terminal state config, agent action text, milestones
- `inferInteractionType()` maps a service's `serviceType` from the graph to an interaction type
- Templates generate state models and per-state LLM instructions dynamically — departments select a shape, the platform generates the journey
- All 13 types now have dedicated instruction templates (obligation was completed 2026-04-17, previously reused register template)
- Key files: `packages/schemas/src/state-instruction-templates.ts` (templates, config layers), `packages/schemas/src/card-registry.ts` (card resolution), `packages/schemas/src/outcome-templates.ts` (outcome templates)

### Wallet + Consent Management
- **Wallet tab** shows persona credentials and earned credentials from service completions
- **Consent preferences** — standing preferences (scope: once/service/department/cross-government) stored in `ConsentPreferenceStore` (SQLite via `@als/personal-data`)
- Consent resolution runs in the chat API — auto-satisfies matching preferences before showing consent cards
- Key files: `apps/citizen/components/WalletView.tsx`, `apps/citizen/components/wallet/`, `packages/personal-data/src/consent-preference-store.ts`

### Life-Event-Aware Chat Triage
- When a citizen describes a multi-service need (e.g. "my husband just died"), the system matches it to a life event from the service graph (16 life events defined)
- **Life event matcher** (`apps/citizen/lib/life-event-matcher.ts`) scores proposed services against life events
- **Field merger** (`apps/citizen/lib/field-merger.ts`) deduplicates data fields across services — agent asks once, fans out to all
- **Silent plan creation** — `ActivePlan` created behind the scenes (visible on Home tab) but citizen stays in chat
- **Service completions** — LLM signals `serviceCompletions` in structured output; outcome cards issued and plan updated
- Key files: `apps/citizen/app/api/chat/route.ts` (life event matching + orchestrator wiring), `packages/runtime/src/orchestrator.ts` (prompt injection + serviceCompletions parsing)

### Decision Gates
- **Architectural primitive** at the boundary between probabilistic (LLM) and deterministic (state machine) layers
- Structured routing questions with tappable options — citizen taps an option, confirms, answer flows back as a message
- **Data-defined**: gate definitions (question, options, routing effects) live in JSON
- **Two emission paths**: (1) auto-attached deterministically when a life event is matched via needProposal (first turn), (2) LLM-signalled via `decisionGateId` in structured output (subsequent turns)
- **Routing effects** are deterministic: each option can `enableServices`, `skipServices`, or `setFacts`
- Gate data: `data/decision-gates/{life-event-id}.json` (life-event-level), `data/services/{slug}/decision-gates.json` (service-level)
- Key files: `packages/schemas/src/decision-gate-types.ts`, `packages/schemas/src/decision-gate-registry.ts`, `apps/citizen/components/DecisionGateCard.tsx`, `apps/citizen/app/api/chat/route.ts` (gate loading + auto-attach), `packages/runtime/src/orchestrator.ts` (prompt injection + parsing)

### Plan Cards in Chat
- `[PLAN_CARDS]` marker in assistant messages renders `PlanCardsInChat` — numbered service cards with descriptions, agent action hints, and delegate buttons
- Reads from `activePlan.services` (generalised — works with any life event, not hardcoded)
- Agent action text resolved per service via `agentActionForService()` in `apps/citizen/components/plan/agentActions.ts`
- Services enriched with proactivity data (mode, priority, iconHint, accentColor) from the chat route
- Key files: `apps/citizen/components/PlanCardsInChat.tsx`, `apps/citizen/components/plan/PlanServiceCard.tsx`

### Inline Service Cards in Chat
- `[SERVICE:id]` marker renders a **ServiceStepCard** (full card with accent bar) — for highlighted next actions
- `[MENTION:id]` marker renders a **mention variant** (quiet list item with left border) — for conversational service references
- Service metadata in `SERVICE_STEP_DATA` registry (`apps/citizen/components/ServiceStepCard.tsx`)
- ChatView splits messages on markers and interleaves text bubbles with cards

### Route Groups
- `apps/citizen/app/(app)/` — main app with PhoneFrame wrapper
- `apps/citizen/app/(capture)/` — screen capture page without phone chrome

## Architecture rules — IMPORTANT

- ALL service calls route through `CapabilityInvoker` in `@als/runtime` (single choke point)
- ALL LLM calls go through `AnthropicAdapter` in `@als/adapters` — zero direct Anthropic SDK usage elsewhere
- `@anthropic-ai/sdk` lives in `@als/adapters` ONLY
- `@modelcontextprotocol/sdk` CLIENT usage lives in `@als/adapters` — SERVER usage lives in `@als/mcp-server`
- legibility-studio fetches evidence from citizen app API — it does NOT import `@als/evidence` directly
- The Orchestrator delegates language-only work to the LLM; all deterministic decisions (policy, state, consent, gate routing) happen in code
- Two service strategies: `JsonServiceStrategy` (inline deterministic) and `McpServiceStrategy` (LLM has service tools)
- Three service modes: `demo` (scripted responses, no LLM), `json` (LLM + deterministic services), `mcp` (LLM + MCP tools). Default is `mcp`.
- Demo mode uses persona-specific scripts in `apps/citizen/lib/demo-scripts/` — these bypass the orchestrator entirely
- Life event context flows: triage prompt → needProposal → life event match → gate auto-attach → plan creation → orchestrator prompt injection → serviceCompletions → outcome cards

### Prompt architecture — mode-aware triage prompt
- `buildTriagePrompt()` in the orchestrator is **mode-aware**: when `lifeEventContext` is present, service proposal instructions and task instructions are **suppressed** (not contradicted — absent)
- In life event mode: LLM receives a short directive to be empathetic, not list services, and keep `tasks: []`. The system handles service presentation via decision gates and plan cards.
- In normal triage mode: LLM receives full `SERVICE_PROPOSAL_INSTRUCTIONS` and `TASK_INSTRUCTIONS` for single-service identification and confirmation
- This prevents contradictory instructions where life event directives say "no tasks" but general instructions say "include tasks"
- `STRUCTURED_OUTPUT_INSTRUCTIONS` and `FACT_EXTRACTION_INSTRUCTIONS` are always included regardless of mode

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
