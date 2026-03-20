/**
 * Marcus Taylor — Prison Leaver scripted journey.
 *
 * 4-turn conversation: UC claim → bank account → driving licence renewal.
 * Each completion step triggers tangible outcome cards.
 */

import type { ScriptedEntry } from "../demo-data";

export const MARCUS_TAYLOR_CHAT: ScriptedEntry[] = [
  // ── Turn 1: Opening — just released, overwhelmed ──
  {
    patterns: [
      /released.*prison/i,
      /just.*released/i,
      /sort everything out/i,
      /prison/i,
      /been inside/i,
      /got out/i,
      /just got out/i,
    ],
    response: {
      response: `I hear you, Marcus. Getting everything sorted after release is a lot to deal with, but I'm going to help you through it step by step.

Looking at your situation, there are three things we need to get moving on:

1. **Universal Credit** — This is the most urgent. You need money coming in, and UC is how we get that. The standard allowance for someone your age is **£393.45 a month**. But there's a catch — the first payment takes about 5 weeks.

2. **Basic bank account** — You'll need one to receive UC payments. We can get a Lloyds basic account opened — no credit check, and they accept approved premises addresses.

3. **Driving licence** — Yours expired while you were inside. We can get that renewed so it's one less thing hanging over you.

You've got 6 weeks left at Kirkgate House before your approved premises placement ends on **30 April**. So timing matters here.

Want to start with Universal Credit?`,
      reasoning:
        "Marcus was released on 5 February 2026. He's in approved premises with a deadline of 30 April (6 weeks remaining). No bank account, no income beyond a £46 discharge grant. UC is the priority — it's the gateway to housing element once he moves to permanent accommodation. Being direct and practical, matching his communication style. Not being patronising about his situation.",
      tasks: [],
      conversationTitle: "Getting sorted after release",
    },
  },

  // ── Turn 3: After consent — UC claim + bank account ──
  // MUST come before Turn 2 (affirmatives) because submitConsent() sends a
  // message containing "proceed" which would otherwise match Turn 2's patterns.
  {
    patterns: [
      /reviewed all consent/i,
      /Granted:.*Share/i,
    ],
    response: {
      response: `Right, that's done. I've sorted two things for you:

**Universal Credit claim** — Your claim is active. You'll get **£393.45 a month** — that's the standard allowance for a single person aged 25 or over. There's no housing element while you're in approved premises, but that gets added automatically when you move to your own place.

Your first payment will be in about 5 weeks. One thing — they'll need a bank account to pay it into. Which brings me to…

**Basic bank account** — I've opened a Lloyds basic bank account for you. No credit check, no overdraft, no fees. Your UC payments will go straight into this once the first payment is processed.

You'll see the confirmations below. Your probation officer Karen Mitchell will be able to see these too if you need to show proof you're getting things sorted.

When you're ready, I can help with your driving licence or anything else.`,
      reasoning:
        "Consent granted for UC data sharing. Triggering two outcomes: UC claim (£393.45/month standard allowance, single person 25+, no housing element in approved premises) and basic bank account (Lloyds, no credit check — essential for UC payments). Marcus has no bank account so this is a critical dependency. Mentioning probation officer by name to show the system knows his situation.",
      tasks: [],
      conversationTitle: null,
      outcomes: [
        "dwp-universal-credit",
        "dwp-basic-bank-account",
      ],
    },
  },

  // ── Turn 2: Consent — "yes" / affirmative → consent card for UC data sharing ──
  {
    patterns: [
      /yes/i,
      /yeah/i,
      /please/i,
      /go ahead/i,
      /start/i,
      /ok/i,
      /let's do it/i,
      /universal credit/i,
      /uc/i,
    ],
    response: {
      response: `To get your Universal Credit claim started, I need to share some of your details with DWP. This includes:

- Your name, date of birth, and National Insurance number
- Your current address at Kirkgate House
- Your employment history (previous work at B&K Construction)

This information will be shared with the Department for Work and Pensions to process your claim.

I'll also get a basic bank account opened at the same time — you'll need one for payments.`,
      reasoning:
        "Marcus confirmed he wants to start with UC. Need his consent before sharing data with DWP. Being transparent about exactly what will be shared. Also flagging the bank account as part of this step since he can't receive UC without one.",
      tasks: [],
      conversationTitle: null,
      consentRequests: [
        {
          id: "consent-uc-claim",
          description:
            "Share your identity and employment details with DWP to process your Universal Credit claim",
          data_shared: [
            "full_name",
            "date_of_birth",
            "address",
            "national_insurance_number",
            "employment_history",
          ],
          source: "Your verified records",
          purpose:
            "Process Universal Credit claim with the Department for Work and Pensions",
          duration: "ongoing",
          required: true,
        },
      ],
    },
  },

  // ── Turn 4: Driving licence renewal ──
  {
    patterns: [
      /driving/i,
      /licence/i,
      /license/i,
      /drive/i,
      /dvla/i,
      /car/i,
      /expired/i,
      /renew/i,
    ],
    response: {
      response: `I've renewed your driving licence with DVLA.

**Driving licence renewed** — Your licence number **TAYLO960722MJ9FK** has been renewed. It's valid for 10 years and the new one will be posted to your address at Kirkgate House.

This means you've got valid photo ID again too, which helps with a lot of other things — job applications, opening accounts, proving your identity.

Here's your confirmation:`,
      reasoning:
        "Marcus's driving licence (TAYLO960722MJ9FK) expired on 10 August 2025 while he was serving his sentence. Renewing it to a 10-year validity. Posting to approved premises address. Mentioning the ID benefit because for someone recently released, having valid photo ID is important for employment and housing applications.",
      tasks: [],
      conversationTitle: null,
      outcomes: ["dvla.renew-driving-licence"],
    },
  },

  // ── Catch-all for Marcus ──
  {
    patterns: [/.*/],
    response: {
      response: `I'm here to help, Marcus. Here's what I can assist with:

- **Universal Credit** — Get your claim started so you've got money coming in
- **Driving licence** — Renew your expired licence
- **Finding work** — Help with getting back into construction, including CSCS card renewal and DBS disclosure

What would you like to sort out?`,
      reasoning:
        "Marcus's message didn't match a specific step. Offering the main paths available to him. Keeping it direct and practical, matching his communication style.",
      tasks: [],
      conversationTitle: "Getting sorted after release",
    },
  },
];
