# How to Run It

*A thin pointer so the demo doesn't go dark. The detail already lives in `CLAUDE.md`; this page just makes it findable for someone who isn't a developer, and captures the few things that aren't written down anywhere.*

> **How to fill this in:** Try to run it yourself from scratch following only this page. Every place you have to "just know" something, write that thing down here. That's exactly the knowledge that vanishes when you leave.

---

## What you need first

- **Node.js and npm** installed (the project uses npm workspaces).
- An **`ANTHROPIC_API_KEY`** — the apps need this for the AI functionality. *Where does the key come from? Whose account/billing? Where is it stored — a `.env` file? Note it here (the location, not the secret itself).*
- *Anything else? A particular Node version? Access to a private repo? Note it.*

## Starting the demo (from `CLAUDE.md`)

From the repo root:

```
npm install          # first time only — installs dependencies
npm run dev          # starts all apps in dev mode
```

Then open:
- **Citizen app:** http://localhost:3106
- **Legibility Studio:** http://localhost:3101

Useful commands:

```
npm run build            # build everything
npm test                 # run all tests
npm run seed             # seed the traces database
npm run seed:services    # seed the service store
npm run capture          # capture demo screenshots
```

## Running a good demo

*The part that isn't in the code. How do you actually walk someone through it so it lands? Which persona, which journey, in what order?*

- **Best demo path:** *e.g. enter as persona Sarah Okafor → the bereavement journey ("Dot"). What's the script? What should the audience watch for?*
- **Personas available:** *which personas exist and what each is good for showing. (Demo scripts live in `apps/citizen/lib/demo-scripts/`.)*
- **What to avoid demoing live:** *any path that's flaky — steer around it.*
- **Demo mode vs. live LLM:** the `demo` mode uses scripted responses (no API key needed, fully reliable); `mcp`/`json` modes use the real model. *Which do you use in front of people, and why?*

## Where things live

*A quick orientation for someone opening the repo:*
- `apps/citizen` — the citizen demo app.
- `apps/legibility-studio` — the admin dashboard.
- `packages/` — the engine (see `CLAUDE.md` for what each package does).
- `data/services/*` — the ~120 modelled services (JSON).
- `data/decision-gates/`, `data/simulated/` — gate definitions and test personas.
- `docs/` — all the written documentation (open the `.html` files in a browser).

## If it won't run

*The gotchas you've hit. `CLAUDE.md` already flags a few (e.g. `better-sqlite3` must stay in `serverExternalPackages`; don't add `@als/evidence` to legibility-studio). Add any others you've learned the hard way.*

- ____

## Where it's deployed / hosted

*Is this only ever run locally, or is there a hosted version somewhere? Domains, hosting accounts, passwords (note where they're kept, not the secrets themselves)? The `docs/` had a password gate at one point — note how that works.*

- ____
