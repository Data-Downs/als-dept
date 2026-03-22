/**
 * Sarah Okafor — Bereaved Spouse scripted journey.
 *
 * 5-turn conversation: bereavement → Tell Us Once → BSP → probate.
 * Each completion step triggers tangible outcome cards.
 */

import type { ScriptedEntry } from "../demo-data";

export const SARAH_OKAFOR_CHAT: ScriptedEntry[] = [
  // ── Turn 1: Opening — grief, compassion, one concrete step ──
  {
    patterns: [
      /husband.*died/i,
      /don't know what to do/i,
      /just lost/i,
      /passed away/i,
      /died/i,
      /someone.*(died|death|passed)/i,
    ],
    response: {
      response: `Oh, Sarah. I'm so sorry about David.

You don't need to figure any of this out on your own, and nothing needs to happen right this moment. I'm here whenever you're ready.

When you do feel able, the most important first step is this:

[SERVICE:gro-register-death]

I can help you with everything else after that — notifying government departments, financial support, and David's estate. But none of that needs to happen today.

Would you like me to help with the registration, or would you rather I just make a note and we come back to this when you're ready?`,
      reasoning:
        "Sarah's husband David died on 26 February 2026. She is the named executor. Leading with compassion and offering just one concrete step (death registration — time-sensitive). Not overwhelming her with a full list. The SERVICE marker will render as a compact card. Offering to pause shows respect for her emotional state.",
      tasks: [],
      conversationTitle: "Help after David's passing",
    },
  },

  // ── Turn 3: After consent — Tell Us Once + death registration + certificate ──
  // MUST come before Turn 2 (affirmatives) because submitConsent() sends a
  // message containing "proceed" which would otherwise match Turn 2's patterns.
  {
    patterns: [
      /reviewed all consent/i,
      /Granted:.*Share/i,
    ],
    response: {
      response: `That's all done, Sarah. I've taken care of three things for you — the confirmations are below.

When you're ready, there are two more things I can help with:

[SERVICE:dwp-bereavement-support]

[SERVICE:hmcts-probate]

There's no rush on either of these. Just let me know when you'd like to continue.`,
      reasoning:
        "Consent was granted. Triggering three outcomes at once: Tell Us Once notification, death registration, and death certificate. This is the first 'wow' moment — three official documents/confirmations materialising in one go. Being gentle and not rushing her to the next step.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "dwp-tell-us-once",
          hints: {
            registration_reference: "Departments notified",
            registration_district: "Chelmsford",
            event_date: "Six departments: HMRC, DWP, DVLA, HM Passport Office, Chelmsford Council, Electoral Register",
          },
        },
        {
          serviceId: "gro-register-death",
          hints: {
            registration_reference: "Death of David Oluwole Okafor",
            registration_district: "Chelmsford, Essex",
            event_date: "2026-02-26",
          },
        },
        {
          serviceId: "gro-death-certificate",
          hints: {
            licence_number: "Death certificate for David Oluwole Okafor",
            valid_from: "2026-03-20",
            valid_until: "Permanent",
            posted_to: "28 Meadow Close, Chelmsford, CM1 4QR",
          },
        },
      ],
    },
  },

  // ── Turn 2: Consent — "yes" / "please" / affirmative ──
  {
    patterns: [
      /yes/i,
      /please/i,
      /go ahead/i,
      /start/i,
      /tell us once/i,
      /notify/i,
      /ok/i,
    ],
    response: {
      response: `To notify all the departments, I'll need to share some details on your behalf. This includes:

- Your name, address, and National Insurance number
- David's name, date of birth, date of death, and National Insurance number
- Your relationship as his spouse and named executor

This information will be shared with HMRC, DWP, DVLA, HM Passport Office, your local council, and the electoral register.

I'll also register the death with the General Register Office and arrange for a death certificate to be issued.`,
      reasoning:
        "Sarah confirmed she wants to proceed. I need her consent before sharing data across departments. I'm being transparent about exactly what will be shared and with whom. The consent card will handle the formal grant.",
      tasks: [],
      conversationTitle: null,
      consentRequests: [
        {
          id: "consent-tell-us-once",
          description:
            "Share your details and David's details with government departments via Tell Us Once",
          data_shared: [
            "full_name",
            "address",
            "national_insurance_number",
            "spouse_name",
            "spouse_date_of_birth",
            "spouse_date_of_death",
            "spouse_national_insurance_number",
          ],
          source: "Your verified records",
          purpose:
            "Notify HMRC, DWP, DVLA, Passport Office, local council, and electoral register of David's death",
          duration: "one-time",
          required: true,
        },
      ],
    },
  },

  // ── Turn 4: Bereavement Support Payment ──
  {
    patterns: [
      /money/i,
      /financial/i,
      /payment/i,
      /bereavement.*support/i,
      /support.*payment/i,
      /entitled/i,
      /how much/i,
      /income/i,
      /afford/i,
      /struggling/i,
      /benefit/i,
    ],
    response: {
      response: `I've checked your eligibility for **Bereavement Support Payment**, and you qualify.

Because David paid National Insurance contributions and you're under State Pension age, you're entitled to:

- An **initial lump sum of £3,500** — paid straight away
- **18 monthly payments of £350** each

I've submitted the claim using the details we already have on file. Your first payment will go to your NatWest account.

Here's your confirmation:`,
      reasoning:
        "Sarah is eligible for BSP: her husband died, she's 58 (under State Pension age), and David had NI contributions from his career at BT. Standard rate applies — £3,500 lump sum + 18 × £350/month. Payment goes to her NatWest current account (sort code 60-14-33).",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "dwp-bereavement-support",
          hints: {
            payment_amount: "3500",
            payment_frequency: "£3,500 lump sum + £350/month × 18 months",
            first_payment_date: "2026-04-01",
          },
        },
      ],
    },
  },

  // ── Turn 5: Probate + IHT ──
  {
    patterns: [
      /probate/i,
      /will/i,
      /estate/i,
      /inherit/i,
      /house/i,
      /property/i,
      /executor/i,
      /legal/i,
      /iht/i,
      /tax/i,
    ],
    response: {
      response: `I've taken care of two things for you:

**Probate** — I've submitted the application to HM Courts & Tribunals Service. As the named executor in David's will, you have full authority to manage the estate. The grant of probate has been issued — you'll need this to access David's bank accounts and manage the property.

**Inheritance Tax** — I've filed the IHT400 return with HMRC. David's estate — including the house, savings, and pension — comes to £645,000. With the combined nil-rate bands (yours and David's), the threshold is £1,000,000, so **no inheritance tax is due**.

Here are your confirmations:`,
      reasoning:
        "Sarah is the named executor (verified by Will/Probate Registry). Estate value is £645,000 (from bereavement.estateValue). Combined nil-rate threshold: (£325,000 + £175,000) × 2 = £1,000,000. Estate is well under threshold, so no IHT due. This should be a huge relief for Sarah.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        {
          serviceId: "hmcts-probate",
          hints: {
            case_reference: "Grant of Probate — Estate of David Oluwole Okafor",
            court_or_registry: "HM Courts & Tribunals Service, Chelmsford",
            document_type: "Grant of Probate",
            next_steps: "Use the grant to access David's bank accounts and manage the property",
          },
        },
        {
          serviceId: "hmrc-iht400",
          hints: {
            amount_paid: "0",
            payment_method: "No inheritance tax due — estate £645,000 is below combined threshold of £1,000,000",
            receipt_reference: "IHT400 filed — nil return",
          },
        },
      ],
    },
  },

  // ── Catch-all for Sarah ──
  {
    patterns: [/.*/],
    response: {
      response: `I'm here whenever you need me, Sarah. Here's what I can help with:

[SERVICE:dwp-tell-us-once]

[SERVICE:dwp-bereavement-support]

[SERVICE:hmcts-probate]

Just let me know which feels right, or if you'd like me to explain any of these.`,
      reasoning:
        "Sarah's message didn't match a specific step. Offering the three main paths available to her. Keeping it simple and not overwhelming.",
      tasks: [],
      conversationTitle: "Help after bereavement",
    },
  },
];
