# Brief: Prompt Caching & Card Resolution Accuracy

## Context

The citizen app's chat responses feel slow and card rendering is sometimes unpredictable. Two targeted improvements will address this without architectural changes.

---

## Part 1: Anthropic Prompt Caching

### Problem

Every API call sends the full system prompt (12-25 KB for journey mode) as fresh tokens. The same persona + service + state combination produces near-identical system prompts across turns, but we pay full input token cost every time.

### What to do

Anthropic's prompt caching lets you mark content blocks with `cache_control: { type: "ephemeral" }`. Cached blocks are served from memory on subsequent requests within a 5-minute window, reducing latency and cost.

### Implementation

**File**: `packages/adapters/src/anthropic.ts` — the `execute()` method (around line 68)

Currently the system prompt is passed as a plain string:

```typescript
const apiParams: any = {
  model: input.model || this.model,
  max_tokens: input.maxTokens || this.maxTokens,
  system: input.systemPrompt,
  messages: input.messages,
};
```

Change `system` to use the block format with cache control:

```typescript
system: [
  {
    type: "text",
    text: input.systemPrompt,
    cache_control: { type: "ephemeral" }
  }
],
```

### Smarter: Split static vs dynamic prompt sections

For better cache hit rates, split the system prompt into a **static prefix** (agent prompt, persona prompt, instructions, guardrails) and a **dynamic suffix** (current state, facts, field collector context). Cache the static prefix only.

This requires changes in two places:

1. **Orchestrator** (`packages/runtime/src/orchestrator.ts`): Refactor `buildTriagePrompt()` (line ~1250) and `buildJourneyPrompt()` (line ~1322) to return `{ staticPrefix: string, dynamicSuffix: string }` instead of a single string. The split point is after the scenario prompt and persona data (which rarely change) and before state context and fact prompts (which change every turn).

2. **AnthropicAdapter** (`packages/adapters/src/anthropic.ts`): Accept the split prompt and send as two system blocks:

```typescript
system: [
  {
    type: "text",
    text: input.staticSystemPrompt,
    cache_control: { type: "ephemeral" }  // cached across turns
  },
  {
    type: "text",
    text: input.dynamicSystemPrompt,
    // no cache_control — changes every turn
  }
],
```

### Expected impact

- ~50% reduction in input token processing time on cache hits (Anthropic's published figure)
- Cache hits are likely on turns 2+ of any journey (same persona, same service, same agent prompt)
- The static prefix (agent + persona + scenario + persona data + instructions) is typically 8-15 KB — well above the 1,024 token minimum for caching

### Files to touch

- `packages/adapters/src/anthropic.ts` — execute() method
- `packages/runtime/src/orchestrator.ts` — buildTriagePrompt(), buildJourneyPrompt()
- `packages/runtime/src/types.ts` — update SystemPrompt type if needed

---

## Part 2: Card Resolution Accuracy

### Problem

Cards sometimes appear at wrong states, or fail to appear when expected. The current resolution chain is deterministic but has gaps.

### How it currently works

Card resolution lives in `apps/citizen/app/api/chat/route.ts` (lines ~907-1078) and follows this chain:

1. **Interaction type inference**: `serviceType` from the graph node → `inferInteractionType()`. Falls back to a hardcoded map for hand-crafted services (DVLA, UC, pension).

2. **State allowlist gate**: Hand-crafted services only resolve cards at specific states defined in `HANDCRAFTED_CARD_STATES`. If the current state isn't in the allowlist, no cards render.

3. **Three-level resolution**: `resolveCardsWithOverrides()` in `packages/schemas/src/card-registry.ts` (line ~1466):
   - Level 1: Per-service DB overrides from Legibility Studio
   - Level 2: Static `CARD_REGISTRY` (hand-crafted service cards)
   - Level 3: `TEMPLATE_CARD_REGISTRY` (generic fallback by interaction type)

### What to improve

#### A. Add logging to diagnose misses

Before fixing card accuracy, instrument the resolution chain so you can see exactly why a card was or wasn't shown.

In `apps/citizen/app/api/chat/route.ts`, at the card resolution block (~line 907), add structured trace logging:

```typescript
const cardTrace = {
  serviceId,
  stateId: currentState,
  inferredInteractionType: resolvedInteractionType,
  graphNodeServiceType: serviceTypeForCards,
  isHandcrafted: !!HANDCRAFTED_INTERACTION_TYPES[serviceId],
  stateAllowlisted: isStateAllowed,
  resolutionLevel: null as string | null,  // set during resolution
  cardsResolved: [] as string[],
};
```

Pass this into `resolveCardsWithOverrides` (or log after) and include it in the trace/evidence system. This will show you exactly where resolution fails for each turn.

#### B. Expand the state allowlist

The `HANDCRAFTED_CARD_STATES` map is very restrictive. For example, UC only allows cards at 3 states:

```typescript
"dwp.apply-universal-credit": new Set([
  "personal-details-collected",
  "income-details-collected",
  "payment-made",
]),
```

Review the state models for each hand-crafted service (in `data/services/[serviceId]/state-model.json`) and ensure every state that should trigger a card is in the allowlist. Missing states here is the most likely cause of cards not appearing.

#### C. Validate interaction type inference for graph services

For non-hand-crafted (graph) services, `inferInteractionType()` maps the graph node's `serviceType` to an interaction type. If the graph node has no `serviceType` or an unmapped one, resolution falls through silently.

Add a fallback: if `inferInteractionType()` returns null, log a warning and try the template registry with a generic interaction type rather than skipping card resolution entirely.

#### D. Audit the template registry against real state IDs

The `TEMPLATE_CARD_REGISTRY` uses generic state IDs like `details-submitted`, `payment-made`, `slot-selected`. But actual state models may use different naming (e.g. `personal-details-collected` vs `details-submitted`). Audit whether the template states match the state IDs generated by the state machine for graph services. If they don't match, cards will never resolve for those services.

### Files to touch

- `apps/citizen/app/api/chat/route.ts` — card resolution block (lines ~907-1078)
- `packages/schemas/src/card-registry.ts` — CARD_REGISTRY, TEMPLATE_CARD_REGISTRY, resolveCardsWithOverrides()
- `data/services/*/state-model.json` — reference for state ID audit
- `packages/runtime/src/orchestrator.ts` — if trace logging needs pipeline integration

---

## Suggested order

1. Add card resolution tracing (Part 2A) — gives you data before you change logic
2. Implement basic prompt caching (Part 1, simple version) — quick win, low risk
3. Audit and fix card state allowlists (Part 2B, 2C, 2D) — informed by tracing data
4. Split static/dynamic prompts for better cache hits (Part 1, smarter version) — optimisation pass
