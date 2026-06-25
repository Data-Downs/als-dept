# Read Me First

*The one-page orientation. If someone opens this folder knowing nothing, this page should get them oriented in five minutes.*

> **How to use this folder:** Read this page, then follow the "If you only read one more thing" pointer below. The other files go deeper. Anything in *italics with a prompt like this* is a note to Chris — replace it with your own words and delete the prompt.

---

## What is this project?

The **Agentic Legibility Stack (ALS)** — a reference architecture for UK government services accessed through AI agents. It exists to answer one question: *what does a government department need to publish so that an AI agent can use its services on a citizen's behalf?*

It has two sides:

1. **Citizen Experience** — a prototype of how a future GOV.UK app could work when delivered through an AI agent (a citizen describes a need in plain language; the agent handles the services).
2. **Legibility Studio** — an admin platform that shows a department what it needs to publish to make its services "legible" to agents, and where the gaps are.

This particular copy is the **department demo** — built to show the citizen experience and Legibility Studio to permanent secretaries of UK departments (Home Office, MoJ, DWP, HMRC, Cabinet Office).

*Add one or two sentences in your own voice on why this matters / what problem it really solves. The thing you'd say out loud to a colleague, not the official line.*

## Who is this for?

*Who commissioned or champions this? Who is the intended audience for the demo? Who needs to keep it alive? (See `03-STAKEHOLDER-MAP.md` for the full picture.)*

## What state is it in right now?

*One honest paragraph. Is it a working demo? A prototype? Production-ready? What works reliably, what is held together with tape? (Full detail in `02-STATE-OF-PLAY.md`.)*

As of handover it is a **demo/prototype**: a monorepo with a working citizen app, a Legibility Studio admin app, ~120 modelled government services, and supporting documentation. It is not a production system.

## If you only read one more thing...

*Point the reader at the single most important next document for them. For leadership, probably `02-STATE-OF-PLAY.md`. For someone reviving the code, probably `04-HOW-TO-RUN-IT.md` then `CLAUDE.md` in the repo root. Tell them which, and why.*

## The map of this folder

| File | What it answers |
|------|-----------------|
| `00-READ-ME-FIRST.md` | This page — orientation. |
| `01-DECISION-LOG.md` | **Why** the project is built the way it is. The most valuable file. |
| `02-STATE-OF-PLAY.md` | What's done, what's half-built, what's next, known risks. |
| `03-STAKEHOLDER-MAP.md` | Who cares, what's been promised, the politics. |
| `04-HOW-TO-RUN-IT.md` | How to actually start the demo. |
| `PLAN.md` | Chris's two-week checklist for filling all of this in. |

## Where the real detail lives (already written)

You don't need to re-read the code to understand the project, but if you want the technical ground truth it's already documented:

- **`CLAUDE.md`** in the repo root — the technical architecture, project structure, key systems, and the rules. This is thorough; trust it.
- **`docs/`** — standalone HTML documents: `index.html` (overview), `briefing-executive.html`, `reference-technical.html`, `guide-product.html`, `glossary.html`, and more.

---

*Last updated: ____  ·  Maintained by: Chris (until ____), then: ____*
