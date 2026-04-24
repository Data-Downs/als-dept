/**
 * Jordan Reeves — New User (cold start) scripted journey.
 *
 * 4-turn conversation: NI number → provisional licence → first job setup.
 * Demonstrates the cold-start archetype — brand new to government services.
 */

import type { ScriptedEntry } from "../demo-data";

export const JORDAN_REEVES_CHAT: ScriptedEntry[] = [
  // ── Turn 1: Opening — just turned 18, overwhelmed by adulting ──
  {
    patterns: [
      /just turned 18/i,
      /turned 18/i,
      /sort.*stuff.*out/i,
      /need.*ni.*number/i,
      /national insurance/i,
      /get a job/i,
      /start working/i,
      /first job/i,
    ],
    response: {
      response: `Hey Jordan. Turning 18 comes with a bit of admin, but it's not as bad as it sounds — and I can handle most of it for you.

There are three things worth sorting now:

Your mum's right that the NI number is the main one — you can't start a proper job without it.`,
      reasoning:
        "Jordan is 18, just finished sixth form at Bulwell Academy, and has no government credentials at all — no NI number, no driving licence, no benefit history. He's living with his mum in Nottingham and wants to get a job. Leading with reassurance that this is manageable. The NI number is the blocker for employment.",
      tasks: [
        {
          id: "task-ni-number",
          description: "Get your National Insurance number",
          detail: "You need this before you can start work. I can apply for it using the details we have.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-provisional-licence",
          description: "Apply for a provisional driving licence",
          detail: "Costs £34 online. Also works as photo ID for job applications.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-first-job",
          description: "Set up for your first job",
          detail: "Once you've got an NI number, I can help you understand tax codes and your rights at work.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
      ],
      conversationTitle: "Getting set up at 18",
      nextStepPrompt: "Say 'yes' or 'let's go' and I'll get your NI number sorted first.",
    },
  },

  // ── Turn 2: Consent — sharing details with DWP and DVLA ──
  {
    patterns: [
      /yes/i,
      /yeah/i,
      /go/i,
      /let's do it/i,
      /sort it/i,
      /ok/i,
      /please/i,
      /ni number/i,
    ],
    response: {
      response: `To get your NI number and provisional licence sorted, I need to share a few details on your behalf:

- Your name, date of birth, and address
- Your mum's address (as proof of where you live)

This goes to DWP for the NI number and DVLA for the provisional licence. I won't share anything beyond what's needed.`,
      reasoning:
        "Jordan confirmed he wants to proceed. Need consent before sharing data with DWP and DVLA. Keeping it simple — he has minimal data so the consent request is straightforward. No NI number to share yet (that's what we're applying for).",
      tasks: [],
      conversationTitle: null,
      consentRequests: [
        {
          id: "consent-ni-and-licence",
          description:
            "Share your identity details with DWP (NI number) and DVLA (provisional licence)",
          data_shared: [
            "full_name",
            "date_of_birth",
            "address",
          ],
          source: "Your verified records",
          purpose:
            "Apply for your National Insurance number and provisional driving licence",
          duration: "one-time",
          required: true,
        },
      ],
      nextStepPrompt: "Review the data sharing request above and grant consent to continue.",
    },
  },

  // ── Turn 3: Post-consent — NI number + provisional licence ──
  {
    patterns: [
      /reviewed all consent/i,
      /Granted:.*Share/i,
    ],
    response: {
      response: `Done — two things sorted:

**NI number** — your application has been submitted to DWP. Your number will arrive by post within 15 working days. You'll need it when you start work, but you can actually start a job before it arrives — just tell your employer it's on the way.

**Provisional licence** — your application has gone to DVLA. The licence doubles as photo ID, which is handy for job interviews. It'll arrive within 3 weeks.

Your confirmations are below.`,
      reasoning:
        "Consent granted. Submitting both applications simultaneously. The NI number is the priority — Jordan has a job interview next week, so flagging that he can start work before the number arrives (employers can use a temporary reference). The provisional licence is a secondary win — useful as photo ID even if he doesn't drive immediately.",
      tasks: [
        {
          id: "task-first-job",
          description: "Set up for your first job",
          detail: "Once your NI number arrives, I can help with tax codes and your rights at work.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
      ],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "dwp-ni-number",
          hints: {
            application_reference: "NI number application — Jordan Reeves",
            decision: "Application submitted — NI number will arrive by post",
            next_steps: "Your NI number will arrive within 15 working days. You can start work before it arrives.",
          },
        },
        {
          serviceId: "dvla-provisional-licence",
          hints: {
            licence_number: "Provisional driving licence — Jordan Reeves",
            valid_from: "2026-04-09",
            valid_until: "2036-04-15",
            posted_to: "42 Elm Road, Nottingham, NG5 3BP",
          },
        },
      ],
      nextStepPrompt: "When your NI number arrives, say 'got my NI number' and I'll help you get set up for work.",
    },
  },

  // ── Turn 4: First job setup ──
  {
    patterns: [
      /job/i,
      /work/i,
      /tax/i,
      /employer/i,
      /interview/i,
      /got.*ni/i,
      /arrived/i,
      /start/i,
    ],
    response: {
      response: `Here's what you need to know for your first job:

**Tax code** — you'll be on **1257L**, which is the standard code. That means you can earn up to £12,570 before paying any tax. On a part-time wage, you probably won't pay much tax at all.

**What to give your employer:**
- Your NI number (once it arrives)
- Your bank details (your Monzo account is fine)
- Proof of right to work (your provisional licence or passport)

**Your rights:**
- National minimum wage for 18-20 year olds is **£10.00/hour**
- You're entitled to 28 days paid holiday per year (pro-rata for part-time)
- Your employer must enrol you in a workplace pension, but you can opt out in the first month if you want

Good luck with the interview.`,
      reasoning:
        "Jordan is getting ready for his first job. Giving practical, actionable information — tax code, what documents to bring, and key employment rights. Keeping it conversational and not overwhelming. Mentioning minimum wage for his age band and pension auto-enrolment since he'll likely be asked about these.",
      tasks: [],
      conversationTitle: null,
      nextStepPrompt: "That's everything sorted. If you need anything else, I'm here.",
    },
  },

  // ── Catch-all ──
  {
    patterns: [/.*/],
    response: {
      response: `I'm here to help, Jordan. Here's what we can sort out — just pick one or tell me what's on your mind.`,
      reasoning:
        "Jordan's message didn't match a specific step. Offering the main tasks available.",
      tasks: [
        {
          id: "task-ni-number",
          description: "Get your National Insurance number",
          detail: "You need this before you can start work.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-provisional-licence",
          description: "Apply for a provisional driving licence",
          detail: "Costs £34 online. Also works as photo ID.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-first-job",
          description: "Set up for your first job",
          detail: "Tax codes, your rights, and what to bring on day one.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
      ],
      conversationTitle: "Getting set up at 18",
    },
  },
];
