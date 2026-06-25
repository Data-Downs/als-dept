# Decision Log

*This is the most valuable document in the pack. The code shows **what** you built. Only you hold **why** — and that's what stops a successor from quietly undoing a good decision because they didn't understand it.*

> **How to fill this in:** For each decision, write a few sentences. Don't aim for polish — aim for honesty. The format for each is: **what you decided**, **why**, **what you rejected**, and **how sure you are**. I've pre-listed the big architectural decisions I can see in the code; you fill in the reasoning and add any I've missed. Then add the *non-obvious* product/political decisions only you know about.

---

## How to read this

Each entry uses this shape:

- **Decision** — what was chosen.
- **Why** — the reasoning at the time.
- **Rejected** — what else was considered and why it lost.
- **Confidence** — Solid / Reasonable / Shaky-revisit-this.

---

## Architectural decisions (pre-seeded from the code — add the *why*)

### D1. Everything routes through single choke points
The architecture forces all LLM calls through one adapter (`AnthropicAdapter` in `@als/adapters`) and all service calls through one `CapabilityInvoker` in `@als/runtime`.

- **Why:** *Fill in — presumably auditability, swappability of the model, a single place to enforce policy? Say it in your words.*
- **Rejected:** *Did you consider letting components call the LLM directly? Why was that worse?*
- **Confidence:** ____

### D2. Deterministic vs. probabilistic split
The LLM does *language-only* work. All real decisions — policy, state, consent, gate routing — happen in deterministic code. "Decision Gates" are the architectural primitive sitting on that boundary.

- **Why:** *This looks like the core philosophical bet of the whole project. Why does it matter for government that the machine, not the model, makes the decisions? This is the bit leadership most needs to understand.*
- **Rejected:** *Letting the LLM decide more? What went wrong / what was the risk?*
- **Confidence:** ____

### D3. The 13 interaction types ("interaction typology")
Every service maps to one of 13 shapes (benefit, entitlement, grant, legal_process, obligation, application, license, register, portal, payment_service, appointment_booker, task_list, informational_hub). Each shape generates its own state model and instructions from templates.

- **Why:** *Why a fixed typology of 13 rather than bespoke per service, or a fully free-form approach? What does this buy a department?*
- **Rejected:** ____
- **Confidence:** ____

### D4. MCP as the publishing/integration mechanism
Services are exposed as MCP tools (`@als/mcp-server`); the default service mode is `mcp`. Three modes exist: `demo` (scripted, no LLM), `json` (LLM + deterministic services), `mcp` (LLM + MCP tools).

- **Why:** *Why MCP specifically as the "legibility" interface? Why three modes — what is each one for in a demo setting?*
- **Rejected:** ____
- **Confidence:** ____

### D5. Life-event-aware triage
When a citizen describes a multi-service need ("my husband just died"), the system matches it to a life event (16 defined), creates a plan silently, and de-duplicates data fields across services so the agent asks once.

- **Why:** *Why organise around life events rather than individual services? This is a big product stance.*
- **Rejected:** ____
- **Confidence:** ____

### D6. Evidence / receipts store
An append-only SQLite store (`@als/evidence`) records traces and receipts. Legibility Studio reads it over HTTP rather than importing it directly (to avoid native-module crashes).

- **Why:** *Why does an append-only audit trail matter here? Is this about trust/accountability for government?*
- **Rejected:** ____
- **Confidence:** ____

### D7. *Add any I missed*
*e.g. the consent preference model (once/service/department/cross-government scopes), the wallet/credentials model, the demo-scripts approach, the publish-generators package, the gov-web renderer. Which of these were deliberate bets worth recording?*

---

## Product & strategic decisions (only you know these)

*This is the part that isn't in any code. Capture the judgement calls.*

- *Why aim the demo at permanent secretaries specifically? What were you trying to make them feel or decide?*
- *Why these particular departments and life events (bereavement is the deepest — why)?*
- *What did you deliberately fake, stub, or simplify for the demo, and what would be different in reality? (Critical — stops someone mistaking the demo for the real design.)*
- *What's the strongest objection a sceptical permanent secretary raised, and how did you answer it?*

## Open questions / unresolved debates

*The arguments you never settled. Writing these down is a gift — it tells a successor where the live edges are instead of letting them rediscover them painfully.*

- ____
- ____

## Things that look wrong but are intentional

*Anywhere a newcomer would say "that's a bug" or "why is it done that way" — and be wrong. List them so nobody "fixes" them.*

- *e.g. the note in `CLAUDE.md`: do NOT add `@als/evidence` as a dependency of legibility-studio (it crashes). Any others?*
- ____
