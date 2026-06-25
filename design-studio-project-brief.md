# Project Brief: The Diagonal
### Prototyping how GDS's services and capabilities compose into one agentic citizen experience

**From:** Chris
**In response to:** *GDS products operating model and design studio team brief*
**Shape:** A design-led prototyping project — I lead, with Alex Grey collaborating — 4 weeks, 4 days/week

---

## What this is, and what it isn't

The design studio brief bundles two things together: a standing operating-model and org-design change, and the first piece of work that model would produce.

I can't (and shouldn't) do the first piece. Standing up a team, managing engagement and user testing needs people and months I don't have — and it is not where I'm most useful. What I can do, fast and design-led, is the second: produce the first artefact the studio would produce, as a worked exemplar, and leave the objects behind as templates a standing team can fill in, deepen and test.

I'll lead this and do most of it, bringing in Alex Grey to collaborate on some of the design decisions, the design detail and the prototyping. Alex authored the Spaceship View (referenced below) — so he is already thinking in this direction, which makes him a natural design collaborator for this work.

The artefacts I produce will become the argument for the operating model. The last time this room shifted — from "agents are software that runs on top of government" to "government must deliberately publish infrastructure to agents" — it shifted because I built the provocation, the Agentic Legibility Stack, not a paper, or a team. I am proposing the same move, aimed at the next shift.

So this brief is my response: I should take the mission on as a project, not as an org.

## The shift I'm aiming at

The Legibility Stack moved our focus to the provision side — the supply question: *you must publish services so agents can read them.* This project moves the commission side — the demand question: *how does a citizen's intent get compiled across services on their behalf* — and tackles the thing now confusing everyone, which sits alongside both: capabilities.

The core provocation, stated plainly:

> GDS's vertical operating model is producing *product* thinking about things that are really *capabilities*. The result is a growing set of separate "products" — chat, mailbox, personalised planning, one-login, notifications — each importing its own metaphor (an inbox, tabs, folders, a feed) into the app. But these are not separate products. They are capabilities that compose into a single product: the citizen experience. And under an agentic interaction model, several of them might even dissolve entirely.

## The three things being conflated

There seems to be an unhealthy dose of worry, concern, confusion and suspicion in the teams charged with pushing forward the product workstreams. I think the confusion might come from collapsing three different things into the word "product." Separating them is also the shared-terminology deliverable the original brief asks for in weeks 1–2.

1. **Service** — a discrete departmental outcome or transaction (register a death, claim a benefit). The vertical. Owned by a department.
2. **Capability** — a horizontal, reusable building block that many services and experiences draw on: One Login (identity), GOV Pay (payment), Notify (notification), the wallet (credentials), tasks, plans, and chat (the conversational interface itself). Capabilities are not citizen-facing products in their own right. They are the infrastructure of experience.
3. **Experience (the app)** — the single coherent surface where services and capabilities compose for the citizen. Anticipated to be the main interface for all citizens by 2030.

These three are the layers being flattened: things that are services or capabilities keep getting called products, when the only real product is the experience they compose into. Two further terms are needed to talk about:

**Channel** — app, web, agent/assistant. (The same capability can surface across channels.)

**Plan** — the 'diagonal' object: a citizen-intent container ("my husband just died, I don't know what to do") that compiles services and capabilities around what a person actually needs, agnostic of which service delivers. The organising primitive of the agentic experience.

The specific confusions this project will aim to resolve:

- chat is not a product — it is the conversational interface into the AI system.
- Personalised planning is not a separate product — it is a capability extension of chat.
- Mailbox is not a product — it is at most a feature, and more likely a transport mechanism that dissolves.

Each is worked through below.

## What's in scope — the landscape I'm designing with, for and around

Two existing artefacts already set out the products, capabilities and workstreams in flight. Everything in them is in scope as an ingredient for this work — I'm designing *with* them, *for* them and *around* them. Sorting them through the vocabulary above is itself part of the point.

**Artefact 1 — the cross-cutting capabilities map** ("What's missing from GOV.UK today, and is needed for proactive, digital government?"). It shows three cohort verticals crossed by six horizontal capabilities:

- *Verticals (cohorts / service lenses):* Driving, Young families, Benefits.
- *Horizontals (capabilities):* Notifications; Data sharing / account / trust / consent; Mailbox; Agents; Content; Credentials.

This is the vertical-versus-horizontal picture in a single image: the cohorts are the columns, the capabilities are the bars that have to run across them. My diagonal cuts straight through this grid.

**Artefact 2 — the Spaceship View** ("What if we made a Public Operating System?"). A fuller map of the proposed app, whose own layers sort cleanly onto the vocabulary above:

- *Experience (the app surface), organised as five modes:* Manage · Check and act · Discover · Ask · Secure, store and identify — spanning Account & Profile, Tasks & Applications, Following, Dot (currently chat) and ID & Documents (the Wallet).
- *Universal / cross-cutting patterns:* contextual support ("Dot, what is this?"), Privacy mode, Search, Pay, Verify.
- *Capabilities / Infrastructure:* GOV Pay / Payments (checkout, notify, manage, track, share); Tracking & Fulfilment; Content management (Push notifications, Tell us once, Communications); GOV Account (One Login); GOV Intelligence (AI); Unified Data Platform (department accounts and records).
- *Data layer:* user data, relationships, permissions and identity; government information (web), policy and law — with a data-sharing model spanning permanent, temporary and situational data.

The Spaceship View is already reaching for the composition this brief argues for. Its own framing says "start with user needs, not government structure" and "dismantle silos," and it sketches an emerging metaphor of content connected by relationships rather than location — where retrieval is by meaning not placement, and the old static container (folder, vault) gives way to a dynamic feed/stream. That is the same feature-dissolution thesis. My job is to test it, sharpen it, and show concretely how these capabilities architect into one coherent experience rather than a stack of separate products.

Taken together, the in-scope ingredients I'll account for, and that the Plan must be able to compile across, are:

- *Cohort verticals:* Driving, Young families, Benefits.
- *Capabilities:* One Login / GOV Account; GOV Pay; Notifications / Communications (Tell us once); Mailbox; Content management; Credentials / Wallet; Agents; GOV Intelligence (AI); Unified Data Platform; Tracking & Fulfilment; Data sharing, trust & consent.
- *Experience areas:* Account & Profile; Tasks & Applications; Following; Dot (chat); ID & Documents.
- *Universal patterns:* Search, Pay, Verify, Privacy mode, contextual support.

## What "diagonal" means

Running purely horizontally across services skims the top of the stack — the GOV.UK information layer — and that only makes the agent an information-scraper. The real value sits one layer down, in the information-exchange layer: everything after the Start Now button, where someone authenticates, identifies themselves, and provides data. So the work has to go deeper into services and across them at the same time, on behalf of the citizen.

That diagonal is exactly what a Plan is.

## The map: commission × provision, composed by capabilities

**Provision (supply)** — how legible services are to agents (service builder / agentic legibility studio), explored in three scenarios:

1. What happens if all services are available to the app on a data-publishing standard that every department conforms to?
2. What happens if we have a patchy, partial state where some services are headless and legible and others aren't?
3. What happens if we have a rogue state where no departments conform and the agent stitches everything together from the outside?

**Commission (demand)** — how the agent and citizen consume across services:

1. What if the app is a fully dissolved conversational experience?
2. What if an augmented version of today's app?
3. What if the app is a hybrid of the two?

Capabilities compose across both axes — they're the building blocks the commission side assembles and the provision side exposes.

I'll paint the provision scenarios as narrative pictures with diagrams (not built — this is the framing layer), and I'll build the commission axis as a single configurable exemplar. I have a running start here: the citizen-facing app I built on top of the Legibility Studio was already a commission prototype, showing how the two sides interrelate.

## What I'll build

**1. One configurable exemplar of the agentic experience,** toggling across three interaction futures:

- *Dissolved* — fully conversational. No tabs, folders or icons; everything is prompted for and rendered at the point of asking ("is there anything I need to do for government today?", "summarise the last six months with government").
- *Augmented app* — today's app, with the new capabilities embedded into it meaningfully.
- *Hybrid* — predominantly conversational, with verified data and task/plan objects surfaced as cards alongside the conversation.

**2. The capability-composition story, worked through two concrete cases:**

- *The letter / mailbox decomposition.* A government letter is a container of two things: something you need to **know** and something you need to **do**. The thing-to-know goes straight into the data file or wallet — a credential like a National Insurance or driving licence number. The thing-to-do becomes a time-bound task, held in memory and surfaced later as a reminder. So the mailbox doesn't need to be ported into the app as an inbox. It decomposes, and at most becomes transport. This lands directly against live roadmap work.
- *Chat → planning.* Personalised planning shown as a capability extension of chat. As chat moves from answering questions to doing things, it needs new interface layers: how a plan is created, how it returns as a card or object rather than a line of conversation, how sequencing is managed, how results come back. This reframes an awkward product boundary as one coherent capability.

**3. A sequencing / penny-drop note.** The original brief names sequencing as the immediate problem. The feature-dissolution thesis is itself a sequencing argument: sort the current roadmap into skeuomorphic ports (mailbox-as-inbox, tabs, folders, feed) versus genuine agentic primitives (plan, task, credential/wallet, render-on-demand). Build the primitives first; the skeuomorphs you'll only have to tear out.

**4. The templates and method.** The objects behind the exemplar — the Plan schema, the capability-composition model, the terminology, the scenario frames — packaged so the standing studio, when it forms, starts from a tested kit rather than a blank page.

## The plan — 4 weeks, compressed from the brief's 8

**Week 1 — Capture & map (the sponge).** Write down what exists: capabilities, services, roadmap areas, and the terminology confusion. Pull in the right data — cohorts, problems, user needs. *Output:* a (one-page) landscape and the shared terminology above. Boxed deliberately — desk research plus a few conversations, not an exhaustive map.

**Week 2 — Connect & identify (the thinking).** Come at it from the interaction-model perspective. Find the cross-cutting opportunities and the dependencies individual teams can't see — chat / planning / mailbox coherence is the first. Decide the scenarios. *Output:* the commission × provision map, the three interaction futures defined, and the capability-composition argument.

**Weeks 3–4 — Prototype.** Build the configurable exemplar and the two worked cases; produce the sequencing note; package the templates. *Output:* a built provocation that can directly inform a delivery decision — for example the mailbox and chat teams' sequencing — plus the starter kit.

I can reach prototyping in 4 weeks rather than 8 because the work is design-led and I prototype fast — leading it myself with Alex's help on the design detail and the build, not running a team process or bringing a whole programme along.

## Scope — in and out

**In scope:** the configurable exemplar, the two worked cases (letter/mailbox, chat/planning), the sequencing note, the templates and method, and the shared terminology.

**Out of scope:** standing up the studio team, rotations and recruitment; community engagement; user testing and research with citizens; owning the stakeholder process of a real delivery decision. These need the team and the time I don't have — and the artefact is precisely what makes resourcing them easier afterwards.

## How this honours the original intent

It still proves the operating model — by being the first instance of its output. It still runs horizontally — through the Plan, diagonally, which is the only horizontal that doesn't just skim the information layer. It still answers the stated pains: joined-up experience, cross-cutting discovery, shared terminology, and sequencing / penny-drop moments. It just does it as a focused, design-led provocation — me leading, with Alex alongside — rather than a committee, which is faster and sharper, and is how the last shift actually happened. The templates are how I feed the team that comes after me, rather than walking away from it.

## Risks and dependencies

This is a provocation, not validated design. It informs decisions; it doesn't make them. User testing is still needed before anything commits to delivery.

It touches live team roadmaps — chat, mailbox, planning. I'll frame every example as an illustration of the coherence opportunity, never as a critique of a team.

Its lasting value depends on someone owning the templates after I leave. The kit is built to be handed over, but it needs a home.
