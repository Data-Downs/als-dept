/**
 * Priya Anand — New Mum Struggling with Money scripted journey.
 *
 * 5-turn conversation: childcare costs → consent → TFC + 30hrs + FSM →
 * Universal Credit top-up → Sure Start Maternity Grant.
 * Each completion step triggers tangible outcome cards.
 */

import type { ScriptedEntry } from "../demo-data";

export const PRIYA_ANAND_CHAT: ScriptedEntry[] = [
  // ── Turn 1: Opening — struggling with money, young children ──
  {
    patterns: [
      /struggling.*money/i,
      /can't afford/i,
      /baby.*school/i,
      /4.?year.?old.*school/i,
      /starting school/i,
      /struggling/i,
      /help.*money/i,
      /hard.*money/i,
      /tight/i,
    ],
    response: {
      response: `I can see things are tight, Priya, and I want to help. Looking at your situation, there's quite a lot you're entitled to that nobody's told you about.

Shall I start with the biggest saving first?`,
      reasoning:
        "Priya earns £14,200/yr as a TA, partner Dev earns £24,500/yr as a delivery driver. Combined £38,700. Two children: Meera (4, starting school Sept 2026) and Arjun (9 months, nursery £800/month at Little Stars Nursery Slough). Currently only receiving Child Benefit £102.40/4wks. Missing: TFC account, 30-hour code, FSM, UC top-up, and Sure Start. Starting with the highest-impact items — TFC and 30 hours.",
      tasks: [
        {
          id: "task-tfc",
          description: "Set up Tax-Free Childcare",
          detail: "You're paying £800/month for Arjun's nursery with no TFC account. The government tops up payments — saving up to £2,000 a year.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-30-hours",
          description: "Get Meera's 30-hour childcare code",
          detail: "Meera is 4 and eligible for 30 hours free childcare. You haven't applied for this yet.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-fsm",
          description: "Register for free school meals",
          detail: "When Meera starts at Langley Academy in September, she qualifies based on your household income.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
      ],
      conversationTitle: "Help with money and childcare",
      nextStepPrompt: "Say 'yes' or 'please' and I'll start with the biggest saving first.",
    },
  },

  // ── Turn 3: After consent — TFC + 30hrs + FSM outcomes ──
  // MUST come before Turn 2 (affirmatives) because submitConsent() sends a
  // message containing "proceed" which would otherwise match Turn 2's patterns.
  {
    patterns: [
      /reviewed all consent/i,
      /Granted:.*Share/i,
    ],
    response: {
      response: `That's all done, Priya. I've set up three things for you:

**Tax-Free Childcare account** — Your account is now open and linked to Little Stars Nursery. For every £8 you pay in, the government adds £2. That's up to **£2,000 a year** off Arjun's nursery fees.

**30 hours free childcare** — Meera's 30-hour code has been generated. Give this code to her nursery or childminder — it's valid until the end of August 2026.

**Free school meals** — Meera is confirmed for free school meals at Langley Academy from September 2026. The school will be notified automatically.

You'll see the confirmations below. This should make a real difference — especially the TFC account, which starts saving you money straight away.

Would you like me to check your Universal Credit entitlement too?`,
      nextStepPrompt: "Say 'Universal Credit' or 'yes' and I'll check what you're entitled to.",
      reasoning:
        "Consent granted. Triggering three outcomes: TFC account opening (linked to Little Stars Nursery, saving up to £2,000/yr), 30-hour code for Meera (she's 4, eligible), and FSM registration for Langley Academy. These are the 'wow' moment — three things she didn't know about, done in seconds.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "hmrc-tax-free-childcare",
          hints: {
            entitlement_amount: "2000",
            entitlement_period: "Annual — for every £8 paid in, government adds £2",
            employer_notified: "TFC account linked to Little Stars Nursery, Slough. Savings start immediately on Arjun's £800/month fees.",
          },
        },
        {
          serviceId: "hmrc-free-childcare-30",
          hints: {
            entitlement_amount: "30 hours free childcare per week",
            entitlement_period: "Valid until end of August 2026",
            employer_notified: "Code generated for Meera Anand — give to nursery or childminder",
          },
        },
        {
          serviceId: "la-free-school-meals",
          hints: {
            entitlement_amount: "Free school meals",
            entitlement_period: "From September 2026 — Meera at Langley Academy",
            employer_notified: "School notified automatically by Slough Borough Council",
          },
        },
      ],
    },
  },

  // ── Turn 2: Consent — "yes" / affirmative ──
  {
    patterns: [
      /yes/i,
      /please/i,
      /go ahead/i,
      /start/i,
      /biggest/i,
      /ok/i,
      /sure/i,
    ],
    response: {
      response: `To set up your Tax-Free Childcare account, apply for Meera's 30-hour code, and register for free school meals, I'll need to share some details with HMRC and your local authority.

This includes:
- Your and Dev's employment status and income
- Meera and Arjun's dates of birth and your Child Benefit details
- Your childcare provider (Little Stars Nursery)

I'll use this to verify your eligibility and set everything up in one go.`,
      reasoning:
        "Priya confirmed. Need consent to share employment/income data with HMRC for TFC and 30 hours, and child details for FSM eligibility check. Being transparent about what's shared.",
      tasks: [],
      conversationTitle: null,
      consentRequests: [
        {
          id: "consent-childcare-hmrc",
          description:
            "Share employment and income details with HMRC for Tax-Free Childcare and 30-hour free childcare eligibility",
          data_shared: [
            "employment_status",
            "employer_name",
            "annual_income",
            "partner_employment_status",
            "partner_annual_income",
            "child_names",
            "child_dates_of_birth",
            "child_benefit_number",
            "childcare_provider",
          ],
          source: "Your verified records and DWP employment data",
          purpose:
            "Verify eligibility for Tax-Free Childcare and 30 hours free childcare, and open your TFC account",
          duration: "until-revoked",
          required: true,
        },
        {
          id: "consent-fsm-la",
          description:
            "Share household income details with Slough Borough Council for free school meals",
          data_shared: [
            "household_income",
            "child_name",
            "child_date_of_birth",
            "school_name",
          ],
          source: "Your verified records and HMRC data",
          purpose:
            "Confirm free school meals eligibility for Meera at Langley Academy",
          duration: "until-revoked",
          required: true,
        },
      ],
    },
  },

  // ── Turn 4: Universal Credit top-up ──
  {
    patterns: [
      /universal credit/i,
      /uc/i,
      /money/i,
      /rent/i,
      /income/i,
      /benefit/i,
      /more help/i,
      /what else/i,
      /monthly/i,
    ],
    response: {
      response: `I've calculated your likely Universal Credit entitlement based on your household details:

**Your situation:**
- Combined income: £38,700/year (you: £14,200, Dev: £24,500)
- Rent: £1,100/month
- Childcare: £800/month for Arjun at nursery

**What you'd receive:**
UC takes into account your earnings, rent, and childcare costs. Based on the standard couple allowance, child elements for Meera and Arjun, a housing element for your rent, and the childcare element (85% of your nursery costs), you'd receive approximately **£450 per month**.

Your first payment would arrive around 5 weeks after your claim date.

Here's your entitlement summary:`,
      reasoning:
        "UC calculation: Standard couple allowance ~£617.56, child elements (first child £333.33 + second child £287.92), childcare element (85% of £800 = £680), housing element for £1,100 rent. Earnings taper applies at 55% on net income above work allowance. Approximate figure of £450/month is reasonable for the demo. This is a significant monthly boost for the family.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "dwp-universal-credit-topup",
          hints: {
            payment_amount: "450",
            payment_frequency: "Monthly — includes couple allowance, child elements, housing element (£1,100 rent), and childcare element (85% of £800 nursery)",
            first_payment_date: "Approximately 5 weeks from claim date",
          },
        },
      ],
      nextStepPrompt: "There's one more thing — a £500 Sure Start Maternity Grant for Arjun. Say 'grant' or 'what else'.",
    },
  },

  // ── Turn 5: Sure Start Maternity Grant ──
  {
    patterns: [
      /sure start/i,
      /grant/i,
      /one.?off/i,
      /anything else/i,
      /lump sum/i,
      /more/i,
      /what about/i,
      /arjun/i,
      /baby/i,
    ],
    response: {
      response: `There's one more thing — the **Sure Start Maternity Grant**.

This is a one-off payment of **£500** to help with the costs of a new baby. Arjun was born in June 2025, which is within the qualifying period, and because you're now receiving Universal Credit, you meet the eligibility criteria.

I've submitted the claim for you. The £500 will be paid into your Lloyds account.

Here's your confirmation:`,
      reasoning:
        "Sure Start Maternity Grant: £500 one-off for families on qualifying benefits (UC, which Priya now has) with a child under 12 months or expecting. Arjun is 9 months old (born June 2025), so within the qualifying window. Payment to Lloyds current account.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "dwp-sure-start-grant",
          hints: {
            grant_amount: "500",
            project_description: "Sure Start Maternity Grant for Arjun Anand (born June 2025)",
            conditions_accepted: "One-off payment — qualifying child under 12 months, family receiving Universal Credit",
          },
        },
      ],
      nextStepPrompt: "That's everything sorted. You're now getting all the support you're entitled to.",
    },
  },

  // ── Catch-all for Priya ──
  {
    patterns: [/.*/],
    response: {
      response: `I'm here to help, Priya. What would you like to look at?`,
      reasoning:
        "Priya's message didn't match a specific step. Offering the main paths available. Keeping it simple and focused on the money-saving opportunities.",
      tasks: [
        {
          id: "task-tfc",
          description: "Set up Tax-Free Childcare",
          detail: "You're paying £800/month for Arjun's nursery with no TFC account. Saving up to £2,000 a year.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-30-hours",
          description: "Get Meera's 30-hour childcare code",
          detail: "Meera is 4 and eligible for 30 hours free childcare. You haven't applied yet.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-fsm",
          description: "Register for free school meals",
          detail: "When Meera starts at Langley Academy in September, she qualifies based on your household income.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
      ],
      conversationTitle: "Help with money and childcare",
    },
  },
];
