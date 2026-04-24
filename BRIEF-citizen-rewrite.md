# Brief: Citizen App Rewrite

_A complete specification for rebuilding the ALS citizen app from scratch, in a single pass, without drift. Sections marked **[OUTLINE]** are placeholders awaiting detail; the rest are drafted._

---

## 1. Purpose & framing **[OUTLINE — needs Chris's voice]**
Why this rewrite is happening, what success looks like, what failure looks like.

## 2. Scope

### In scope
**App:** `apps/citizen` (Next.js 15 on App Router, port 3106, deployed to Cloudflare via OpenNext).

**Packages rebuilt as part of this work:**
- `@als/runtime` — orchestration, prompt construction, response parsing
- `@als/adapters` — LLM adapter (Anthropic SDK) and MCP client
- `@als/schemas` — shared types, state instruction templates, card registry, decision gate types, outcome templates, structured output schema
- `@als/legibility` — state machine, policy evaluator, consent manager, field collector
- `@als/personal-data` — personal data and consent preference stores
- `@als/evidence` — trace/receipt append-only store (citizen-side writes only)
- `@als/identity` — user identity
- `@als/service-graph` — GOV.UK service graph integration
- `@als/mcp-server` — local MCP server (tool exposure for services)

### Out of scope
- `apps/legibility-studio` (studio demo stays on current code)
- `apps/publish` (untracked, studio-side)
- `packages/publish-generators` (studio-side)
- `packages/service-store` (used as seed/CLI; review later if it ends up in the critical path)

### Data artefacts
All of `data/` is retained verbatim — see §3 and §13.

---

## 3. Retained (lifted verbatim)

### UI components
All components under `apps/citizen/components/**` are retained. Visual appearance and layout do not change. Prop shapes may adjust where the new data contracts diverge from the old store — the redesign is at the contract layer, not the rendering layer.

Grouped for reference:

- **Chat surface** — `ChatView`, `MessageInput`, `QuickReplies`
- **Chat-inline cards** — `DecisionGateCard`, `PlanCardsInChat`, `ServiceStepCard`, `ConsentCard`, `ConsentSummaryCard`, `OutcomeCard`, `TaskReceiptCard`, `TaskSummaryCard`, `TaskCard`, `RegisterBirthCard`, `RelatedServicesCard`, `JourneyCompleteCard`
- **Plan sub-components** — `plan/PlanServiceCard`, `plan/PlanIcons`, `plan/agentActions`
- **Top-level views** — `Dashboard`, `WalletView`, `ServicesView`, `TasksView`, `PlanView`, `DetailView`
- **Shell** — `AppShell`, `AppHeader`, `PhoneFrame`
- **Dashboard sub-components** — `dashboard/HeroCarousel`, `NearYouSection`, `SupportSummary`, `UnifiedTimeline`
- **Wallet sub-components** — `wallet/WalletCredentialCard`, `wallet/ConsentPreferenceCard`
- **Personal data** — `personal-data/*` (dashboard, consent dialog, sections, field editor)
- **Evidence views** — `evidence/ReceiptViewer`, `ActivityLog`, `ConsentTimeline`, `DataDownload`
- **Handoff** — `handoff/HandoffNotice`, `HandoffSummary`
- **Bottom sheets** — `sheets/*` (task detail, payment, topic questions, filing prompt, agent intro/selection, consent preference, wallet credential)
- **In-task cards** — `cards/*` (CardHost, PaymentCard, DocumentUploadCard, BankSelectorCard, GenericFormCard, field-renderers)
- **UI primitives** — `ui/BottomSheet`, `Toast`, `SwipeToAction`, `SwipeToDelete`, `UrgencyDot`, `RegPlate`, `LiveBadge`
- **Persona UI** — `PersonaPicker`, `PersonaSelectorOverlay`
- **Detail view sub-components** — `detail/TopicList`, `ServiceContextCard`
- **Diagnostics** — `PipelineTraceBar`, `ReasoningPanel`, `StateProgressTracker`

### Styling & design system
- `apps/citizen/app/globals.css`
- Tailwind config, PostCSS config
- `public/` assets
- `docs/v2/illustrations/`, `screens/`, `clips/` — reference assets

### Personas & demo content
- `data/simulated/users/*.json`
- `data/simulated/households/*`
- `data/simulated/wallet-credentials.json`
- `apps/citizen/lib/demo-scripts/*.ts`
- `apps/citizen/lib/persona-meta.ts`

### Data artefacts
- `data/services/**` — all 30+ service folders, each with `manifest.json`, `policy.json`, `state-model.json`, `consent.json`, `state-instructions.json`, optional `decision-gates.json`
- `data/decision-gates/*.json` — life-event-level gates (e.g. `bereavement.json`)
- `data/govuk-services-catalogue.json`

### Dependencies carried through
- Next.js 15, React 19, Tailwind 3, Zustand 5, react-markdown, html-to-image
- Playwright, Vitest, Testing Library
- Wrangler, OpenNext for deploy

---

## 4. Rebuilt (designed from scratch)

Everything that sits between citizen input and the rendered UI — the path from a chat message to a structured response and a state change.

### Rebuilt from scratch
- **Chat API route** (`apps/citizen/app/api/chat/route.ts`) — the orchestration glue
- **Orchestrator** (`@als/runtime`) — becomes a real planner/executor split (§5.1)
- **Prompt construction** (`@als/runtime`) — mode-aware, non-overlapping, no layered instructions (§5.3)
- **State machine** (`@als/legibility`) — typed finite states with explicit transitions and guards (§5.2)
- **Structured output schema** (`@als/schemas`) — locked up front, replaces inline prose markers (§5.4, §9)
- **Decision gate system** (`@als/schemas`, routing in `@als/runtime`) — first-class emission via structured output (§5.5)
- **Service invocation** (`@als/runtime`) — single choke point with three strategies (json/mcp/demo) (§5.6)
- **LLM adapter** (`@als/adapters`) — kept as the sole Anthropic SDK location; interface kept, internals rebuilt
- **MCP client & server** (`@als/adapters`, `@als/mcp-server`) — contracts redesigned around the new structured output
- **Consent resolution** (`@als/personal-data`, called pre-LLM) — standing-preference matcher runs deterministically before the turn reaches the model
- **Evidence store** (`@als/evidence`) — write path retained as an SQLite append-only store; API surface reviewed
- **Zustand store** (`apps/citizen/lib/store.ts`) — contracts redesigned to match the new runtime output
- **Runtime-layer lib files in `apps/citizen/lib/`** — rewritten: `life-event-matcher.ts`, `field-merger.ts`, `extract-structured-output.ts`, `plan-relevance.ts`, `plan-hints.ts`, `eligibility-filter.ts`, `service-client.ts`, `local-mcp-client.ts`, `mcp-client.ts`, `ledger.ts`, `registry.ts`
- **Template systems** (`@als/schemas`) — state instruction templates, card registry, outcome templates all re-derived from the target architecture. Data format may change; the data itself (`state-instructions.json`, etc.) is reviewed for format compatibility or migrated.

### Kept-as-utility but reviewed
- `apps/citizen/lib/service-data.ts`, `demo-data.ts`, `departments.ts`, `identity.ts`, `evidence.ts`, `outcome-types.ts`, `personal-data-store.ts`, `types.ts` — each reviewed for coupling to the old runtime before deciding retain vs rebuild.

---

## 5. Architectural primitives (typed contracts)

### 5.1 Orchestrator **[OUTLINE]**
Real planner/executor split. Planner model decides which tools to call; executor calls them deterministically. Interface contract defined; no co-location with unrelated helpers.

### 5.2 State machine **[OUTLINE]**
Finite typed states per service. Explicit transitions with typed guards. No array-traversal-over-JSON patterns.

### 5.3 Prompt architecture **[OUTLINE]**
Single source of truth per mode. Modes (triage, life event, single-service, gated) are mutually exclusive — no layered "be more X" instructions competing.

### 5.4 Structured output schema **[OUTLINE]**
Locked up front. Assistant output shape and card emission contracts defined before any prompt is written.

### 5.5 Decision gates **[OUTLINE]**
First-class primitive — not a marker in prose. Definitions in JSON, routing effects deterministic, auto-attach paths explicit.

### 5.6 Service invocation **[OUTLINE]**
Single choke point (CapabilityInvoker equivalent). Strategy pattern: JSON (deterministic), MCP (LLM tools), demo (scripted). Each strategy documented.

### 5.7 Consent & life events **[OUTLINE]**
Standing preferences resolved before LLM sees the turn. Life event matching is deterministic; field merging deduplicates across services.

---

## 6. UI contracts **[OUTLINE]**
Data shapes the UI consumes (active plan, chat messages, decision gates, service cards, wallet, consent preferences). Chat renderer inputs. Card schemas — decision gate, plan, service step, mention, outcome.

## 7. Data model **[OUTLINE]**
Service artefacts, decision gates, personas, life events, consent preferences, evidence (traces, receipts).

## 8. Scenario test cases (acceptance criteria) **[OUTLINE — needs Chris]**
Concrete expected outputs for each canonical scenario. The build passes iff these outputs are produced. Minimum of five; bereavement first turn is non-negotiable.

Example shape:
- **Sarah, bereavement, first turn** → short empathetic paragraph + decision gate card, no service prose, no task list.

---

## 9. Non-negotiables (architectural rules)

### SDK & choke points
- `@anthropic-ai/sdk` lives in `@als/adapters` and nowhere else.
- `@modelcontextprotocol/sdk` **client** lives in `@als/adapters`; **server** lives in `@als/mcp-server`. No exceptions.
- All LLM calls go through a single adapter interface. No direct SDK use anywhere else.
- All service calls go through a single choke point (CapabilityInvoker or equivalent). No app-level bypasses.

### Structured output, not prose markers
- The LLM emits structured output. The app renders from that structure.
- **No inline prose markers** for structured data — no `[PLAN_CARDS]`, `[SERVICE:id]`, `[MENTION:id]` or similar. Card emission is an explicit field on the response schema, not a string pattern the renderer greps for.
- Prose content and card emission are separate fields in the response — the model does not have to embed structure in its text.

### Naming discipline
- Terms like "orchestrator" and "state machine" are load-bearing. If a module carries one of those names, it must actually be one. A runtime loop is not an orchestrator. An array indexed by state name is not a state machine.
- One concern per file. A file named `orchestrator.ts` does not contain a string-capitalisation helper. Helpers live in helper modules.

### Mode-aware prompting
- Triage, life-event, single-service, and gated modes are mutually exclusive.
- Mode selection is deterministic, done before prompt assembly.
- The assembled prompt for a mode contains only that mode's directives — not a union that the model has to reconcile.

### File hygiene
- Target file size: under 300 lines. If a file crosses that, split before continuing.
- Every architectural primitive has an interface file separate from its implementation — the contract is inspectable without reading the code.
- No unrelated concerns co-located. If you wouldn't put two functions in the same public documentation section, they don't share a file.

### Next.js config
- `serverExternalPackages: ["better-sqlite3"]` stays in the Next config.
- No new native-module dependencies without an explicit note in this brief.

### Testing
- Never call real APIs in tests. Mock `@als/adapters` and any MCP clients.
- Evidence tests use an in-memory database adapter, not real SQLite.
- Scenario test cases (§8) are executable acceptance tests, not prose descriptions.

---

## 10. Package structure **[OUTLINE]**
Proposed package layout for the new build — narrower than current if possible. Which packages survive, which collapse, which are new.

## 11. Testing strategy **[OUTLINE]**
Scenario test cases from §8 become automated acceptance tests. Unit tests on deterministic primitives (state machine, gate routing, consent resolution). Mocking policy per §9.

---

## 12. Single-pass build discipline

The brief itself is the instrument that prevents drift. If the brief is vague, the build drifts. If the brief is complete, the build lands.

### Before any code
- Every section of this brief is filled in. No `[OUTLINE]` tags remain.
- Scenario test cases (§8) are written as concrete expected outputs, not prose intentions.
- Package structure (§10) is decided — nothing moves package during build.

### During build
- **Build in dependency order:** `schemas` → `adapters` interfaces → `legibility` primitives → `runtime` orchestration → `personal-data` / `evidence` / `identity` → app route + UI wiring → UI polish.
- **No mid-build scope additions.** If something is discovered mid-build that the brief didn't cover, stop. Update the brief. Then resume from the nearest clean boundary.
- **File-size gate at 300 lines.** When approaching, split before continuing. Ship a file that does one thing.
- **Primitives land with interface + implementation + tests in the same commit.** No "interface now, tests later."
- **No layered prompt additions.** If the model output is wrong, the mode definition is wrong — fix that, don't add a counter-instruction.
- **No prose markers introduced.** Every piece of structured data the UI consumes is a typed field on a response, not a pattern.

### What aborts the build
- A primitive requires code that doesn't match the brief's interface → stop, amend brief.
- A scenario test case fails after implementation → the brief was wrong about that scenario; amend brief.
- Two different modes need to share a directive → the mode split is wrong; amend brief.

### What does not abort the build
- UI styling nits — those are post-build polish.
- Missing service data — the data layer is retained; plug it in.

---

## 13. Migration notes

### Lifted verbatim (no changes)
- `data/services/**`
- `data/decision-gates/**`
- `data/simulated/**`
- `data/govuk-services-catalogue.json`
- `apps/citizen/lib/demo-scripts/*.ts`
- `apps/citizen/lib/persona-meta.ts`
- `apps/citizen/app/globals.css`
- Tailwind/PostCSS config
- `apps/citizen/public/` assets
- `docs/v2/` (unchanged by this work)

### Lifted with prop-level adjustment
- All `apps/citizen/components/**/*.tsx` — visuals unchanged, prop types updated to match new store/runtime contracts where needed.
- Test files for retained components (`*.test.tsx`) — may need minor import/path updates; logic should mostly hold.

### Reviewed for retain vs rebuild
- `apps/citizen/lib/service-data.ts`
- `apps/citizen/lib/demo-data.ts`
- `apps/citizen/lib/departments.ts`
- `apps/citizen/lib/identity.ts`
- `apps/citizen/lib/evidence.ts`
- `apps/citizen/lib/outcome-types.ts`
- `apps/citizen/lib/personal-data-store.ts`
- `apps/citizen/lib/types.ts`

Each reviewed once the new schemas and contracts are defined. If they express the same thing under the new types, they carry over. If they encode the old runtime's assumptions, they rebuild.

### Rebuilt from scratch (nothing lifted)
- `apps/citizen/app/api/chat/route.ts`
- `apps/citizen/lib/store.ts`
- `apps/citizen/lib/life-event-matcher.ts`
- `apps/citizen/lib/field-merger.ts`
- `apps/citizen/lib/extract-structured-output.ts`
- `apps/citizen/lib/plan-relevance.ts`, `plan-hints.ts`
- `apps/citizen/lib/eligibility-filter.ts`
- `apps/citizen/lib/service-client.ts`, `local-mcp-client.ts`, `mcp-client.ts`
- `apps/citizen/lib/ledger.ts`, `registry.ts`
- All package internals in scope (§2) — interface files may be designed fresh; implementation is new code.
- Template systems in `@als/schemas` (state instructions, card registry, outcome templates) — re-derived from the target architecture; JSON data files reviewed for format compatibility and migrated if needed.

### Not carried over
- Current prompt fragments in `@als/runtime` — superseded by the new prompt architecture.
- Anything in the current codebase whose only purpose is to patch around the drift.
