# The Agentic State: A UK Proposition

Slide-by-slide content for 25 April 2026

---

## Slide 1 — Title

**The Agentic State**
A UK Proposition

GDS AI Studio
25 April 2026

---

## Slide 2 — The fusion

Agentic technology does not sit alongside policy and services — it fuses them.

An AI agent that explains eligibility is interpreting policy.
An agent that submits a form is delivering a service.
An agent that sequences tasks across departments is orchestrating government.

These are not separate activities. In the agentic model, technology, policy, and service delivery are the same thing. You cannot reform one without reforming all three.

---

## Slide 3 — This is already happening

Citizens are already using AI agents to interact with government services — without government's knowledge, consent, or oversight.

- **26% of US citizens** used AI tools to file their 2025 tax returns — up from 11% the previous year (CBS News, April 2025)
- **ChatGPT has 200 million weekly active users** worldwide. Claude, Gemini, and open-source alternatives are growing at comparable rates
- **OpenAI gave 2,500 UK civil servants** access to ChatGPT Enterprise (Technology Magazine, 2025)
- **90,000+ users across 3,500 US government agencies** have exchanged 18 million messages with ChatGPT
- The **Model Context Protocol** (MCP) — an open standard for connecting AI agents to external tools and data — was adopted by OpenAI in March 2025. Any AI model can, in principle, connect to government service endpoints and act on the data it finds there

The infrastructure for third-party agents to interact with government services already exists. The question is not whether this happens. It is whether government has any role in shaping how it happens.

---

## Slide 4 — The cost of the current model

Government currently spends billions translating policy into citizen-navigable services — and still fails millions of people.

| Department | Cost | Source |
|---|---|---|
| HMRC contact centres | £600m (new contract) | Public Technology, April 2025 |
| HMRC avoidable calls | 28 million calls/year (£140–196m) | HMRC annual report |
| DWP contact centres | £160m (contract value) | The Stack, 2024 |
| DWP benefits overpayments | £9.5bn/year | DWP annual accounts |
| HMCTS Reform Programme | £2.8bn for 14 digital services (£200m per service) | Public Technology, March 2025 |
| DfE childcare system | £1bn overspend | NAO review |
| Home Office asylum accommodation | £4bn/year | Home Office accounts |

Across just six departments, we identified **£1.3 billion in addressable annual waste** — costs that exist because government services are fragmented, siloed, and built for each department to deliver individually rather than for citizens to navigate as a whole.

---

## Slide 5 — The precedent

The internet transformed the delivery of government services almost beyond recognition. That transformation took **thirty years**.

What is happening now with agentic technology will be measured in months and weeks, not years and decades. We know this because we are watching it happen — what took the internet a generation to achieve, AI is compressing into a fraction of that time.

Thirty years of digital transformation have taught us exactly what happens when government moves slowly: the private sector fills the gap, citizens build habits around tools government didn't build, and by the time government responds it is adapting to someone else's infrastructure rather than shaping its own.

This time, we can see the wave. We can measure its speed. And we can act before it arrives — or we can spend the next decade mopping up and catching up.

---

## Slide 6 — International context: The Agentic State

The international community has named this transformation. The **Agentic State** vision paper, launched at the Tallinn Digital Summit in 2025 with contributions from 20+ digital government leaders across 15 countries, identifies four shifts in governance:

**1. Rule-based decision-making → Outcome optimisation**
Stop optimising for procedural compliance. Start optimising for citizen outcomes. An agentic system can follow policy intent — the actual goal — rather than just the rules that approximate it.

**2. Hierarchical authority → Network coordination**
Agentic systems operate through networks of specialised agents coordinating across departmental boundaries, rather than through hierarchical command structures. Faster decisions, fewer silos.

**3. Specialised roles → Adaptive capabilities**
Departments currently create deep expertise within narrow domains but cannot adapt when circumstances cross boundaries. Agentic systems work across domains — a bereavement triggers services in GRO, DWP, HMRC, and MoJ simultaneously.

**4. Periodic planning → Continuous learning**
Traditional government revises policy on five-year cycles. Agentic systems learn continuously — tracking what works, what fails, and what citizens actually need, in real time.

Governments already piloting agentic services: **Ukraine** (Diia.AI — national AI agent inside government portal), **Abu Dhabi** (TAMM 3.0 — conversational voice with transaction completion), **Brazil** (Goiás — AI agents across permit processing and welfare administration).

---

## Slide 7 — State reform, not digital transformation

This is not just a better experience for citizens. It is a different operating model for government.

**Today:** Departments design web forms, write guidance pages, run contact centres, and build bespoke digital services — all to translate policy into something a citizen can navigate. Each department does this independently. Each channel (web, phone, post, in-person) requires its own version. 1,544 government services × 5+ channels = **7,700+ parallel descriptions** of the same services, maintained separately.

**In the agentic model:** Departments publish policy as structured, machine-readable descriptions — once. The agent layer handles everything between that policy and the citizen: identifying who is eligible, explaining what is needed, collecting consent, submitting data, issuing receipts. Every channel — web, app, voice, third-party agent — consumes the same source.

**Departments stop being front-of-house. They become dedicated to policy, outcomes, and the quality of the services they are responsible for.**

This is state reform, not digital transformation. Digital transformation digitised what existed. This reorganises what government does.

---

## Slide 8 — We have a working prototype

The Agentic State paper describes what needs to happen. It does not show how.

We have built the first prototype that demonstrates the full stack with a deterministic policy boundary and full audit trail:

| What the prototype includes | Scale |
|---|---|
| Government services in the catalogue | 1,653 |
| Services with full structured descriptions | 113 |
| Life events mapped | 16 |
| Departments covered | 6 (MoJ, DWP, HMRC, DfE, Home Office, DVLA) |
| Real personas with end-to-end journeys | 6 |
| Service dimensions per description | 4 (identity, eligibility, journey, data sharing) |

Two products, one platform:

**Citizen app** — citizens describe their situation in plain language. The agent identifies every relevant service, across every department. Consent is granular and per-purpose. Every action is receipted.

**Legibility Studio** — departments author structured service descriptions, audit agent interactions, measure service readiness, and replay citizen journeys for complaints or oversight.

---

## Slide 9 — Live demo

**5-minute live demo: Sarah Okafor's bereavement journey**

Sarah (58, Chelmsford) says: *"My husband died three weeks ago. I don't know what to do."*

What happens in the demo:

- Agent identifies bereavement life event → 6 services across 4 departments (GRO, DWP, HMRC, MoJ)
- 87 raw data fields across those services are deduplicated to 20 canonical fields — Sarah provides 7 new data points, not 87
- Plan shown with services in dependency order (register death → Tell Us Once → Bereavement Support Payment → probate → pension → council tax)
- Consent requested per department, per data field, per purpose
- Agent submits on Sarah's behalf, receipts issued with reference numbers
- Death certificate deposited into Sarah's digital wallet as a verified credential
- Bereavement Support Payment confirmed and paid into her bank account

---

## Slide 10 — Other journeys the prototype demonstrates

Sarah's bereavement is one of six end-to-end journeys built across six departments:

| Persona | Situation | Departments | Key demonstration |
|---|---|---|---|
| **Sarah Okafor** (58) | Bereavement — husband died | GRO, DWP, HMRC, MoJ | 6 services, 4 departments, 87→7 field deduplication |
| **Marcus Taylor** (29) | Prison leaver — reintegration | MoJ, DWP, DVLA | UC claim, bank setup, licence renewal, probation compliance. 6-week deadline pressure |
| **Priya Anand** (31) | New mum — childcare support | DfE, HMRC, DWP | Discovers £5,000/year in entitlements she didn't know existed. Proactive eligibility surfacing |
| **James Whitfield** (42) | Disabled — PIP appeal | DWP, DfE, DVLA | Contested interaction: tribunal appeal, EHCP chase. Not just services — disputes |
| **Amina Hassan** (34) | New resident — starting over | Home Office, DWP, HMRC | Dependency chain: NI number → UC → bank account → eVisa |
| **Daniel Obi** (37) | Self-employed — tax confusion | HMRC, MoJ | MTD enrolment, tax refund, civil money claim for unpaid invoice |

Each journey crosses departmental boundaries. Each demonstrates something different about what agents make possible: proactive discovery, field deduplication, contested decisions, dependency sequencing, time-critical deadlines.

---

## Slide 11 — What departments get

The Legibility Studio is where departments make their services ready for agents.

**Author:** Describe services using four dimensions — identity, eligibility, journey, data sharing. LLM-assisted generation helps teams start from existing GOV.UK content. A worked example: DVLA's "renew driving licence" went from catalogue entry to fully agent-ready in approximately 2 hours.

**Audit:** Every agent interaction with department services is recorded. The evidence explorer lets teams replay any citizen journey step by step — what data was shared, which policy rules were evaluated, what consent was given, what the outcome was. Full context for complaints or oversight.

**Measure:** Coverage dashboard shows which services are agent-ready and which have gaps. Currently: 113 of 1,653 services have full descriptions — **7% coverage**. Priority sorting helps teams focus on the services that matter most by volume, cost, or citizen impact.

**What this means for departments:**

- Stop designing bespoke web forms and digital services for each channel
- Publish policy as structured data — once — and every channel consumes it
- Focus on policy interventions, outcomes, and learning from real-time data
- 93% of services are not yet described — that is the scale of the opportunity, and the Legibility Studio is how departments close the gap

---

## Slide 12 — The safety architecture

The most common concern about AI in government: what if it gets things wrong?

The answer is an architecture where the AI is never the one making decisions.

**The AI handles language. Code handles rules.**

| What the AI does | What code does |
|---|---|
| Interprets "my mum just died" as a bereavement life event | Evaluates eligibility from department-published rules |
| Explains eligibility results in plain English | Enforces the valid sequence of steps (state machine) |
| Adjusts tone for sensitive situations | Blocks data sharing without explicit consent |
| Asks follow-up questions when the situation is ambiguous | Submits data through audited gateways |
| | Records every action in an immutable evidence store |

**Three guarantees:**

1. **Eligibility is code, not AI.** Policy rules are evaluated deterministically. The AI cannot override, reinterpret, or relax an eligibility condition. If the AI suggests something that contradicts the service description, the runtime blocks it.

2. **Consent cannot be bypassed.** The consent gate sits outside the AI entirely. No prompt, no edge case, no system error can cause data to be shared without citizen approval. Each consent is scoped to a specific purpose, recipient, and data fields.

3. **Every action is traced.** The evidence plane records independently. Receipts are issued to citizens. Full replay is available for audit, complaints, or parliamentary questions.

---

## Slide 13 — The savings

**Across six departments at three adoption scenarios:**

| Adoption level | Annual savings | 5-year savings |
|---|---|---|
| 30% (conservative) | £393m | £1.97bn |
| 50% (moderate) | £655m | £3.28bn |
| 60%+ (ambitious) | £917m | £4.59bn |

**Extrapolated across all central government** (addressable cost base of £4.5–6bn):

| Adoption level | Annual savings | 5-year savings |
|---|---|---|
| 30% | £1.35–1.8bn | £6.75–9bn |
| 50% | £2.25–3bn | £11.25–15bn |
| 60%+ | £2.7–3.9bn | £14.6–19.5bn |

**Beyond cost savings:**

- **£3.5bn in citizen time returned** — hours currently spent navigating forms, waiting on phone lines, re-entering data
- **Billions in unclaimed entitlements surfaced** — Priya Anand's journey demonstrates £5,000/year in childcare support she didn't know she was eligible for. Multiply that across millions of eligible citizens
- **Up to 2,000 digital roles freed** for higher-value work — service teams shift from building bespoke forms to governing policy and outcomes
- **Per-service cost reduction:** HMCTS spent £200m per digital service over its reform lifecycle. The Legibility Studio model — departments publish four structured descriptions — brings per-service cost to £12k–53k over five years. A 99%+ reduction

Sources: HMRC annual report; DWP annual accounts; HMCTS Reform Programme (Public Technology); Digital Efficiency Report (Cabinet Office); State of Digital Government Review (Jan 2025); NAO reviews.

---

## Slide 14 — What we need

We have proven the technology works, the architecture is safe, and departments gain from it. To move from prototype to programme, we need mandate on five things:

**1. Procurement reform**
Current procurement rules assume you are buying software. We are proposing an operating model where departments publish structured service descriptions as a standard output. This is a new category — like GDS service standards, but machine-readable. Existing frameworks do not accommodate it.

**2. Data sharing at scale**
The consent architecture is granular, informed, revocable, and per-purpose — each consent scoped to specific fields, specific departments, specific reasons. But the legal basis for cross-departmental data sharing at this scale needs ICO engagement now. Not after the fact. We need a Senior Legal lead working on this immediately.

**3. Departmental adoption**
The Legibility Studio makes it straightforward for departments to publish service descriptions — 2 hours for a single service, LLM-assisted. But "straightforward" and "willing" are different things. We need CDDO mandate — or ministerial expectation — that making services machine-readable is a standard, not an optional extra. 93% of services are currently undescribed. That gap does not close voluntarily.

**4. Third-party agent governance**
If government services become machine-legible, third-party agents (ChatGPT, Claude, private sector tools) will access them. This is already beginning — 26% of US citizens used third-party AI for tax filing. This is not a risk to avoid. It is a design feature. But government must remain the source of truth and must set the terms on which third-party agents interact with public services.

**5. A programme, not a project**
This cannot be delivered as a standard GDS project within regular constraints. It requires a Tiger Team with seniority to operate across departmental boundaries, with a clear roadmap: exemplar departments first, frontier services second, then integration with wider GDS products (One Login, GOV.UK app, content API).

---

## Slide 15 — The Tiger Team

| Role | Responsibility |
|---|---|
| Leanne-level sponsor | Political mandate to operate across departments and bypass standard bureaucracy |
| Senior Legal | ICO engagement, legal basis for cross-departmental data sharing, liability framework for agent decisions |
| Senior Commercial | Procurement reform for service descriptions as outputs, platform model for third-party agent access |
| CDDO representative | Service standard mandate for machine-readable descriptions, departmental adoption framework |
| GDS technical lead | Integration with One Login, content API, GOV.UK app, existing digital infrastructure |
| AI Studio team | Prototype development, evidence and research, design, user testing with citizens |

---

## Slide 16 — The timeline

**Now → 25 April**
This presentation. The case for a programme.

**May**
Tiger Team assembled. ICO and CDDO engagement begins. Exemplar departments identified (candidates: DVLA for low-complexity high-volume services, DWP for benefits and cross-departmental dependencies, HMRC for cost reduction at scale).

**June**
Decision point. Enough evidence, trust learnings, and departmental engagement to justify a full agent rollout. First exemplar services described and tested with real citizens.

**Summer → Autumn**
Exemplar services live. Frontier services in development. Legibility Studio open to departments. Integration with One Login and GOV.UK content API underway.

**By end of year**
Publication-ready proposition: the UK's public position on the Agentic State, backed by working services, real data, and departmental adoption.

---

## Slide 17 — The proposition

The proposition is not "let us build an AI chatbot."

It is:

**We have proven that the machinery of government can be fundamentally reorganised around citizens' lives — and that departments gain from it, not just citizens.**

- 6 departments. 6 personas. 113 services described. 16 life events mapped.
- £393m–£3.9bn in annual savings depending on adoption.
- A working prototype with a deterministic policy boundary, granular consent, and full audit trail.
- An international framework we are further ahead on than any other country.

**Here is what it looks like. Here is what it costs. Here is what we need from you to make it real.**
