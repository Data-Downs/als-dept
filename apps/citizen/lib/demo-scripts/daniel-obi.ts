/**
 * Daniel Obi — Self-employed plumber scripted journey.
 *
 * 4-turn conversation: opening triage → tax refund → money claim → MTD.
 * No consent turns needed — Daniel is accessing his own HMRC data
 * and filing his own claims.
 */

import type { ScriptedEntry } from "../demo-data";

export const DANIEL_OBI_CHAT: ScriptedEntry[] = [
  // ── Turn 1: Opening — confusion about tax and unpaid client ──
  {
    patterns: [
      /self.?employed/i,
      /confused.*tax/i,
      /tax.*confused/i,
      /client.*won't pay/i,
      /won't pay/i,
      /client.*owe/i,
      /plumb/i,
      /sole trader/i,
    ],
    response: {
      response: `Right, Daniel — let me take a look at everything. I can see three things that need your attention:`,
      reasoning:
        "Daniel's persona data shows three clear issues: (1) tax code error BR instead of 1257L with £1,800 refund pending since Oct 2025, (2) Mr R. Karim owes £4,200, 3 months overdue, (3) MTD status is required_not_enrolled with deadline 2026-04-06. Presenting all three upfront in plain language — Daniel is practical and no-nonsense.",
      tasks: [
        {
          id: "task-tax-refund",
          description: "Get your £1,800 tax refund",
          detail: "You've been on the wrong tax code (BR instead of 1257L) since last year. HMRC owe you £1,800.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-money-claim",
          description: "Chase unpaid invoice — £4,200",
          detail: "Mr R. Karim's kitchen and bathroom job is 3 months overdue. I can file a money claim through the courts.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-mtd",
          description: "Enrol for Making Tax Digital",
          detail: "You're required to enrol but haven't yet. Deadline is 6 April 2026 — just over two weeks away.",
          type: "user" as const,
          dueDate: "2026-04-06",
          dataNeeded: [],
        },
      ],
      conversationTitle: "Tax, unpaid invoice, and MTD",
      nextStepPrompt: "Which one do you want to sort first? Say 'tax refund', 'money claim', or 'MTD'.",
    },
  },

  // ── Turn 2: Tax refund ──
  {
    patterns: [
      /tax.*refund/i,
      /refund/i,
      /my money/i,
      /£1,?800/i,
      /overpaid/i,
      /tax code/i,
      /wrong.*code/i,
      /taxman/i,
      /hmrc.*owe/i,
      /first/i,
      /yes/i,
      /that one/i,
    ],
    response: {
      response: `Done. Here's what happened:

Your tax code was set to **BR** (Basic Rate on everything), which meant you were paying 20% on your entire income with no Personal Allowance. It should have been **1257L**, giving you £12,570 tax-free.

That error meant you overpaid **£1,800** in tax. I've corrected the tax code with HMRC and triggered the refund.

Your £1,800 will be paid into your **Lloyds account** (ending 1035) within 10 working days. Your tax code is now 1257L going forward, so this won't happen again.

Here's your confirmation:`,
      reasoning:
        "Daniel's employment data shows taxCode: 'BR' with taxCodeError: true. The refund of £1,800 matches financials.taxRefundOwed. Payment goes to his Lloyds personal account (sort code 30-90-15, account 48291035). No consent needed — this is his own HMRC tax data. Correcting the code to 1257L (standard Personal Allowance).",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "hmrc-tax-refund",
          hints: {
            entitlement_amount: "1800",
            entitlement_period: "One-off refund — tax code corrected from BR to 1257L",
            employer_notified: "Tax code updated with HMRC. Refund to Lloyds account (ending 1035) within 10 working days.",
          },
        },
      ],
      nextStepPrompt: "Want to sort the unpaid invoice next? Say 'money claim' or 'client'.",
    },
  },

  // ── Turn 3: Money claim for unpaid invoice ──
  {
    patterns: [
      /client/i,
      /won't pay/i,
      /money claim/i,
      /£4,?200/i,
      /karim/i,
      /unpaid/i,
      /invoice/i,
      /owe/i,
      /court/i,
      /chase/i,
      /debt/i,
    ],
    response: {
      response: `I've filed a **civil money claim** against Mr R. Karim through the Money Claims Online service (HMCTS).

Here's what happens next:

1. **The court sends the claim** to Mr Karim's last known address
2. **He has 14 days to respond** — he can pay, dispute, or ignore it
3. **If he ignores it**, you can apply for a County Court Judgment (CCJ), which goes on his credit record and gives you enforcement options

The court fee was **£205** (for claims between £3,001 and £5,000). If Mr Karim pays, you'll get the court fee back too.

Here's your confirmation:`,
      reasoning:
        "Daniel's selfEmployment.outstandingInvoices[0] shows Mr R. Karim owes £4,200 for a kitchen and bathroom refit, 3 months overdue. Court fee for MCOL claims £3,001–£5,000 is £205. Filing through Money Claims Online (HMCTS digital service). No consent needed — Daniel is filing his own claim.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "hmcts-money-claim",
          hints: {
            case_reference: "Money claim against Mr R. Karim — £4,200",
            court_or_registry: "Money Claims Online (HMCTS)",
            document_type: "Civil money claim — unpaid invoice for kitchen and bathroom refit",
            next_steps: "Court sends claim to defendant. 14 days to respond. If ignored, apply for County Court Judgment (CCJ). Court fee: £205.",
          },
        },
      ],
      nextStepPrompt: "Last thing — Making Tax Digital. Say 'MTD' or 'enrol' and I'll get that sorted.",
    },
  },

  // ── Turn 4: Making Tax Digital ──
  {
    patterns: [
      /mtd/i,
      /making tax digital/i,
      /quarterly/i,
      /digital/i,
      /software/i,
      /reports?/i,
      /deadline/i,
      /april/i,
      /enrol/i,
    ],
    response: {
      response: `I've enrolled you for **Making Tax Digital for Income Tax**.

Here's what this means in practice:

- Instead of one Self Assessment return per year, you'll send **quarterly updates** to HMRC through compatible software
- Your **first quarterly report is due 5 July 2026** (covering April–June)
- You'll need **HMRC-compatible software** — FreeAgent, Xero, or QuickBooks all work. Some are free for sole traders with straightforward books

The good news: your Self Assessment history is spotless — all filed on time for the last 3 years. This is just a change in how often you report, not how much tax you pay.

I'd recommend setting up the software now so you're ready for the first quarter. Want me to help compare options?`,
      reasoning:
        "Daniel's selfEmployment.mtdStatus is 'required_not_enrolled' with deadline 2026-04-06. His SA filing history shows all on time. First quarterly date from quarterlyReportingDates[0] is 2026-07-05. Being practical and reassuring — Daniel doesn't like paperwork and is wary of government portals.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "hmrc-mtd",
          hints: {
            amount_paid: "0",
            payment_method: "Enrolled for Making Tax Digital for Income Tax — no fee",
            receipt_reference: "First quarterly report due 5 July 2026 (April–June). UTR: 5839201746.",
          },
        },
      ],
      nextStepPrompt: "That's everything sorted. If you need anything else, just ask.",
    },
  },

  // ── Catch-all for Daniel ──
  {
    patterns: [/.*/],
    response: {
      response: `I can help with that, Daniel. What would you like to sort out?`,
      reasoning:
        "Daniel's message didn't match a specific step. Offering the main issues from his persona data. Keeping it direct and practical.",
      tasks: [
        {
          id: "task-tax-refund",
          description: "Get your £1,800 tax refund",
          detail: "You've been on the wrong tax code (BR instead of 1257L) since last year. HMRC owe you £1,800.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-money-claim",
          description: "Chase unpaid invoice — £4,200",
          detail: "Mr R. Karim's kitchen and bathroom job is 3 months overdue. I can file a money claim through the courts.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-mtd",
          description: "Enrol for Making Tax Digital",
          detail: "You're required to enrol but haven't yet. Deadline is 6 April 2026.",
          type: "user" as const,
          dueDate: "2026-04-06",
          dataNeeded: [],
        },
      ],
      conversationTitle: "Self-employment help",
    },
  },
];
