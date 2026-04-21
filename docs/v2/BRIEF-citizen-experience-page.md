# Brief: Citizen experience page

This document captures everything needed to build a comprehensive citizen experience documentation page for the v2 docs site. It was compiled from annotated PDF screen designs, existing documentation, and conversation with the project owner.

## What this page is

A new page (or replacement of the current `citizen-app.html`) that explains the GOV.UK citizen app in detail — how it works, what the citizen sees, and how every interaction is designed. It should be illustrated with screen designs extracted from the PDFs in `/Users/datadowns/Downloads/ALS-Screens/`.

## Source PDFs

All in `/Users/datadowns/Downloads/ALS-Screens/`:
- `Honme.pdf` — Home screen architecture, annotated (1 page)
- `Department ALS.pdf` — App structure intro: home, to-dos, agent selector, no-agent mode, topic pages, plan-mode DWP journey (9 pages in latest version, or 1 page in earlier version)
- `DWP-01.pdf` — Sarah Okafor bereavement journey, fully annotated with 13 named stages (1 page)
- `Extras.pdf` — Pages 1-2 repeat home/agent selector; Page 3 has three unannotated persona journeys: Marcus Taylor, James Whitfield, Daniel Obi (3 pages)

## High-res screen extraction method

The PDFs contain panoramic layouts with small screens. To read them:
```python
import fitz
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

doc = fitz.open("path.pdf")
page = doc[0]
mat = fitz.Matrix(3, 3)  # 3x resolution
pix = page.get_pixmap(matrix=mat)
pix.save("/tmp/output.png")
# Then crop into sections with PIL
```

pymupdf and Pillow are installed on this machine.

## Design system

Must match the existing v2 docs at `/Users/datadowns/Dev/als-dept/docs/v2/`. Key rules:
- Inter font only (Google Fonts)
- NO text-transform: uppercase anywhere
- Section numbers: zero-padded (01, 02...), same font-size as h2 (1.85rem), font-weight 400, color #6f777b
- Nav: `Agentic Legibility Stack` (links to index.html) | Citizen app | Legibility Studio | Technical | Departments | Glossary
- "Citizen app" should have class="active"
- Cabin analytics: `<script async defer src="https://scripts.withcabin.com/hello.js"></script>`
- UK English throughout
- CSS tokens: --ink: #0b0c0c; --ink-soft: #505a5f; --ink-faint: #6f777b; --surface: #fff; --surface-alt: #f8f8f7; --border: #d5d8da; --border-light: #e8e8e6; --blue: #1d70b8; --green: #00703c; --red: #d4351c; --orange: #f47738; --purple: #4c2c92; --max-w: 880px
- Nav brand is an `<a>` linking to index.html, not a `<span>`
- No "Home" link in nav — the brand name IS the home link
- nav-links use align-items: baseline with line-height: 1 on li and a elements
- Video elements need: `border: none; outline: none; background: white; -webkit-appearance: none; box-shadow: none; margin: -1px; padding: 0; clip-path: inset(1px);`

## Terminology

- "Service descriptions" NOT "artefacts"
- Four dimensions: Identity (was manifest), Eligibility (was policy), Journey (was state model), Data sharing (was consent)
- No references to "the prototype" or "JSON files" — this describes a specification, not an implementation

---

## APP INFORMATION ARCHITECTURE

### Persistent elements

**Bottom navigation bar** (always visible):
1. **Home** — returns to the home page
2. **Dot** — opens a conversation from any position in the app
3. **To do** — list of all to-do items from conversations, tick-off-able
4. **Wallet** — verified credentials and data vault

**Text input** (bottom of home page): citizen can type, speak, or upload a document

### Home screen

Greeting: "Hello, [Name]" with persona switcher (chevron)

Sections in order:
1. **Your to-dos** — citizen tasks grouped by subject (e.g. "Mini Cooper: 2 tasks, 2 in 4 months"), with individual items listed below
2. **Agent to-dos** — tasks the agent is handling (e.g. "Check Tax-Free Childcare eligibility", "Verify council tax band is correct")
3. **Topics** — personalised subset of 11 topic categories, rendered based on relevance to the citizen's data and situation. Citizen can browse and add more.
4. **Services carousel** — horizontal scrolling cards for 16 life events (Having a Baby, Death of Someone Close, etc.) with service counts
5. **Near you** — location-based local government content by postcode (e.g. bin collection)

### The 11 topic categories

1. Benefits
2. Business
3. Care
4. Driving & Transport
5. Employment
6. Health & Disability
7. Money & Tax
8. Parenting & Guardianship
9. Retirement
10. Studying & Training
11. Travel

### The 16 life events (services)

1. Having a Baby
2. Death of Someone Close
3. Getting Married
4. Retiring
5. Starting a Business
6. Buying a Home
7. Moving House
8. Losing Your Job
9. Disability or Health Condition
10. Becoming a Carer
11. Separating or Divorcing
12. Child Starting School
13. Arriving in the UK
14. Learning to Drive
15. Going to University
16. Starting a New Job

### To-do system

**Two types:**
- Citizen to-dos — things the citizen needs to do
- Agent to-dos — things Dot is handling

To-dos can be:
- Generated automatically by the platform based on date or need
- Generated by the citizen
- Expanded to reveal sub-tasks
- Swiped right-to-left to delete

**To-do page** organises by topic type (driving, benefits, family, etc.), splits citizen/agent, and has a completed history.

**Task detail card** contains:
- Title
- Related tags
- Due date
- What the agent will do
- Options: Add to calendar, Delegate to Dot, Accept task, Dismiss

### Agent brief (delegation flow)

When delegating a task to the agent, the citizen sees a structured brief:
- **Objective** — what the task is about (e.g. "Your Mini Cooper MOT expires on 22 March 2026. Book a test before then to stay legal.")
- **What Dot will do** — numbered steps (e.g. 1. Check current MOT/tax status via DVLA records, 2. Find available dates and nearby testing centres, 3. Present options for you to confirm)
- **Data the agent will access** — named fields (e.g. Vehicle registration number, Current MOT expiry date)
- **Information needed from you** — anything the agent can't get automatically (e.g. Preferred location or postcode)
- **Dot will check** — confirmation that the agent checks before acting (e.g. "Yes — before any action")
- **Confirm — delegate to Dot** / **Back** buttons

### Topic pages

Each topic has its own dedicated page with:
- Topic-specific data cards in a carousel (e.g. Driving & Transport shows vehicle cards with reg plates, MOT status, tax due dates)
- "Ask about [Topic]" button — opens a scoped conversation with the agent
- Sub-topics list (e.g. Vehicle maintenance & MOT, Road tax & SORN, Driving licence, Insurance)
- Sub-topic bottom sheets with suggested questions (e.g. "When is my MOT due and what do I need to prepare?", "What happens if my MOT has expired?")
- Your to-dos related to this topic
- Agent to-dos related to this topic (in expanded view)
- Conversation history related to this topic (in expanded view)

**Examples seen:**
- **Driving & Transport** — vehicle carousel (Mini Cooper YK21 FDM, MOT valid for 35 days, Tax due in 5 months), sub-topics with suggested questions
- **Benefits** — current benefits carousel (Child Benefit £102.40/4 weeks), proactive eligibility cards ("You may be eligible for" Tax-Free Childcare ELIGIBLE up to £2,000/year, 30 hours free childcare ELIGIBLE, Marriage Allowance CHECK up to £252/year)
- **Health & Disability** — GP surgery (Wilmslow Health Centre), NHS number, sub-topics (NHS services, PIP & disability, Mental health support)
- **Employment** — employer details (Wilmslow Primary School, Year 4 teacher, £32,500, tax code 1257L, NI number), sub-topics (Finding a job, Employment rights, Sick pay & leave)

---

## AGENT TRUST SPECTRUM

### Agent selector

Accessed by tapping the chevron next to the citizen's name. Three modes:

**DOT** (default) — Cautious and careful
- "Checks with you before every step. You stay fully in control."
- Tags: Step-by-step, Transparent, You decide
- "Verified steps — you approve every action"
- Confirmation screen: "Dot is here to help you"
- What to expect: Checks with you before every step, Explains why information is needed, You approve every action
- How Dot works: "Dot is cautious and transparent. It will guide you step by step through government services, always asking your permission before acting on your behalf. Nothing happens without your say-so."

**MAX** — Proactive and fast
- "Acts on your behalf and handles tasks in the background. Gets things done quickly."
- Tags: Proactive, Autonomous, Fast
- "Fast but autonomous — double-check actions"
- Confirmation screen: "Max is here to help you"
- What to expect: Acts on your behalf automatically, Auto-fills forms from your records, Gets things done quickly
- How Max works: "Max is proactive and fast. It will use your data to auto-fill forms, start applications, and handle tasks in the background. Always double-check what Max has done on your behalf."

**NO AGENT** — Manual mode
- "Browse services and visit GOV.UK directly. No AI, no chat, no automation."
- Tags: Manual, Direct links, You do everything
- "No AI — you browse GOV.UK directly"
- Confirmation screen: "You're in control"
- What to expect: Direct links to GOV.UK, No data shared with AI, Browse services at your own pace
- How manual mode works: "You'll access government services directly through GOV.UK. No AI agent will act on your behalf. You can switch to an agent at any time from settings."

### No-agent experience

When no agent is selected:
- All to-dos become citizen to-dos (no agent to-dos section)
- "Dot" tab in bottom nav becomes "Services" — a browsable list of services organised by life event, linking directly to GOV.UK content and forms
- Topics, to-dos, and wallet remain the same
- The rest of the experience is largely identical

---

## TWO ENTRY POINTS TO SERVICE

### 1. Conversational triage (via Dot)

Citizen opens a conversation → describes situation in natural language → agent identifies life event and relevant services → presents service cards → citizen delegates or acts → consent → fulfilment → wallet

### 2. Plan-based browsing (via Services carousel)

Citizen scrolls to Services on home page → selects a life event (e.g. "Death of Someone Close") → sees a structured plan with all services listed in priority order → selects "Start this plan" → plan acceptance → consent → fulfilment → wallet

Both converge on the same consent → fulfilment → wallet flow.

---

## SARAH OKAFOR JOURNEY — FULL ANNOTATED FLOW

### Conversational route (DWP-01.pdf annotated version)

13 named stages:

**1. Home**
Sarah clicks Dot in the bottom nav to start a conversation about her husband's death.

**2. Triage**
Conversational agent makes sense of Sarah's request, understanding which departments and which services it needs to relate to to solve her problem. It understands her intent through a number of steps and then presents back to her the most important tasks in the most important order. Sarah has typed "My husband died three weeks ago. I don't know what to do," and the agent has come back with words of reassurance. The first two tasks are to register David's death and notify all departments through the Tell Us Once service.

**3. Delegation**
By clicking the "Do this" button on each agent card, Sarah can see that the steps and the processes have been submitted.

**4. Confirmation**
Once Sarah has chosen which of the steps, tasks, and services she wants the agent to manage for her, she is presented with a confirmation card outlining what the agent will do on her behalf and giving her an opportunity to alter any of those tasks or approaches.

**5. Receipt**
Clicking Confirm and Continue, Sarah is presented with a receipt card which acknowledges the choices that she's made, time-stamps the request, and also gives her an opportunity to interrogate what personal data has been shared and on what terms. Underneath this card is also a request for more information or explanation of the next steps.

**6. Consent**
Before any of the data is actually passed from the app to services, she is finally asked to give consent for her and David's details to be shared with government departments. Each department is listed, as well as the data that is to be shared, and she has the opportunity to either agree or decline the sharing of that data.

**7. Preferences**
Selecting "I agree" gives the citizen the opportunity to make their data sharing preferences known.

**8. Terms**
The citizen can choose to set their terms so the data could be shared just this once, always in this case, or always with all departments.

**9. Fulfilment**
On completion or fulfilment, the citizen is presented with the results cards and any relevant content within them. In this case, the Tell Us Once service has been initiated with a reference number, which can be copied and pasted.

**10. Credentials**
In this case, the death certificate has been issued, which is now visible in Sarah, the citizen's, wallet.

**11. Wallet**
Here, the death certificate is visible in the wallet with data permissions shown (Legal Data — ALLOWED).

**12. Follow-on / Scrutiny**
The citizen can ask for more information, clarification, or more services at any stage by reinitiating a conversation with the agent. In this case, Sarah has asked about the bereavement payment.

**13. Payment**
Having already identified which bank account the citizen wants money paid into, Sarah receives confirmation that the bereavement support payment has been paid into her bank account, and she is also given a reference number.

### Plan-based route (Department ALS.pdf final version)

**1. Home** — Sarah scrolls to Services carousel, selects "Death of Someone Close"

**2. Plan Preview** — Selecting the service card reveals a plan. In this case, Death of Someone Close, there are eight individual services that are all relevant, organised in order of importance:

START HERE (first three essential before the rest):
1. Register the death — Register at local register office. Required before probate, Tell Us Once and bereavement payments.
2. Funeral Expenses Payment — One-off payment toward funeral costs if you are on a qualifying benefit. Must claim within 6 months of the funeral.
3. Bereavement Support Payment — If spouse/partner died, you are under State Pension age, and they had a NI record. Lump sum plus monthly payments.

AFTER REGISTER THE DEATH:
4. Guardian's Allowance — £21.75/week if raising a child both of whose parents have died (or one has died and the other is untraceable)
5. Statutory Parental Bereavement Pay & Leave — 2 weeks paid leave if a child under 18 dies or a baby is stillborn after 24 weeks of pregnancy
6. Council Tax single person discount — 25% discount if now living alone after bereavement or separation
7. Funeral Expenses Payment (duplicate? or different variant)

AFTER TELL US ONCE OR OBTAIN CERTIFICATES:
- Notify OPG of death (notify OPG when LPA holder dies, registered LPA then ceases to have effect)
- Inheritance Tax return (IHT400) if estate exceeds £325k threshold
- Cancel driving licence (only via Tell Us Once if used after a death, otherwise notify DVLA directly)
- Council Tax single person discount

IF YOU NEED TO CHALLENGE A DECISION:
- Apply for probate (required if estate exceeds £10k with most financial institutions, currently 141 weeks)

**3. Plan Acceptance** — "Start this service" initiates the sequence. The plan is structured for eligibility for services once other documents or certificates have been issued. It includes guidance on what to do if the citizen disputes a decision. Information is provided on each stage of the plan, each task card outlining what the agent is able to do on the citizen's behalf.

**4. Plan / Task Split** — "Start the service" expands the card to reveal more information about the requirements for this service and a link to start that particular service as part of the plan.

**5-8.** Consent → Preferences → Terms → Fulfilment (same flow as conversational route)

---

## OTHER PERSONA JOURNEYS (unannotated but visible)

### Marcus Taylor — Prison Leaver (MoJ)
- "I've just been released from prison and I need to sort everything out"
- Home: Benefits, Parenting & Guardianship (Chloe), Employment, Browse topics
- Journey: UC claim, bank account setup, driving licence renewal, probation compliance
- Crosses: MoJ (probation), DWP (UC), DVLA (licence)
- Ends: wallet with credentials and payment confirmations

### James Whitfield — Disabled Appellant (MoJ)
- "My PIP was turned down and my son's EHCP is stuck"
- Home: Benefits (ESA, PIP, Child Benefit), Parenting & Guardianship (Owen), Employment
- Journey: PIP mandatory reconsideration, tribunal appeal, EHCP chase, medical evidence consent
- Key: escalation to tribunal — contested interaction, not just a service request
- Ends: Blue Badge confirmed, PIP outcome £168.30

### Daniel Obi — Self-Employed (MoJ)
- "I'm self-employed and confused about my tax and I've got a client who won't pay"
- Home: to-do (Road tax due — Ford Transit), Benefits, Driving & Transport (1 vehicle), Employment
- Journey: Making Tax Digital enrolment, quarterly records, tax refund chase, civil money claim
- Key: civil money claim for unpaid invoice — commercial dispute, not benefits
- Ends: HMRC tax refund £1,000

---

## DESIGN PATTERNS EXTRACTED

### Interaction patterns

1. **Conversational triage → structured action** — Citizen speaks naturally → agent responds with empathy → surfaces structured cards (not more conversation). Conversation is input; cards are output.

2. **Progressive disclosure of complexity** — Agent doesn't dump all services at once. "There are a few things that will need to happen, but none of them need to happen right now." Complexity revealed gradually.

3. **Delegation as a first-class interaction** — Every task card has: delegate to Dot, accept it yourself, or dismiss. Not an edge case — the primary interaction model.

4. **Consent as a discrete, inspectable moment** — Standalone card with named fields, named sources, named purposes, explicit agree/decline. Not buried in T&Cs.

5. **Consent → Preferences → Terms** is a three-step flow:
   - Consent: agree or decline per department
   - Preferences: make data sharing preferences known
   - Terms: just this time / always for this life event / always with all departments

6. **Agent brief as a contract** — Before delegated action: objective, steps, data accessed, whether agent checks back. Informed delegation, not blind trust.

7. **Two-track to-do model** — Citizen to-dos and agent to-dos visually separated but in the same space. Division of labour visible.

8. **Proactive eligibility surfacing** — Topic pages show what you have AND what you could have. ELIGIBLE/CHECK badges with monetary values. Citizen discovers entitlements they didn't know existed.

9. **Follow-on / scrutiny** — Conversation is never closed. Citizen can return and ask questions at any point.

10. **Two entry points to the same outcome** — Conversational (via Dot) and plan-based (via Services carousel) both converge on consent → fulfilment → wallet.

### Design patterns

11. **Topic pages as personalised government portals** — Each topic pulls verified data (vehicles, employer, GP) and combines with to-dos, eligibility checks, sub-topics, conversation history.

12. **Outcome cards as receipts** — Structured receipts with reference numbers, registration details, dates, department branding. The evidence artefact.

13. **Service cards with temporal awareness** — Due dates, sequencing info ("needs to happen within 5 days and is the first step before everything else").

14. **Suggested questions** — Topic sub-pages offer pre-composed questions based on citizen's data and agent capabilities. Not generic FAQs.

15. **Credentials flow into wallet** — Service outputs (death certificate) become wallet items with their own data permissions.

16. **Data cascade** — Earlier service outputs become later service inputs. Citizen doesn't re-enter data.

### Capabilities

17. **Agent trust spectrum** — Three modes: Dot (supervised), Max (autonomous), No agent (manual). Trust calibration, not a binary on/off.

18. **Graceful degradation** — Entire app works without an agent. Own nav structure, service browsing via GOV.UK links. Digital inclusion by design.

19. **Cross-department orchestration** — Single conversation spans GRO, DWP, HMRC, MoJ without citizen needing to know departmental boundaries.

20. **Location awareness** — "Near you" section pulls local government content by postcode.

21. **Multi-modal input** — Text, voice, document upload from the input bar.

22. **Contested interactions** — Not just service requests — the agent helps with tribunal appeals and civil money claims (disputed relationships with government and third parties).

---

## PAGE STRUCTURE RECOMMENDATION

### Sections for the new citizen experience page:

01. **The home screen** — What you see when you open the app. To-dos, topics, services, near you. Illustrated with home screen designs.

02. **Topics** — Government organised around your life. Personalised topic pages with data, eligibility, suggested questions. Illustrated with Driving & Transport and Benefits examples.

03. **Two ways in** — Conversational triage (via Dot) and plan-based browsing (via Services). Both converge on the same flow.

04. **The conversation** — How triage works: citizen speaks, agent identifies services, presents cards. Illustrated with Sarah's bereavement opening.

05. **Plans** — The structured alternative: life event plan with services in priority order, dependencies, task split. Illustrated with Death of Someone Close plan.

06. **Delegation and the agent brief** — How the citizen delegates tasks with full transparency. Objective, steps, data, confirmation. Illustrated with MOT booking example.

07. **Consent** — The three-step flow: consent per department → preferences → terms (scope). Illustrated with Sarah's consent cards.

08. **Cards** — Form cards, consent cards, payment cards, outcome cards. Use actual card designs from the card catalogue (already embedded in current citizen-app.html).

09. **The wallet** — Credentials, data permissions, earned credentials from service completions. Illustrated with death certificate in wallet.

10. **Choosing your agent** — Dot (supervised), Max (autonomous), No agent (manual). Trust calibration. Illustrated with agent selector and confirmation cards.

11. **The to-do system** — Two tracks, task details, delegation flow, completion history.

12. **Worked example: Sarah's bereavement** — Full end-to-end journey through all stages. Already partially in current citizen-app.html.

### Existing content to preserve

The current `citizen-app.html` has good content on:
- Cards section with actual card catalogue components embedded (form, consent, payment, outcome)
- Consent anatomy (six fields)
- Wallet and three-tier data model
- Family delegation
- Sarah's bereavement worked example

Much of this should be retained and enhanced with the new screen illustrations.

### Screen illustrations needed

Extract from the PDFs as PNGs (using the pymupdf method above) and embed as images. Priority screens:
- Home screen (from Honme.pdf or Department ALS.pdf page 1)
- Topic page — Benefits with eligibility cards
- Topic page — Driving & Transport with vehicle carousel
- Agent selector with three options
- Agent brief / delegation card
- Plan preview (Death of Someone Close with 8 services)
- Consent card with department listing
- Preferences / terms selector
- Fulfilment / outcome cards
- Wallet with death certificate
- Conversation triage (Sarah's opening)

---

## FILES REFERENCE

- Current citizen app page: `/Users/datadowns/Dev/als-dept/docs/v2/citizen-app.html`
- Card catalogue (for embedding actual cards): `/Users/datadowns/Dev/als-dept/docs/v2/card-catalogue.html`
- Video clips: `/Users/datadowns/Dev/als-dept/docs/v2/clips/` (01.mp4, 02.mp4, 03.mp4)
- Screenshots: `/Users/datadowns/Dev/als-dept/docs/v2/screens/` (01.png, 02.png, 03.png)
- Illustrations: `/Users/datadowns/Dev/als-dept/docs/v2/illustrations/`
- Source PDFs: `/Users/datadowns/Downloads/ALS-Screens/`
- v2 index page: `/Users/datadowns/Dev/als-dept/docs/v2/index.html` (for design system reference)
