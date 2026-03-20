/**
 * James Whitfield — Disabled Appellant scripted journey.
 *
 * 4-turn conversation: PIP appeal + EHCP struggle -> consent -> PIP won + blue badge -> EHCP issued.
 * Turn 3 (consent response) MUST precede Turn 2 (affirmatives) in the array
 * because submitConsent() sends a message containing "proceed".
 */

import type { ScriptedEntry } from "../demo-data";

export const JAMES_WHITFIELD_CHAT: ScriptedEntry[] = [
  // ── Turn 1: Opening — PIP turned down, EHCP stuck ──
  {
    patterns: [
      /pip.*turned down/i,
      /pip.*rejected/i,
      /ehcp.*stuck/i,
      /son.*ehcp/i,
      /pip.*ehcp/i,
      /turned down/i,
      /what.*help/i,
      /don't know what to do/i,
    ],
    response: {
      response: `I can see what's going on, James, and I want to help you get both of these sorted.

**Your PIP claim**
Your mandatory reconsideration has been pending since 10 February. That means DWP are reviewing the decision — but we don't have to just wait. I can put together a stronger evidence package using your MS nurse letter, your neurologist's report, and a daily living diary. If the reconsideration doesn't go your way, I can move straight to a tribunal appeal.

**Owen's EHCP**
His application was filed on 10 November 2025. The local authority has a statutory 20-week deadline — that's **6 April 2026**, only weeks away. They're currently in week 18, which means they should be finalising the plan now. I can chase the SEND team and make sure it's not stalled.

Which would you like to tackle first — the PIP appeal or Owen's EHCP?`,
      reasoning:
        "James has two urgent issues: PIP mandatory reconsideration pending since 2026-02-10, and EHCP for Owen filed 2025-11-10 with statutory deadline 2026-04-06 (week 18 of 20). The PIP outcome affects his Motability car (needs enhanced mobility). Being practical and direct — James's communication style is no-nonsense. Asking which to tackle first gives him control.",
      tasks: [],
      conversationTitle: "PIP appeal and Owen's EHCP",
    },
  },

  // ── Turn 3: After consent — PIP appeal won + Blue Badge ──
  // MUST come before Turn 2 (affirmatives) because submitConsent() sends a
  // message containing "proceed" which would otherwise match Turn 2's patterns.
  {
    patterns: [
      /reviewed all consent/i,
      /Granted:.*Share/i,
    ],
    response: {
      response: `That's done, James. I've submitted the evidence package and the reconsideration has come back in your favour.

**PIP appeal won** — You've been awarded enhanced daily living and enhanced mobility:
- Enhanced daily living: **£108.55/week** (up from £72.65)
- Enhanced mobility: **£75.75/week** (new award)
- Back-payment: **£2,902.90** (26 weeks of the difference, paid to your Halifax account)

**Your Motability car is secured** — the enhanced mobility award means your agreement continues.

I've also arranged a **Blue Badge** for you — it's valid for 3 years and means you can park in disabled bays. You'll see the confirmations below.

When you're ready, say the word and I'll chase Owen's EHCP.`,
      reasoning:
        "Consent granted. Submitting medical evidence (MS nurse letter, neurologist report, daily living diary) to DWP for the mandatory reconsideration. The outcome: PIP enhanced daily living £108.55/wk + enhanced mobility £75.75/wk. Back-payment calculation: (£108.55 - £72.65) + £75.75 = £111.65/wk increase × 26 weeks = £2,902.90. Motability car depends on enhanced mobility — now secured. Also triggering Blue Badge as James qualifies automatically with enhanced mobility PIP.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "dwp-pip",
          hints: {
            payment_amount: "184.30",
            payment_frequency: "Weekly — enhanced daily living £108.55 + enhanced mobility £75.75. Back-payment: £2,902.90 (26 weeks)",
            first_payment_date: "2026-03-27",
          },
        },
        {
          serviceId: "la-blue-badge",
          hints: {
            entitlement_amount: "Blue Badge",
            entitlement_period: "3 years — valid until March 2029",
            employer_notified: "Automatic qualification via PIP enhanced mobility",
          },
        },
      ],
    },
  },

  // ── Turn 2: PIP / appeal — triggers consent card ──
  {
    patterns: [
      /pip/i,
      /appeal/i,
      /the pip/i,
      /benefit/i,
      /disability/i,
      /motability/i,
      /yes/i,
      /please/i,
      /go ahead/i,
      /start/i,
      /ok/i,
    ],
    response: {
      response: `To strengthen your mandatory reconsideration, I need to share medical evidence with DWP on your behalf. This includes:

- **MS nurse letter** — confirms your relapsing-remitting MS and current relapse
- **Neurologist report** — details your condition, mobility limitations, and prognosis
- **Daily living diary** — documents how MS affects you day to day (fatigue, pain, mobility)

This evidence will be submitted to the DWP PIP assessment team to support your claim for enhanced rates.`,
      reasoning:
        "James chose PIP first. To submit a stronger mandatory reconsideration, I need consent to share his medical evidence with DWP. Being explicit about what's shared and why — transparency is critical for trust, especially for someone who's already been knocked back by the system.",
      tasks: [],
      conversationTitle: null,
      consentRequests: [
        {
          id: "consent-pip-medical-evidence",
          description:
            "Share medical evidence with DWP to support your PIP mandatory reconsideration",
          data_shared: [
            "ms_nurse_letter",
            "neurologist_report",
            "daily_living_diary",
            "condition_details",
            "mobility_assessment",
          ],
          source: "NHS medical records and your daily living diary",
          purpose:
            "Submit evidence to DWP PIP assessment team for mandatory reconsideration of your enhanced rate claim",
          duration: "one-time",
          required: true,
        },
      ],
    },
  },

  // ── Turn 4: EHCP for Owen ──
  {
    patterns: [
      /owen/i,
      /ehcp/i,
      /school/i,
      /son/i,
      /education/i,
      /send/i,
      /what about/i,
    ],
    response: {
      response: `I've chased the SEND team and Owen's EHCP has been finalised.

**Education, Health and Care Plan issued** for Owen Whitfield. The plan names his school in Rotherham with additional support confirmed — including a teaching assistant, occupational therapy sessions, and a sensory break space.

The statutory deadline was 6 April, so this is just within time. The plan is legally binding — the school must provide everything listed in it.

You'll see the confirmation below. If you ever need to review or amend the plan, just ask.`,
      reasoning:
        "Owen's EHCP application was filed 2025-11-10, statutory deadline 2026-04-06 (20 weeks). We're in week 18. Chasing the LA SEND team to finalise. The EHCP names Owen's school (derived from address city — Rotherham). Additional support includes TA, OT, and sensory space — typical for an 8-year-old with additional needs. The plan is legally binding under the Children and Families Act 2014.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "la-send-ehc",
          hints: {
            application_reference: "EHCP for Owen Whitfield",
            decision: "Education, Health and Care Plan issued — additional support confirmed",
            next_steps: "Plan names Owen's school in Rotherham with TA, occupational therapy, and sensory break space. Legally binding under the Children and Families Act 2014.",
          },
        },
      ],
    },
  },

  // ── Catch-all for James ──
  {
    patterns: [/.*/],
    response: {
      response: `I'm here to help, James. Here's what I can assist with:

- **PIP appeal** — Strengthen your mandatory reconsideration with medical evidence
- **Owen's EHCP** — Chase the local authority to finalise his Education, Health and Care Plan
- **Other support** — Check what else you and your family might be entitled to

What would you like to start with?`,
      reasoning:
        "James's message didn't match a specific step. Offering the main paths: PIP appeal and EHCP. Keeping it simple and action-oriented.",
      tasks: [],
      conversationTitle: "PIP appeal and EHCP support",
    },
  },
];
