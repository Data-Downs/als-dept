# State of Play & Roadmap

*Where things actually stand, and what you'd do next. Be honest about what's solid and what's held together with tape — a successor inheriting false confidence is worse off than one who knows the rough edges.*

> **How to fill this in:** I've pre-filled what the code and recent git history show. Your job is to correct anything wrong, fill the blanks, and — most importantly — add the **roadmap** and **known gaps**, which only you hold.

---

## What exists today (verified 2026-06-25)

**Four apps** (only the first two are deployed):
- `apps/citizen` — the citizen-facing demo app (Next.js, port 3106). Chat-led, with wallet, consent, life-event plans, decision gates, inline service cards. **Deployed** → `als-citizen.chris-8ab.workers.dev` (live, 200).
- `apps/legibility-studio` — admin dashboard for services, traces, and gap analysis (Next.js, port 3101). **Deployed** → `als-studio.chris-8ab.workers.dev` (live, 200).
- `apps/publish` — service authoring/publishing UI (Next.js, port 3107): create a service, edit artefacts, version, publish, preview per channel. **Local-only — not in the deploy pipeline.** This is the "platform" side (DB-backed publishing) of the prototype-vs-platform split.
- `apps/gov-web` — a GOV.UK web renderer over the published artefacts (Next.js, port 3108): home, service pages, a `Start now` flow, and plan pages. **Local-only — not in the deploy pipeline.** Newest addition (commit `a2118f6`).

**Eleven packages:** adapters, evidence, identity, legibility, mcp-server, personal-data, **publish-generators** (artefact generators: `generateMcp`, `generateOpenApi`, `generateCatalogue`, `generateHtml`), runtime, schemas, service-graph, service-store.

**Data:** **113** modelled services in `data/services/` across DWP, HMRC, Home Office, HMCTS, GRO, DVLA/DVSA, NHS, local authorities, OPG and others. 21 personas in `data/simulated/users/` (Sarah Okafor is the lead demo persona — bereavement). One life event (bereavement) has a full decision-gate definition in `data/decision-gates/`; the framework supports 16.

**Deploy:** GitHub Actions (`.github/workflows/deploy.yml`) on push to `main` — OpenNext → Cloudflare Workers. Studio deploys first (other apps depend on it) and then seeds personas into D1 via `POST /api/v1/seed-personas`; citizen deploys after. CI runs `npm test` and gates both deploy jobs on it passing. `publish` and `gov-web` are **not** wired into this workflow.

**Docs:** an extensive `docs/` folder (executive briefing, technical reference, product guide, glossary, life-events catalogue, personas, and more), plus the April 2026 Word briefings.

## What works reliably

*Which parts can you demo without holding your breath? What's genuinely solid?*

- **The citizen demo on the scripted path.** Sarah Okafor's bereavement journey (demo mode) is the load-bearing demo: chat → life-event triage → decision gate → silent plan creation → plan cards → service completions → outcome cards → wallet credentials. It runs scripted (no live LLM), so it's reliable for a permanent-secretary audience.
- **The Legibility Studio.** Service list, per-service artefact view, gap analysis, and the evidence/ledger views all work against the live citizen API.
- **Both deployed apps.** CI has been consistently green and both workers return 200. Deploy on push to `main` is reliable.
- **The artefact model.** 113 services modelled with manifest/policy/state-model/consent; `publish-generators` turns these into MCP, OpenAPI, catalogue and HTML outputs, with unit tests.

## What's half-finished or fragile

- **`publish` app (port 3107) — local-only.** This is the platform-side authoring UI (the DB-backed publishing direction). It's not in the deploy pipeline and hasn't been hardened the way the two deployed apps have. Treat as a working prototype of the *target* operating model, not a shipped surface.
- **`gov-web` app (port 3108) — local-only, newest.** The GOV.UK web renderer over published artefacts. Just added; least battle-tested of the four. Not deployed.
- **The plan layer (commit `69dcb02`).** Cross-service journeys published as artefacts. New; exercised via the bereavement journey but only one life event has a full decision-gate definition, so the plan layer is effectively proven against one case.
- **Live (non-demo) chat modes.** `json` and `mcp` modes call the real orchestrator + LLM. They work but are far less rehearsed than demo mode and depend on `ANTHROPIC_API_KEY`. The polished demo path bypasses them entirely.
- **Prototype vs platform.** `data/services/*` JSON files are the prototype's source of truth; the `publish` app is the platform direction (DB-backed). These are **not** reconciled — don't migrate piecemeal.

## Known gaps, bugs, and risks

- **Local test failure is a red herring — but verify in CI, not locally.** `npm test` fails locally on macOS (`localStorage.clear is not a function`, 22 citizen tests) due to a jsdom/workspace-hoisting quirk. The same suite **passes in CI** (the source of truth) and deploys have stayed green. Don't chase this locally; trust the CI run.
- **Three commits ahead of `main` had not been through CI as of this writing** (plan layer, gov-web, 113-service embed). Merging to `main` runs them through CI for the first time — watch that run.
- **Demo mode is scripted and persona-specific** (`apps/citizen/lib/demo-scripts/`). Off-script prompts in demo mode won't behave. For a live audience, stay on the rehearsed Sarah Okafor path or switch to `json`/`mcp` mode knowingly.
- **One life event is fully gated (bereavement).** The other 15 are framework-supported but not authored to the same depth. Don't demo an ungated life event end-to-end.
- **`publish` and `gov-web` are not deployed** — they only exist on localhost. A successor expecting them online will be surprised.

## Roadmap — what you'd do next

*Derived from `design-studio-project-brief.md` ("The Diagonal") and `interview-discussion-guide.md` — confirm/adjust, this is the bit only you hold.*

**Next (the obvious immediate steps):**
- Run the stakeholder interviews using the discussion guide; synthesise onto the commission × provision map.
- Build the **single configurable exemplar** that toggles across three interaction futures: *dissolved* (fully conversational), *augmented app* (today's app + new capabilities), *hybrid* (conversational with task/plan/credential cards). The existing citizen app is the running start.
- Work the **two capability-composition cases**: letter/mailbox decomposition (know → wallet/credential, do → time-bound task) and chat → planning (planning as a capability extension of chat, not a separate product).

**Later (bigger bets):**
- The **sequencing / penny-drop note**: sort the live GOV.UK roadmap into skeuomorphic ports (mailbox-as-inbox, tabs, folders, feed) vs genuine agentic primitives (plan, task, credential/wallet, render-on-demand). Build primitives first.
- Package the **templates and method** (Plan schema, capability-composition model, terminology, scenario frames) so a standing studio starts from a tested kit.
- Author the other 15 life events to bereavement depth; reconcile the prototype JSON store with the `publish` platform.

**Someday / maybe (ideas worth not losing):**
- Deploy `publish` and `gov-web` so the full provision→commission loop is demonstrable online.
- The three provision scenarios as narrative diagrams (full-conformance / patchy / rogue state).

## Decisions a successor will face soon

- **Project, not org.** The Diagonal brief deliberately scopes this as a focused 4-week design-led provocation (Chris leading, Alex Grey collaborating), explicitly *not* standing up a studio team. A successor must decide whether to honour that framing or absorb it into a standing team — the templates are built to enable the latter.
- **One app vs many; opening to third-party agents.** The two anchor decisions in the interview guide. The work informs them; it doesn't make them. User testing is still required before anything commits to delivery.
- **Prototype → platform cutover.** Whether/when to migrate `data/services/*` JSON into the `publish` app's DB-backed model. Don't do it piecemeal.

## Test & quality status

- `npm test` runs Vitest across packages via Turbo. **Passing in CI** (the authoritative signal); the citizen suite fails locally on macOS only — see the red-herring note above.
- Coverage is meaningful for packages (`publish-generators`, runtime, schemas, legibility) and the citizen store/components/API routes. It is thin-to-absent for the two undeployed apps (`publish`, `gov-web`).
- Never trust a green/red `npm test` run on a local mac for the citizen app — check the GitHub Actions run instead.
