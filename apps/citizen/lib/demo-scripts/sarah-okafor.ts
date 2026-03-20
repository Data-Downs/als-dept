/**
 * Sarah Okafor — Bereaved Spouse scripted journey.
 *
 * 5-turn conversation: bereavement → Tell Us Once → BSP → probate.
 * Each completion step triggers tangible outcome cards.
 */

import type { ScriptedResponse } from "../demo-data";

interface ScriptedEntry {
  patterns: RegExp[];
  response: ScriptedResponse;
}

export const SARAH_OKAFOR_CHAT: ScriptedEntry[] = [
  // ── Turn 1: Opening — grief, confusion, "I don't know what to do" ──
  {
    patterns: [
      /husband.*died/i,
      /don't know what to do/i,
      /just lost/i,
      /passed away/i,
      /bereavement/i,
      /death/i,
      /died/i,
    ],
    response: {
      response: `I'm so sorry for your loss, Sarah. I know this is an incredibly difficult time, and I'm here to help you through the things that need to happen next.

There are a few important things I can help with, and I'll take care of as much as possible so you don't have to worry about the details:

1. **Tell Us Once** — This notifies all government departments about David's passing in one go, so you don't have to contact each one separately. It will inform HMRC, DWP, DVLA, the Passport Office, and your local council.

2. **Bereavement Support Payment** — You may be entitled to a lump sum payment and monthly support.

3. **Probate** — When you're ready, I can help with the legal process to manage David's estate.

Would you like me to start with Tell Us Once? It's the most helpful first step — it takes care of a lot at once.`,
      reasoning:
        "Sarah's husband David died on 26 February 2026. She is the named executor. Starting with Tell Us Once is the right first step — it has the highest administrative impact and prevents her having to make multiple calls. I'm being warm and patient, matching her communication style notes.",
      tasks: [],
      conversationTitle: "Help after David's passing",
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

  // ── Turn 3: After consent — Tell Us Once + death registration + certificate ──
  {
    patterns: [
      /granted/i,
      /consent/i,
      /proceed/i,
      /reviewed/i,
      /sharing/i,
      /application/i,
    ],
    response: {
      response: `That's all done, Sarah. I've completed three things for you:

**Tell Us Once** — I've notified six government departments about David's passing. They'll each update their records — you don't need to contact any of them separately.

**Death registration** — David's death has been registered with the General Register Office in Chelmsford.

**Death certificate** — A certified copy has been issued and added to your documents.

You'll see the confirmations below. Take your time looking through them — there's no rush.

When you're ready, I can help with the bereavement support payment or probate. Just let me know.`,
      reasoning:
        "Consent was granted. Triggering three outcomes at once: Tell Us Once notification, death registration, and death certificate. This is the first 'wow' moment — three official documents/confirmations materialising in one go. Being gentle and not rushing her to the next step.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        "dwp-tell-us-once",
        "gro-register-death",
        "gro-death-certificate",
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
      outcomes: ["dwp-bereavement-support"],
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
      outcomes: ["hmcts-probate", "hmrc-iht400"],
    },
  },

  // ── Catch-all for Sarah ──
  {
    patterns: [/.*/],
    response: {
      response: `I'm here to help, Sarah. Here's what I can assist with:

- **Tell Us Once** — Notify all departments about David's passing
- **Bereavement Support Payment** — Check what financial support you're entitled to
- **Probate and inheritance tax** — Help manage David's estate

What would you like to start with?`,
      reasoning:
        "Sarah's message didn't match a specific step. Offering the three main paths available to her. Keeping it simple and not overwhelming.",
      tasks: [],
      conversationTitle: "Help after bereavement",
    },
  },
];
