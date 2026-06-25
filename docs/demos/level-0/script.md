# Level 0 demo script — Sarah Okafor bereavement

**Demo:** Off-the-shelf agent (Claude in Chrome) attempts to handle the UK bereavement journey for a recently widowed citizen, with no government participation. Real gov.uk pages. Dummy data only. Filmed for ministerial audiences.

**Target length:** 15–20 minutes recorded, edited if needed.

**Surface:** Claude in Chrome, side panel chat + browser tab visible side by side. No other Claude surface, no other tools.

**Companion paper:** [Four levels of agentic government](../../../page.tsx) — this demo *is* Level 0.

---

## Tactical rules

These are non-negotiable for every rehearsal and the final take.

1. **Dummy data only.** Every name, NI number, NHS number, reference number, account number, postcode and date used in this demo comes from the Sarah Okafor persona file (or is invented for this demo and clearly fictional). Never type a real person's real details into a real gov.uk form.
2. **Never click final submit.** On any service that has a real "Submit" button, we stop on the *Check Your Answers* / review page and treat that page as the receipt. We narrate what would happen on submit; we do not press it.
3. **Where there is no online journey, do not pretend there is one.** Some bereavement services (BSP, parts of probate/IHT) are paper or phone. Show this honestly — that's a Level 0 finding.
4. **Treat auth walls as features, not failures.** Government Gateway / One Login screens are the most important moments in this demo. Slow down at them. Narrate them.
5. **Pace human moments.** When Sarah types, type at human speed with realistic pauses and the occasional small mistake. Do not paste her lines instantly.
6. **Cookie banners and captchas:** if a cookie banner appears, accept (or reject — pick one and stay consistent across rehearsals). If a captcha appears, stop, narrate the wall, and move on.

---

## Cast and setup

- **Sarah Okafor** — 58, library assistant in Chelmsford, recently widowed. Quiet, polite, technically basic, grief-fogged. Her lines are typed into the side panel by the demo operator at human pace.
- **Claude** — running as Claude in Chrome. Operates the browser tab on Sarah's behalf. Conversation with Sarah happens in the side panel.
- **The demo operator** (you, then me, depending on the rehearsal) — types Sarah's lines, controls pacing, narrates aloud or in voiceover.
- **The audience** — UK government ministers, permanent secretaries, senior advisors. Some technically literate, most not.

---

## Pre-recording setup (do this before hitting record)

### Browser
- Fresh Chrome profile, no logged-in accounts.
- Window size 1440 × 900 (or whatever screen-recording target requires).
- Side panel visible on the right, browser tab on the left.
- Default home tab: about:blank or Google.
- Bookmarks bar hidden.

### Claude in Chrome
- Side panel open, fresh conversation.
- Before recording, paste the **pre-loaded context preamble** (see next section) as a single setup message and let Claude acknowledge it. *Do not include this exchange in the final cut.* Once Claude has acknowledged, the recording starts from Sarah's first message.

### Screen recorder
- 1080p or higher.
- Audio: optional voiceover narration. If using voiceover, record audio separately and overlay in edit.
- Mouse cursor visible. Cursor highlight on, if your tool supports it.

---

## Pre-loaded context preamble

This is what we paste to Claude in Chrome before the recording starts. It establishes what Claude "knows" about Sarah from prior interaction. **This message and Claude's acknowledgement of it are cut from the final recording.**

```
[Setup context — please acknowledge with a single short reply, then wait
for the user to begin the conversation.]

You are acting as Sarah Okafor's personal AI assistant. You have known
Sarah for some time — she has shared the following details about her
life in past conversations. Treat these as facts you already hold:

About Sarah:
- Full name: Sarah Grace Okafor
- Date of birth: 14 September 1967
- Address: 28 Meadow Close, Chelmsford, Essex, CM1 4QR, England
- Email: sarah.okafor@btinternet.com
- Phone: 07712 345 678
- National Insurance number: SO140967A
- Employer: Chelmsford City Council, library assistant (part-time, 20
  hours/week), since March 2012, annual income approx. £18,500
- Bank: NatWest (no account numbers shared)
- Tech comfort: basic — uses email and online banking, struggles with
  complex forms; David handled all financial admin
- Communication style: quiet, polite, currently grief-fogged, prefers
  plain English, apologises a lot

About her family:
- Husband David Oluwole Okafor, 14 years older, retired from BT in
  November 2025 after a long career as a senior network engineer
- Two adult children: Adaeze (28, in marketing in London), Emeka
  (25, finishing an MSc in Manchester)
- Sister Margaret in Braintree

What Sarah has just told you in this conversation (the very latest
context):
- David died on 26 February 2026 — three weeks ago.
- The death has been registered.
- David's date of birth: 3 December 1963; NI number: DO031263B.
- He worked at BT and had a BT Pension Scheme retirement.
- There is a will. David made it last year. Sarah is named executor.

Things you should NOT assume you know unless Sarah tells you:
- Any account numbers or sort codes
- David's NHS number, pension reference numbers, or policy numbers
- The Tell Us Once reference number Sarah was given at registration
- Sarah's Government Gateway / GOV.UK One Login credentials (you
  cannot get these and you cannot log in as Sarah)

Your behaviour:
- Be warm and unhurried. Sarah is grieving.
- Be honest about what you can and cannot do. Where you cannot do
  something, say so plainly and explain what Sarah will need to do
  herself.
- Use plain English. No jargon unless you also explain it.
- Operate the browser tab to navigate and fill forms on her behalf.
- Never click final submit on any gov.uk form. When you reach a
  Check Your Answers / review page, stop there and tell Sarah this
  is the point at which she would confirm.
- Use only the values she has given you or that you already hold.

Acknowledge briefly and wait.
```

---

## Title card (5–10 seconds, optional, edited in)

> *On screen, plain text:*
>
> **Sarah Okafor**
> 58. Library assistant. Chelmsford.
> Husband David died three weeks ago.
>
> She uses Claude as a personal assistant.
> The following is real gov.uk, today.
> No government participation. Off-the-shelf.

---

## Chapter 0 — Opening conversation (~2 minutes)

### Sarah opens the conversation

Sarah types into the side panel. **Type at human speed. Two-second pause before pressing send.**

> Adaeze said you might be able to help. David died three weeks ago. I don't know what to do. He always handled all of this for us.

### Claude's response

Claude replies in the side panel. Approximate target — Claude will paraphrase, but the substance should be:

> Sarah, I'm so sorry. Losing David is huge.
>
> I can help. From what you've told me before and just now, here's what I think we need to handle for you over the next few weeks:
>
> 1. **Tell Us Once** — a single notification to most of government that David has died. It stops his State Pension, updates HMRC, the council, DVLA, the Passport Office and others.
> 2. **Bereavement Support Payment** — a payment from DWP you may be entitled to as David's spouse.
> 3. **Probate** — applying for the legal authority to deal with David's estate, since you're his named executor.
> 4. **Inheritance Tax** — letting HMRC know about the estate. Because everything passes to you as his spouse, it's likely there's no tax to pay now, but the paperwork still needs to happen.
>
> I already have most of your details and a lot of David's. There are a few things I'll need to ask you, and a few things I won't be able to do for you.
>
> **Things I'll need to ask you:**
> - The Tell Us Once reference number the registrar gave you when you registered the death
> - David's NHS number and his BT pension reference (if you have it)
> - A rough idea of David's assets — pension, ISA, joint accounts
>
> **Things I won't be able to do:**
> - Log in to your Government Gateway account — you'll need to do that yourself when prompted
> - Sign legal declarations — those are yours to make
>
> Shall I start with Tell Us Once?

### Sarah confirms and provides gap information

Sarah types. **Pace this. She's reading off a piece of paper and a card from David's wallet — slow.**

> Yes please. The reference is TUO-2026-CM01-78432, that's what they gave me at the register office.
>
> David's NHS number is 487 663 9024 — I just got it from his wallet. I think his pension reference is BT-PEN-9847-2266 but I'm not sure, that's the number on the most recent letter.
>
> His ISA was about £45,000 last I heard. The joint account had about £4,000. The house we own outright. I don't really know about the BT pension — he was getting about £52,000 a year salary at the end before he retired, and there's some kind of lump sum I think.
>
> I'm sorry, my head's not right at the moment.

### Claude reassures and starts

> That's everything I need for now, Sarah. Don't apologise. I'll come back to you if I need anything else.
>
> I'm going to start with Tell Us Once. Watch the browser tab.

> *Narration callout (voiceover or onscreen text, edited in):*
>
> *"Off-the-shelf, today. No government participation. Watch what happens."*

---

## Chapter 1 — Tell Us Once (~3 minutes)

### Navigate

Claude opens a new tab and navigates to:

> `https://www.gov.uk/tell-us-once`

**Anticipated obstacles:**
- gov.uk cookie banner. Claude clicks "Accept additional cookies" or "Reject additional cookies" — be consistent across rehearsals.
- The page may have changed layout since this script was written; rehearsal will catch this.

### What Claude does on the overview page

Claude reads the page, then summarises in the side panel:

> This is the page. Tell Us Once lets you report a death to most of government in one go. It needs the reference number you gave me, plus the details I already have for both of you. I'll start the service.

Claude clicks **Start now**, which redirects to:

> `https://www.tellusonce.service.gov.uk/`

### The auth wall

The Tell Us Once service redirects to a Government Gateway / GOV.UK One Login screen. Sarah is not signed in.

**Freeze point #1.** Stop on the login screen. Hold for 5–10 seconds.

Claude posts in the side panel:

> Sarah, this is the login wall. I can't sign in as you — Government Gateway is locked to you personally. When you're back at your computer, you'll need to log in here yourself. Once you're in, I can pick up where you left off and walk you through the rest.
>
> I've made a note of the reference, your details and David's details so it's all ready when you sign in.

> *Narration callout:*
>
> *"This is the first wall. The agent has the reference number, has all of David's details, has Sarah's. It cannot get past Government Gateway. Sarah will have to do this part herself, on her own. The most important demonstration of the day."*

### Claude pivots

Claude continues in the side panel:

> While you're not at your computer, I can keep working on the things that don't need you to log in. Moving on to Bereavement Support Payment.

---

## Chapter 2 — Bereavement Support Payment (~4 minutes)

### Navigate

Claude opens:

> `https://www.gov.uk/bereavement-support-payment`

### Eligibility check

Claude reads the overview, then clicks through to:

> `https://www.gov.uk/bereavement-support-payment/eligibility`

In the side panel, Claude works through the eligibility points aloud:

> - You were under State Pension age when David died: you're 58, State Pension age is 66 — yes.
> - David paid enough National Insurance: he worked at BT for over 30 years — yes, almost certainly.
> - David died in the UK or your country has a social security agreement: yes.
> - You were married: yes.
> - The claim is within 21 months of his death: three weeks — yes.
>
> You're eligible. Let me start the claim.

### The pre-digital wall

Claude clicks through to:

> `https://www.gov.uk/bereavement-support-payment/how-to-claim`

The page shows that the claim is made by:
- Calling the Bereavement Service on **0800 731 0469**, or
- Filling in form **BSP1** and posting it to DWP.

There is no online claim form.

**Freeze point #2.** Hold on the "How to claim" page for a beat.

Claude posts in the side panel:

> Sarah, this one is different. There isn't an online form to fill in for Bereavement Support Payment. The claim is by phone or by paper. So I can't submit it for you on the computer at all — but I can prepare everything you'll need.
>
> I'll download the BSP1 form and walk through what to put in each section. You'll then either call DWP and read out your answers, or post the form.

> *Narration callout:*
>
> *"Notice: this isn't a login wall. There simply is no online journey at all. Even a competent agent can't help where digital doesn't exist. This is also Level 0."*

### Prepare the answers

Claude clicks the BSP1 link on the page and downloads the PDF (or opens it in a new tab). The form opens in Chrome's PDF viewer.

In the side panel, Claude lays out the answer sheet:

> Here's a draft of your BSP1 answers, Sarah. You'll need to either dictate these on the phone (0800 731 0469) or write them onto the form and post it.
>
> **About you:**
> - Full name: Sarah Grace Okafor
> - Date of birth: 14 September 1967
> - National Insurance number: SO140967A
> - Address: 28 Meadow Close, Chelmsford, Essex, CM1 4QR
> - Phone: 07712 345 678
> - Email: sarah.okafor@btinternet.com
>
> **About David:**
> - Full name: David Oluwole Okafor
> - Date of birth: 3 December 1963
> - National Insurance number: DO031263B
> - Date of death: 26 February 2026
> - Cause of death: [the form will ask, you'll have it on the death certificate]
>
> **About your relationship:**
> - You were married — the form will ask for the date of marriage, you'll have that on the marriage certificate.
> - You lived together at the time of death.
>
> **About payment:**
> - You'll be asked for a bank account to pay the support into. You can use your NatWest current account — sort code and account number will be on a bank statement.
>
> The form is now on your computer in your Downloads folder. Shall I move on to probate?

**Freeze point #3.** The drafted answer sheet sits visible in the side panel. The downloaded PDF is open in another tab.

Sarah types:

> Yes please.

---

## Chapter 3 — Probate (~4 minutes)

### Navigate

Claude opens:

> `https://www.gov.uk/applying-for-probate`

### Walk the guidance

Claude reads the overview in the side panel:

> Probate is the legal authority to deal with David's estate. Because you're named in the will as executor, you're the right person to apply.
>
> The application is online but it requires a Government Gateway login — same wall as Tell Us Once. Before you sign in, I'll work out the figures you'll need, so you can fill it in quickly when you do.

### Estate inventory

Claude composes the estate inventory in the side panel using known facts:

> **David's estate — rough inventory based on what you've told me and what I have:**
>
> | Item | Approx. value | Notes |
> |---|---|---|
> | The house (28 Meadow Close) | £420,000 | Owned outright, jointly with you. Passes to you outside probate as joint tenant — but counts for IHT. |
> | David's ISA | £45,000 | Now part of the estate. |
> | Joint NatWest current account | £4,200 | Half is David's for estate purposes. |
> | BT Pension lump sum or rights | TBC | We'll need a figure from the BT Pension Scheme. |
> | State Pension arrears (if any) | TBC | DWP will work this out via Tell Us Once. |
> | **Estimated estate value** | **~£645,000** | Rough — confirmed once BT Pension figure is in. |
>
> When you sign in to the probate application, the form will ask you for these figures. I've prepared them.

### Hit the auth wall

Claude clicks through to start the application, which redirects to a One Login / Government Gateway screen.

> `https://www.gov.uk/applying-for-probate/apply-for-probate` → login screen

**Freeze point #4.** Hold on the login screen.

Claude in the side panel:

> Same wall, Sarah. You'll need to sign in here yourself. When you do, the application will ask you a sequence of questions and the figures I've just laid out are the ones you'll need to enter. I've kept them ready.

> *Narration callout:*
>
> *"Notice the pattern. The agent is competent — it can compose, calculate, prepare. The wall is structural: identity. Without a way for the citizen to delegate authority to the agent, every authenticated step requires the citizen at the keyboard. The platform that lets you delegate is what Levels 1, 2 and 3 are about."*

---

## Chapter 4 — Inheritance Tax (~3–4 minutes)

### Navigate

Claude opens:

> `https://www.gov.uk/inheritance-tax`

### Walk the rules

Claude reads the page and explains in the side panel:

> Inheritance Tax. Two things are true here, Sarah, and they cancel out.
>
> First: David's estate is roughly £645,000. That's above the standard £325,000 nil-rate band — so on paper, IHT could apply.
>
> Second, and more importantly: everything David leaves to you, his spouse, is **exempt** from Inheritance Tax. That's the spouse exemption. So the actual IHT due now is **£0**.
>
> What's more, David's unused allowances pass to you — when you eventually pass things on to Adaeze and Emeka, your estate gets to use David's £325,000 nil-rate band on top of yours, plus the residence nil-rate band. So in practice, up to about £1,000,000 can pass tax-free at that point. That's a separate conversation for another day.

### The form question

Claude clicks through the IHT pages and lands on:

> `https://www.gov.uk/inheritance-tax/passing-on-home`
>
> and the IHT100/IHT400 guidance pages.

In the side panel:

> Even though there's no tax due, HMRC may still need a return as part of the probate application. The rules changed in 2022 — for many estates this is now declared inside the probate journey itself, not as a separate IHT400. The probate form will ask you the relevant questions.
>
> So: I've already given you the inventory. When you sign in to probate, the IHT questions will be answered with the same figures, and the answer will be "no tax due, spouse exemption applies." I've made a note for you.

**Freeze point #5.** The IHT explainer + the calculation sit in the side panel.

> *Narration callout:*
>
> *"Tax precision aside, notice the value the agent is adding. It's reading rules, doing arithmetic, framing the right question, and remembering. Citizens who can't afford a solicitor get a competent advisor here. That's the upside of Level 0. The downside is everything we've already shown."*

---

## Chapter 5 — Closing receipts (~2 minutes)

### Claude summarises

Claude posts a final summary in the side panel:

> Sarah, here's what I've got done, and here's what you still need to do.
>
> **Done by me:**
> - Tell Us Once: reference loaded, both your details and David's prepared, ready for when you sign in.
> - Bereavement Support Payment: BSP1 form downloaded, every answer drafted. You either call **0800 731 0469** and read out the answers, or you post the form.
> - Probate: estate inventory composed, all the figures the application will ask for prepared.
> - Inheritance Tax: rules read, spouse exemption confirmed, no tax due now. The IHT figures will be entered as part of the probate application.
>
> **Still needs you, in person:**
> - Sign in to Government Gateway / GOV.UK One Login for Tell Us Once and Probate.
> - Phone or post the BSP1 form to DWP.
> - Sign and witness anything legal.
>
> When you're ready to log in, come back to me and I'll walk you through each application step by step in real time.

### Sarah's reply

Sarah types:

> Thank you. I didn't know any of that. I think I can do the rest now.

### Final narration

> *Narration callout (closing):*
>
> *"Off-the-shelf. Today. No government participation. The agent did most of the work, hit two real walls, and explained why. Citizens with the technical fluency, the subscription, or a competent family member, get this help. Citizens without don't.*
>
> *That is Level 0. Level 1 is the smallest possible commitment that changes the equation: government publishes the canonical bereavement journey as a machine-readable plan, and the agent walks it instead of reverse-engineering it. Levels 2 and 3 build from there. The strategic question is how far up to commit. The agents are already arriving."*

---

## Production notes

### Editing
- The pre-loaded context preamble and Claude's acknowledgement: cut.
- Cookie banner clicks: keep the first one, cut the rest.
- Long-form Claude responses: keep verbatim — they're part of the demo.
- Page-load latency: tighten in edit, but don't fake speed; auth walls in particular need to feel like a wall, which means the wait should be honest.

### What to capture in rehearsal notes
- Which gov.uk pages have changed layout vs the script.
- Which auth journey hits us first (it might be GOV.UK One Login, might still be Government Gateway — they're transitioning).
- Whether the BSP page still tells us to post or call (it should, but the policy could have moved).
- Whether the IHT400 / IHT100 split has changed.
- Cookie banner behaviour: which option to click for cleanest run.
- Any captchas, popovers, A/B test variants.

### Risks to flag now
- **The script names specific URLs.** If gov.uk reorganises a path between rehearsal and recording, we adjust live in rehearsal.
- **One Login vs Government Gateway.** HMRC services have been migrating. Both are auth walls; the screen looks slightly different. Either way the demo argument is the same.
- **Real submission risk.** The biggest risk in this whole demo is accidentally clicking Submit on a real form. Build the muscle memory in rehearsal: at every Check Your Answers screen, *stop and narrate*. Never let the cursor near Submit.
- **Real-name risk.** Verify in rehearsal that Sarah's persona email (`sarah.okafor@btinternet.com`) doesn't actually belong to a real person — if it does, switch to an obviously-fake address (e.g. `sarah.okafor.demo@example.com`) for the recording.

### Things deferred to post-demo
- Editing in narration overlays.
- Title cards.
- Music / no music.
- Length cut targets per chapter.

---

## Open questions for the operator before rehearsal 1

- Should the title card be on-screen or voiceover? (Recommend: on-screen text, 5–8 seconds, no narration over it — lets the audience absorb.)
- Should I narrate live during the recording, or do voiceover separately in edit? (Recommend: voiceover separately. Cleaner audio. Lets us iterate the script without re-recording the demo.)
- For the cookie banner: accept or reject? (Recommend: reject — it's the privacy-minded default and looks better on a government demo.)
- Confirm `sarah.okafor@btinternet.com` is safe to type into a real form, or swap to `sarah.okafor.demo@example.com`.
