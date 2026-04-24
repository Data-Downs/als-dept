# Response to Leanne's Brief: The Agentic State — A UK Proposition

**Author:** Chris Downs
**Date:** 17 April 2026
**Deadline:** Friday 25 April (for Emran and Christine)
**Status:** Draft for team review

---

## What this document is

This is a response to Leanne's brief. It proposes a structure and argument for presenting to cabinet ministers and heads of departments on the 25th. It synthesises three sources:

1. **Leanne's brief** — the mission, timeline, format, and political requirements
2. **The Agentic State vision paper** (agenticstate.org) — the international framework and theory of change
3. **The Agentic Legibility Stack** — our working prototype, evidence, and UK-specific thinking

The aim: not just a deck, but a politically compelling argument for state reform — anchored in something you can see, touch, and believe.

---

## The core argument (for ministers and heads of departments)

The international community has named this transformation: The Agentic State.

Agentic technology does not sit alongside policy and services — it fuses them. An AI agent that explains eligibility is interpreting policy. An agent that submits a form is delivering a service. When 200 million people already use these tools weekly, the question is not whether government leads or follows. It is how quickly and deeply we embed this technology into the creation, delivery, and reform of public services — because the gains are not incremental. We are talking about services that take minutes instead of weeks to deliver, citizen data entered once instead of eighty-seven times, and billions in avoidable cost removed from the system.

There is precedent. The internet transformed the delivery of government services almost beyond recognition. That transformation took thirty years. What is happening now with agentic technology will be measured in months and weeks, not years and decades. We know this because we are watching it happen — what took the internet a generation to achieve, AI is compressing into a fraction of that time.

The tide is coming. Doing nothing is dangerous. Doing too little is a wasted opportunity. But unlike the internet, we are not guessing. Thirty years of digital transformation have taught us exactly what happens when government moves slowly: the private sector fills the gap, citizens build habits around tools government didn't build, and by the time government responds it is adapting to someone else's infrastructure rather than shaping its own.

This time, we can see the wave. We can measure its speed. And we can act before it arrives — or we can watch it arrive and spend the next decade mopping up and catching up.

This is not just a better experience for citizens. It is a different operating model for government. Today, departments design web forms, write guidance pages, run contact centres, and build bespoke digital services — all to translate policy into something a citizen can navigate. In the agentic model, departments publish policy as structured, machine-readable descriptions. The agent layer handles everything between that policy and the citizen — identifying who is eligible, explaining what is needed, collecting consent, submitting data, issuing receipts. Departments stop being front-of-house. They become dedicated to the thing they are actually here to do: policy, outcomes, and the quality of the services they are responsible for.

This is state reform, not digital transformation. Digital transformation digitised what existed. This reorganises what government does.

The Agentic State paper is a framework. It describes what needs to happen. It does not show how. We have something they don't: a working reference implementation. The Agentic Legibility Stack is the first prototype that demonstrates the full stack with a deterministic policy boundary and full audit trail — from a citizen saying "my husband died three weeks ago, and I don't know what to do" to six services across four departments being identified, consented to, submitted, and receipted — in a single conversation.

The proposition is not "let us build an AI chatbot." It is: "We have proven that the machinery of government can be fundamentally reorganised around citizens' lives — and that departments gain from it, not just citizens. Here is what it looks like. Here is what it costs. Here is what we need from you to make it real."

---

## What happens in the room on the 25th

The presentation has three movements. Twenty minutes total.

### Movement 1: The case (5 minutes)

Open with the core argument above. No jargon. No architecture. The fusion of technology, policy, and services. The internet precedent. The tide. The state reform reframe. End with: "We have a working prototype. Let us show you."

The cost numbers land here:

- HMRC spends £600m on contact centres. DWP spends £160m.
- £9.5bn is lost annually to benefits overpayments.
- The HMCTS Reform Programme spent £2.8 billion delivering 14 digital services — £200m per service.
- Our cost-benefit analysis shows £393m–£917m/year in savings across six departments at 30–60% adoption. Extrapolated across central government: up to £3.9bn annually.

These are not projections based on theory. They are based on real published departmental spend mapped against what the prototype already demonstrates.

### Movement 2: The proof (10 minutes)

This is where Leanne's instinct — "more than a deck, anchored in something real" — gets delivered. Two things happen: a live demonstration, then the department view.

**The citizen experience — Sarah Okafor's bereavement journey:**

Sarah says: *"My husband died three weeks ago. I don't know what to do."*

In a single conversation, the agent:

- Identifies a bereavement life event triggering 6 services across 4 departments (GRO, DWP, HMRC, MoJ)
- Deduplicates 87 raw data fields down to 20 canonical fields — Sarah answers 7 new questions, not 87
- Shows a plan with services in priority order, dependencies explicit
- Asks for consent per department, per data field, per purpose — nothing happens without her say-so
- Submits on her behalf, issues receipts with reference numbers
- Deposits credentials (death certificate) into her digital wallet for use in subsequent services

This is not a wireframe. It is not a concept video. It runs.

**The department experience — the Legibility Studio:**

This is where the state reform argument becomes tangible. Show the Legibility Studio and explain: this is where departments describe their services in structured, machine-readable form. Four dimensions — identity, eligibility, journey, data sharing. That is the entire contract between a department and any agent acting for a citizen.

What this means for a department:

- You stop designing web forms and bespoke digital services for each channel
- You publish policy as structured data — once — and every channel consumes it
- You see which of your services are agent-ready and which have gaps (93% of government services are not yet described — that is the scale of the opportunity)
- You audit every agent interaction with your services — full evidence trail, replayable for complaints or oversight
- You focus on policy interventions, outcomes, supporting users, and learning from real-time data

This is what Maxwell means when he says: *the agentic state means departments are dedicated to policy and outcomes — less about designing web forms.*

**The architectural guarantee:**

One point for ministers who will worry about AI making decisions about people's benefits: the AI handles language. Code handles rules. Eligibility is evaluated deterministically from department-published policy — the AI cannot override, reinterpret, or relax a condition. Consent sits outside the AI entirely. Every action is traced in an immutable evidence store.

This is not a chatbot making decisions. It is an infrastructure where policy is code and the AI is a communicator — not a decision-maker.

### Movement 3: The ask (5 minutes)

**What we've proven:**

The technology works. The architecture is safe. The citizen experience is transformative. The department operating model is clearer, not more complex. The cost-benefit is overwhelming.

**What we need mandate to solve:**

1. **Procurement reform.** Current rules assume you are buying software. We are proposing an operating model. The procurement framework needs to accommodate service descriptions as a new category of government output — like GDS service standards, but machine-readable.

2. **Data sharing at scale.** The consent model is architecturally sound — granular, informed, revocable, per-purpose. But the legal basis for cross-departmental data sharing at this scale needs ICO engagement now, not after the fact.

3. **Departmental adoption.** The Legibility Studio makes it easy for departments to publish service descriptions. But "easy" and "willing" are different things. We need CDDO mandate — or ministerial expectation — that treating services as machine-readable data is a standard, not an optional extra.

4. **Third-party agents.** If government services become machine-legible, third-party agents (ChatGPT, Claude, private sector tools) can access them too. This is not a risk to be avoided — it is a design feature. But it requires governance. Government must remain the source of truth even when citizens arrive through agents government did not build.

5. **A programme, not a project.** This needs a Tiger Team operating outside regular constraints, with a clear roadmap: exemplars first, then frontier services, then integration with wider GDS products. The June milestone — enough evidence and trust learnings to justify a full agent rollout — is achievable if the team is assembled now.

**The Tiger Team:**

- Leanne-level sponsor (political mandate)
- Senior Legal (ICO, data sharing basis, liability)
- Senior Commercial (procurement reform, platform model, third-party agents)
- CDDO representative (service standards, departmental mandate)
- GDS technical lead (integration with One Login, content API, existing infrastructure)
- The existing AI Studio team (prototype, evidence, design)

---

## How we relate to the Agentic State framework

We align with the international framework. We go further on trust, accountability, and working code. And we are grounded in UK departments, UK policy, and UK services — with six real personas across MoJ, DWP, HMRC, DfE, Home Office, and DVLA.

The Agentic State paper describes twelve functional layers. Our prototype already demonstrates working implementations across five of them: public service design (the citizen app), government workflows (the Legibility Studio), policy as code (the deterministic policy evaluator), agent governance (the evidence plane and consent model), and data and privacy (the three-tier data model with granular consent).

The paper is the international rallying cry. Our work is the UK's answer to it — with receipts.

---

## The deliverables for the 25th

1. **A short, politically sharp slide deck (10–15 slides).** The argument structure above in ministerial language. No jargon. No architecture diagrams. The fusion. The state reform. The cost. The risk. The ask.

2. **A live prototype walkthrough.** Sarah's bereavement journey, running on a screen or shared link. Not a video. Not screenshots. The real thing running in the room.

3. **A publication-ready website.** Not just internal documentation — something that could live on the GOV.UK AI site or the digital roadmap as a public statement of intent. This provokes stakeholders into thinking: this is already real enough to publish. It changes the status of what we are presenting from "here is our prototype" to "here is a draft of what government could say publicly."

4. **The docs site as a leave-behind.** The v2 documentation site (already built) serves as the detailed reference. Ministers don't read it in the room. Their advisors read it afterwards. It has the technical depth, the persona deep dives, the department-by-department breakdown.

5. **A one-page summary for the red box.** The political case in 500 words. The ask. The cost. The risk. Nothing else.

---

## Questions to confirm before finalising

1. **Audience.** "Emran and Christine" — are these the primary audience, or are other ministers and permanent secretaries in the room? The tone and emphasis shift depending on who is there.

2. **The June target.** Is June a hard political deadline (spending review, legislation)? Or is it the point at which we need enough evidence to justify a larger programme? This affects what we promise on the 25th.

3. **The GOV.UK app question.** How does this agentic layer sit alongside or inside the existing GOV.UK app? The ALS architecture is designed to sit behind any frontend — but we need a position on this for the room.

4. **Risk appetite.** Leanne said "we must be willing to take risks." How far does that extend? Can we propose a pilot with real citizens and real services? Can we propose things that challenge existing ICO guidance?

---

## Immediate next steps

- [ ] Confirm the questions above with Leanne
- [ ] Get the Agentic State deck from the call (via Maxwell)
- [ ] Align with Kuba on the slide deck structure — he has a V2 started
- [ ] Draft the ministerial slide deck (10–15 slides)
- [ ] Prepare the live prototype for demonstration
- [ ] Scope the publication-ready website with the team
- [ ] Write the one-page red box summary
- [ ] Brief the team on the argument structure and talking points
- [ ] Connect with Johnathan (Kuba's suggestion) to ensure technical credibility and alignment with Once
