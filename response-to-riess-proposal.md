# Response to Service Schema & Service Graph Proposal

**From:** Chris, DataDowns
**Re:** Maxwell Riess proposal (March 2026)
**Date:** 20 March 2026

---

We strongly support this proposal. We've been building a working reference implementation — the Agentic Legibility Stack (ALS) — that addresses the same problem and validates the core thesis: RAG alone cannot sequence services or encode cross-departmental dependencies.

**What we've built that's relevant:**

- 114 government services already encoded with structured eligibility rules, state machines, and consent models — a ready-made seed dataset for the schema
- A working MCP server exposing these services as agent-callable tools
- A deterministic orchestration layer that keeps policy evaluation and state transitions in code, not in the LLM — preventing hallucinated eligibility decisions
- A full evidence/audit trail (traces, receipts, replay) so every agent action is accountable
- A consent model that records what data was shared, why, and by whose authority
- A citizen-facing prototype and a department-facing "Legibility Studio" dashboard

**Where we think the proposal could go further:**

1. **Consent and delegation** — the schema doesn't yet address what data an agent is permitted to share on behalf of a citizen, or how that consent is recorded and revoked. This is essential for trust.
2. **Accountability beyond provenance** — the 12-month staleness flag is a good start, but consuming systems also need an evidence layer showing *how* agent decisions were made using the schema data.
3. **State models** — services aren't just data; they're journeys with valid sequences. A state machine per service (as we've implemented) would make the schema dramatically more useful to agent systems.

**We'd welcome the opportunity to demo the ALS and discuss how our implementation could inform the schema design.**
