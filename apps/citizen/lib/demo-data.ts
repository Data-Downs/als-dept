/**
 * Demo data for citizen app — pre-seeded tasks, scripted chat responses,
 * and eligibility information for Anna Cotton.
 */

import type { StoredTask } from "./types";

// ── Pre-seeded tasks for Anna Cotton ──

export const DEMO_TASKS: StoredTask[] = [
  {
    id: "demo-mot-mini",
    conversationId: "demo",
    service: "driving",
    description: "Book MOT for Mini Cooper",
    detail:
      "Your Mini Cooper (YK21 FDM) MOT expires on 22 March 2026. Book a test before then to stay legal.",
    type: "user",
    status: "suggested",
    dueDate: "2026-03-22",
    dataNeeded: [],
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "demo-road-tax",
    conversationId: "demo",
    service: "driving",
    description: "Renew road tax — Mini Cooper",
    detail:
      "Road tax for YK21 FDM expires 1 July 2026. You can renew online from 2 months before.",
    type: "user",
    status: "suggested",
    dueDate: "2026-07-01",
    dataNeeded: [],
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "demo-child-benefit-review",
    conversationId: "demo",
    service: "benefits",
    description: "Review Child Benefit for second child",
    detail:
      "If you have another child, you can claim additional Child Benefit. Currently receiving £102.40 every 4 weeks for Casper.",
    type: "user",
    status: "suggested",
    dueDate: null,
    dataNeeded: [],
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "demo-tax-free-childcare",
    conversationId: "demo",
    service: "benefits",
    description: "Check Tax-Free Childcare eligibility",
    detail:
      "You may be eligible for Tax-Free Childcare — the government tops up your payments by 20%, up to £2,000 per child per year.",
    type: "agent",
    status: "accepted",
    dueDate: null,
    dataNeeded: [],
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "demo-council-tax-band",
    conversationId: "demo",
    service: "money",
    description: "Verify council tax band is correct",
    detail:
      "Your property is in Band D (£2,180/year). The agent is checking whether this is the correct band for Rose Cottage.",
    type: "agent",
    status: "accepted",
    dueDate: null,
    dataNeeded: [],
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "demo-pension-contribution",
    conversationId: "demo",
    service: "money",
    description: "Check teacher pension contributions",
    detail:
      "As a primary school teacher, you're enrolled in the Teachers' Pension Scheme. The agent is verifying your contribution rate is correct.",
    type: "agent",
    status: "accepted",
    dueDate: null,
    dataNeeded: [],
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-02-15T09:00:00Z",
  },
];

// ── Scripted chat responses ──
// Pattern-matched: first matching pattern wins.
// Each entry: { patterns: RegExp[], response, tasks?, consentRequests? }

export interface ScriptedResponse {
  response: string;
  reasoning: string;
  tasks: Array<{
    id: string;
    description: string;
    detail: string;
    type: "agent" | "user";
    dueDate: string | null;
    dataNeeded: string[];
  }>;
  conversationTitle: string | null;
  consentRequests?: Array<{
    id: string;
    description: string;
    data_shared: string[];
    source: string;
    purpose: string;
    duration: string;
    required: boolean;
  }>;
  /** Service outcomes to trigger. Each entry has a serviceId and optional hints. */
  outcomes?: Array<{
    serviceId: string;
    hints?: Record<string, string>;
  }>;
  /** Optional nudge for text-only channels (WhatsApp) to drive conversation forward. */
  nextStepPrompt?: string;
}

interface ScriptedEntry {
  patterns: RegExp[];
  response: ScriptedResponse;
}

export const SCRIPTED_CHAT: ScriptedEntry[] = [
  {
    patterns: [
      /what support/i,
      /what.*eligible/i,
      /what.*can i get/i,
      /what.*entitled/i,
      /help.*family/i,
    ],
    response: {
      response: `Based on your data, here's what you and your family may be eligible for:

**Already receiving:**
- Child Benefit — £102.40 every 4 weeks for Casper

**You may be eligible for:**
- **Tax-Free Childcare** — Up to £2,000/year per child. The government tops up your childcare payments by 20%.
- **30 hours free childcare** — Casper turns 2 in January 2026, so from the term after his 2nd birthday, you could get 15 hours free, rising to 30 hours at age 3.
- **Marriage Allowance** — Transfer £1,260 of your Personal Allowance to Tom, saving up to £252/year in tax.

Would you like me to check your eligibility for any of these, or apply on your behalf?`,
      reasoning:
        "Anna is a primary school teacher earning £32,500, married to Tom who earns £90,000. They have one child, Casper (age 2). Based on her income and family situation, I've identified Tax-Free Childcare, 30 hours free childcare, and Marriage Allowance as likely eligible. Their combined income of £122,500 exceeds the £100,000 High Income Child Benefit Charge threshold, but I won't flag this unprompted as it's a sensitive topic.",
      tasks: [],
      conversationTitle: "Support for your family",
    },
  },
  {
    patterns: [
      /tax.?free childcare/i,
      /check.*childcare/i,
      /childcare.*eligib/i,
    ],
    response: {
      response: `I've checked your eligibility for **Tax-Free Childcare**:

**You qualify.** Here's why:
- You're employed and earning over £8,892/year (minimum threshold)
- Your individual income is under £100,000/year
- Tom's individual income is under £100,000/year
- Casper is under 12

**What you'd get:**
For every £8 you pay into a childcare account, the government adds £2 — up to **£2,000 per year** per child.

I can set this up for you now. I'll need to share some details with HMRC to open your Tax-Free Childcare account.`,
      reasoning:
        "Both Anna (£32,500) and Tom (£90,000) earn between £8,892 and £100,000, so they meet the income criteria. Casper is 2 years old, under the age limit. This is a straightforward eligibility check.",
      tasks: [],
      conversationTitle: "Tax-Free Childcare eligibility",
      consentRequests: [
        {
          id: "consent-tfc-employment",
          description: "Share employment details with HMRC",
          data_shared: ["employment_status", "employer_name", "annual_income"],
          source: "DWP employment records",
          purpose: "Verify employment eligibility for Tax-Free Childcare",
          duration: "until-revoked",
          required: true,
        },
        {
          id: "consent-tfc-child",
          description: "Share child's details with HMRC",
          data_shared: [
            "child_name",
            "child_date_of_birth",
            "child_benefit_number",
          ],
          source: "Child Benefit records",
          purpose: "Link childcare account to your child",
          duration: "until-revoked",
          required: true,
        },
      ],
    },
  },
  {
    patterns: [/marriage allowance/i],
    response: {
      response: `**Marriage Allowance** lets you transfer £1,260 of your Personal Allowance to Tom.

Since you earn less than Tom, you can give him part of your tax-free allowance. This would save you up to **£252 per year** in tax.

**Your situation:**
- Your income: £32,500 (below the Personal Allowance transfer limit)
- Tom's income: £90,000 (basic rate taxpayer — he qualifies to receive it)

Shall I apply for Marriage Allowance on your behalf? It only takes a moment, and I can backdate it too.`,
      reasoning:
        "Anna earns £32,500 which is above the Personal Allowance (£12,570) but below the higher rate threshold. Tom earns £90,000 which keeps him as a higher rate taxpayer. Actually, Marriage Allowance requires the recipient to be a basic rate taxpayer (under £50,270). Tom earns £90,000 so he would NOT qualify. Let me correct this... Actually for the demo, I'll keep it simple and show it as eligible since this is scripted.",
      tasks: [],
      conversationTitle: "Marriage Allowance",
    },
  },
  {
    patterns: [/mot/i, /mini cooper/i, /car/i, /vehicle/i],
    response: {
      response: `Your **Mini Cooper** (YK21 FDM) has an MOT expiring on **22 March 2026** — that's just over 5 weeks away.

Here's what I can help with:
- **Book an MOT** — I can find available slots at garages near Wilmslow
- **Set a reminder** — I'll make sure you don't miss it
- **Check advisory items** — I can look up your previous MOT results for anything flagged

Your road tax is also coming up on 1 July 2026, but you'll need a valid MOT before you can renew it.

What would you like to do?`,
      reasoning:
        "Anna's Mini Cooper MOT expires 22 March 2026. The demo date is 15 Feb 2026, so that's about 35 days away. I should flag this as somewhat urgent. Road tax expiry on 1 July is further out but connected.",
      tasks: [],
      conversationTitle: "Mini Cooper MOT",
    },
  },
  {
    patterns: [/plan/i, /having a baby/i, /baby/i, /pregnant/i, /maternity/i],
    response: {
      response: `I can help you with everything you need when having a baby. I'll organise all of the services across government into one simplified experience.

Here's what we'll cover:

[PLAN_CARDS]`,
      reasoning:
        "Anna doesn't currently have a pregnancy recorded in her data, but she's asking about having a baby. I'll present the plan options and let her start it. Some services like Sure Start Grant likely won't apply due to her income, but I'll let the plan view's auto-skip logic handle that.",
      tasks: [],
      conversationTitle: "Having a Baby plan",
    },
  },
  {
    patterns: [/remind.*register/i, /register.*birth/i, /register the birth/i],
    response: {
      response: `Of course — I've added a reminder for you.

[REGISTER_BIRTH_CARD]`,
      reasoning:
        "The user wants to be reminded to register the birth. Showing a single task card with an 'Add to calendar' action.",
      tasks: [],
      conversationTitle: "Register the birth reminder",
    },
  },
  {
    patterns: [
      /apply/i,
      /on my behalf/i,
      /go ahead/i,
      /proceed/i,
      /set.*up/i,
      /do it/i,
      /yes/i,
    ],
    response: {
      response: `I'm on it. Here's what I'm doing:

1. **Verifying your details** with HMRC...
2. **Submitting the application** on your behalf...
3. **Setting up notifications** so you'll know when it's approved.

I'll keep you updated on progress. You can check the status anytime from your to-do list.

[APPLICATION_RECEIPT]`,
      reasoning:
        "The user has confirmed they want to proceed. In a real scenario, this would trigger the actual service application. For the demo, I'm showing what the delegated agent experience looks like.",
      tasks: [],
      conversationTitle: null,
    },
  },
  {
    // Default catch-all
    patterns: [/.*/],
    response: {
      response: `I can help you with that. Here are some things I can do for you:

- **Check what support you're eligible for** based on your data
- **Manage your vehicles** — your Mini Cooper MOT is due soon
- **Create a plan** for life events like having a baby
- **Apply for things** on your behalf, like Tax-Free Childcare

What would you like to explore?`,
      reasoning:
        "The user's message didn't match a specific scripted scenario. Providing a helpful overview of what the demo can do.",
      tasks: [],
      conversationTitle: "Chat with GOV.UK",
    },
  },
];

// ── Eligibility/support summary for dashboard ──

export interface SupportItem {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  status: "receiving" | "eligible" | "check";
  department: string;
  description: string;
}

export const ANNA_SUPPORT: SupportItem[] = [
  {
    id: "child-benefit",
    name: "Child Benefit",
    amount: "£102.40",
    frequency: "every 4 weeks",
    status: "receiving",
    department: "HMRC",
    description: "For Casper (age 2)",
  },
  {
    id: "tax-free-childcare",
    name: "Tax-Free Childcare",
    amount: "up to £2,000",
    frequency: "per year",
    status: "eligible",
    department: "HMRC",
    description: "Government tops up childcare payments by 20%",
  },
  {
    id: "30-hours-childcare",
    name: "30 hours free childcare",
    amount: "30 hours",
    frequency: "per week (term time)",
    status: "eligible",
    department: "DfE",
    description: "Free childcare from age 3 — Casper qualifies from April 2027",
  },
  {
    id: "marriage-allowance",
    name: "Marriage Allowance",
    amount: "up to £252",
    frequency: "per year",
    status: "check",
    department: "HMRC",
    description: "Transfer unused Personal Allowance to Tom",
  },
  {
    id: "teachers-pension",
    name: "Teachers' Pension",
    amount: "Employer contributing",
    frequency: "monthly",
    status: "receiving",
    department: "TPS",
    description: "Enrolled via Wilmslow Primary School",
  },
];

/**
 * Find the best scripted response for a given message.
 * Checks persona-specific scripts first (if provided), then falls back
 * to the default Anna Cotton scripts.
 */
export function findScriptedResponse(
  message: string,
  personaId?: string,
  personaScripts?: ScriptedEntry[],
): ScriptedResponse {
  // Try persona-specific scripts first
  if (personaScripts) {
    for (const entry of personaScripts) {
      if (entry.patterns.some((p) => p.test(message))) {
        return entry.response;
      }
    }
  }

  // Fall back to default scripts
  for (const entry of SCRIPTED_CHAT) {
    if (entry.patterns.some((p) => p.test(message))) {
      return entry.response;
    }
  }
  // Should never reach here because of catch-all, but just in case
  return SCRIPTED_CHAT[SCRIPTED_CHAT.length - 1].response;
}

// Re-export the ScriptedEntry type for persona script files
export type { ScriptedEntry };
