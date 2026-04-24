/**
 * Lisa Chen — Partial User (moving house) scripted journey.
 *
 * 4-turn conversation: address updates → HMRC/council/GP → DVLA licence renewal.
 * Demonstrates the partial-user archetype — some departments know her, some don't.
 */

import type { ScriptedEntry } from "../demo-data";

export const LISA_CHEN_CHAT: ScriptedEntry[] = [
  // ── Turn 1: Opening — moving house, wants everything updated ──
  {
    patterns: [
      /moving house/i,
      /moving/i,
      /new address/i,
      /update.*address/i,
      /change.*address/i,
      /relocating/i,
      /bath/i,
    ],
    response: {
      response: `I can take care of most of this in one go, Lisa. Here's what needs updating for your move to Bath on 1 May:

One thing to flag — your driving licence expired in June 2024, so this isn't just an address change for DVLA. You'll need a full renewal. I can handle that too, but it's a separate step.`,
      reasoning:
        "Lisa is moving from Bristol to Bath on 1 May 2026. She's efficient and wants a checklist. HMRC knows her well (PAYE since 2019), NHS has her records, but DVLA only has an expired licence from 2024. The expired licence is the key flag — it needs renewal, not just an address update. Council tax needs closing at Bristol end and opening at Bath end.",
      tasks: [
        {
          id: "task-hmrc-address",
          description: "Update HMRC records",
          detail: "Tax code and PAYE records — HMRC already has your employment details from Arup.",
          type: "agent" as const,
          dueDate: "2026-05-01",
          dataNeeded: [],
        },
        {
          id: "task-council-tax",
          description: "Sort council tax",
          detail: "Close Bristol council tax account, open Bath and North East Somerset account.",
          type: "agent" as const,
          dueDate: "2026-05-01",
          dataNeeded: [],
        },
        {
          id: "task-electoral-roll",
          description: "Register on the electoral roll",
          detail: "Register at your new Bath address — you need this for credit checks too.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-gp-transfer",
          description: "Transfer GP registration",
          detail: "Transfer from Whiteladies Medical Group to a surgery in Bath.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
        {
          id: "task-dvla-licence",
          description: "Renew driving licence (expired)",
          detail: "Your licence expired June 2024 — needs a full renewal, not just address change. £14 online.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
      ],
      conversationTitle: "Moving to Bath — address updates",
      nextStepPrompt: "Say 'yes' or 'go ahead' and I'll start with the address updates across departments.",
    },
  },

  // ── Turn 2: Consent — sharing new address across departments ──
  {
    patterns: [
      /yes/i,
      /go ahead/i,
      /do it/i,
      /please/i,
      /start/i,
      /ok/i,
      /all of them/i,
    ],
    response: {
      response: `To update your address across departments, I need to share your new details. Here's what goes where:

- **HMRC**: New address (they already have your NI, tax code, and employer details)
- **Bristol City Council and Bath & NE Somerset Council**: New address for council tax transfer
- **Electoral Registration Office**: New address for voter registration
- **NHS**: New address for GP transfer

I'll handle all of these together. The DVLA licence renewal is a separate step after — I'll come back to that.`,
      reasoning:
        "Lisa wants efficiency. Grouping all the address-change services together and handling DVLA separately since it's a renewal not just an update. Being transparent about what data goes where. HMRC already has extensive records on her — this is just an address change, not a new registration.",
      tasks: [],
      conversationTitle: null,
      consentRequests: [
        {
          id: "consent-address-update",
          description:
            "Share your new address with HMRC, council tax, electoral register, and NHS for address updates",
          data_shared: [
            "full_name",
            "national_insurance_number",
            "current_address",
            "new_address",
            "move_date",
          ],
          source: "Your verified records",
          purpose:
            "Update your address with HMRC, Bristol and Bath councils, electoral register, and NHS",
          duration: "one-time",
          required: true,
        },
      ],
      nextStepPrompt: "Review the data sharing request above and grant consent to continue.",
    },
  },

  // ── Turn 3: Post-consent — four departments updated, DVLA flagged ──
  {
    patterns: [
      /reviewed all consent/i,
      /Granted:.*Share/i,
    ],
    response: {
      response: `All done — four departments updated in one go. Your confirmations are below.

**What happens next:**
- HMRC will use your new address from your next payslip
- Bristol council tax closes on 30 April, Bath opens on 1 May — no gap
- You're registered to vote at the Bath address
- NHS has started the GP transfer — you'll need to choose a surgery in Bath (I can suggest some near Circus Mews if you'd like)

When you're ready, I'll sort the DVLA licence renewal. That's a separate application since yours expired rather than just needing an address change.`,
      reasoning:
        "Consent granted. Four services completed simultaneously — HMRC address update, council tax transfer (close Bristol, open Bath), electoral roll registration, and GP transfer initiation. Keeping Lisa informed about what happens automatically vs what she needs to do. Flagging the DVLA step as next — her licence expired in 2024 so it's a renewal, not just an address update.",
      tasks: [
        {
          id: "task-dvla-licence",
          description: "Renew driving licence (expired)",
          detail: "Your licence expired June 2024 — needs a full renewal. £14 online.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
      ],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "hmrc-update-records",
          hints: {
            registration_reference: "Address updated — Lisa Wei Chen",
            registration_district: "HMRC PAYE records",
            event_date: "Effective from 1 May 2026",
          },
        },
        {
          serviceId: "la-council-tax",
          hints: {
            registration_reference: "Council tax transfer — Bristol to Bath",
            registration_district: "Bath and North East Somerset Council",
            event_date: "Bristol closes 30 April, Bath opens 1 May 2026",
          },
        },
        {
          serviceId: "la-electoral-roll",
          hints: {
            registration_reference: "Electoral registration — 8 Circus Mews, Bath",
            registration_district: "Bath and North East Somerset",
            event_date: "2026-04-09",
          },
        },
        {
          serviceId: "nhs-gp-register",
          hints: {
            registration_reference: "GP transfer initiated",
            registration_district: "Bath and North East Somerset NHS area",
            event_date: "Transfer from Whiteladies Medical Group — choose new surgery in Bath",
          },
        },
      ],
      nextStepPrompt: "Say 'driving licence' or 'DVLA' when you're ready to renew your licence.",
    },
  },

  // ── Turn 4: DVLA licence renewal ──
  {
    patterns: [
      /driving/i,
      /licence/i,
      /dvla/i,
      /renew/i,
      /license/i,
    ],
    response: {
      response: `Your driving licence renewal has been submitted to DVLA. Here's what happened:

- Your old licence number **CHEN9890322LC9FJ** has been updated
- New licence issued with your **Bath address** (8 Circus Mews, BA1 2PW)
- Valid for 10 years from today
- The photocard will arrive by post within 3 weeks

Since you haven't driven in two years, just a heads up — your car insurance will need to reflect the gap. And Bath has a clean air zone, so worth checking if that affects your plans.

Your confirmation is below.`,
      reasoning:
        "Lisa's licence expired June 2024. She's renewing because she'll need a car in Bath (no cycle infrastructure on her commute). Issuing a fresh 10-year licence with the new Bath address. Mentioning the insurance gap and Bath clean air zone since she's an engineer who appreciates practical detail.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "dvla-renew-driving-licence",
          hints: {
            licence_number: "CHEN9890322LC9FJ",
            valid_from: "2026-04-09",
            valid_until: "2036-04-09",
            posted_to: "8 Circus Mews, Bath, BA1 2PW",
          },
        },
      ],
      nextStepPrompt: "That's everything sorted for your move. If you need anything else, I'm here.",
    },
  },

  // ── Catch-all ──
  {
    patterns: [/.*/],
    response: {
      response: `I'm here to help with your move, Lisa. Just let me know which of these you'd like to tackle, or tell me what else you need.`,
      reasoning:
        "Lisa's message didn't match a specific step. Showing the available tasks.",
      tasks: [
        {
          id: "task-hmrc-address",
          description: "Update HMRC records",
          detail: "Tax code and PAYE records — address change.",
          type: "agent" as const,
          dueDate: "2026-05-01",
          dataNeeded: [],
        },
        {
          id: "task-council-tax",
          description: "Sort council tax",
          detail: "Close Bristol, open Bath and North East Somerset.",
          type: "agent" as const,
          dueDate: "2026-05-01",
          dataNeeded: [],
        },
        {
          id: "task-dvla-licence",
          description: "Renew driving licence (expired)",
          detail: "Your licence expired June 2024 — needs renewal, not just address change.",
          type: "agent" as const,
          dueDate: null,
          dataNeeded: [],
        },
      ],
      conversationTitle: "Moving to Bath — address updates",
    },
  },
];
