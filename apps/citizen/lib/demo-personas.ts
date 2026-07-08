/**
 * The curated demo set — a handful of the richest personas, each mapped to a
 * clear archetype, pre-seeded with the situation and the agents already
 * commissioned, plus a briefing and a suggested journey so whoever is demoing
 * always knows the best way to show a persona off.
 */

export type DemoEntry = { key: string; label: string };

/** A step in the demo journey: what to do, and — where it applies — the exact
 *  message to paste into an agent, and which agent to paste it to. */
export type DemoMove = { do: string; to?: string; prompt?: string };

export type DemoPersona = {
  id: string; // matches data/simulated/users/<id>.json
  archetype: string;
  headline: string;
  accent: string;
  summary: string;
  themes: string[];
  agents: string[]; // specialists already commissioned on load
  introduced?: string[]; // agents offered but not yet commissioned (e.g. a third-party agent awaiting consent)
  companyContext?: Record<string, unknown>;
  seed: {
    responsibilities: DemoEntry[];
    liabilities: DemoEntry[];
    eligibilities: DemoEntry[];
  };
  moves: DemoMove[]; // how to show this persona off, in order
};

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "mary-summers",
    archetype: "The affluent couple and their fleet",
    headline: "Mary & Hugo Summers · 64 · London",
    accent: "#00703c",
    summary:
      "A comfortable retired couple at the estate-planning stage of life. Mary was Head of Strategic Planning at Islington Council. Between them they run a three-car household — a 2023 BMW, a 2022 Audi Q5 and a cherished 1965 Jaguar E-Type — exactly the kind of household with quiet admin slipping through the cracks.",
    themes: ["Three-car household", "A 1965 classic car", "Approaching retirement", "Estate & power of attorney"],
    agents: ["driving"],
    seed: {
      responsibilities: [
        { key: "vehicles", label: "Three vehicles — BMW 5 Series, Audi Q5, 1965 Jaguar E-Type" },
        { key: "retired", label: "Retired — former Head of Strategic Planning" },
      ],
      liabilities: [
        { key: "audi-mot", label: "Audi Q5 — MOT & tax due July" },
        { key: "bmw", label: "BMW 5 Series — MOT & tax due September" },
      ],
      eligibilities: [
        { key: "historic-vehicle", label: "Historic-vehicle tax & MOT exemption (the 1965 Jaguar)" },
        { key: "state-pension", label: "State Pension" },
      ],
    },
    moves: [
      {
        do: "Open Miles from the tray and check the fleet — he flags the Audi's July MOT and recognises the 1965 Jaguar as a historic vehicle (tax and MOT exempt).",
        to: "Miles",
        prompt: "Can you check the tax and MOT on all three of my cars?",
      },
      {
        do: "Show the generator conjuring a complete vehicle for any plate.",
        to: "Miles",
        prompt: "What can you tell me about the vehicle LT71 XPK?",
      },
      {
        do: "Show the licence-entitlement check.",
        to: "Miles",
        prompt: "If I bought a 5-tonne motorhome, would my licence let me drive it?",
      },
    ],
  },
  {
    id: "emma-parker",
    archetype: "The young couple starting a family",
    headline: "Emma & Liam Parker · 29 · London",
    accent: "#a84f7a",
    summary:
      "Emma is a maternity-ward nurse at Guy's & St Thomas', expecting her first baby with Liam. A happy, busy time — and the moment a lot of government quietly kicks in at once: maternity pay, registering the birth, Child Benefit, childcare. Exactly what a new parent shouldn't have to project-manage.",
    themes: ["First baby on the way", "Statutory Maternity Pay", "Child Benefit & childcare", "Registering a birth"],
    agents: ["robin"],
    seed: {
      responsibilities: [
        { key: "expecting", label: "Expecting first baby" },
        { key: "nhs-nurse", label: "NHS maternity-ward nurse (employed)" },
      ],
      liabilities: [
        { key: "register-birth", label: "Register the birth once the baby arrives" },
      ],
      eligibilities: [
        { key: "smp", label: "Statutory Maternity Pay (through her employer)" },
        { key: "child-benefit", label: "Child Benefit" },
        { key: "tax-free-childcare", label: "Tax-Free Childcare" },
        { key: "free-hours", label: "Free childcare hours (15–30)" },
      ],
    },
    moves: [
      { do: "Let Dot's proactive opener land — she leads with what's coming and the maternity support Emma's entitled to. No prompt needed." },
      {
        do: "Bring in Robin for the new-baby side (or tap 'Statutory Maternity Pay' in the panel).",
        to: "Dot",
        prompt: "I'm expecting my first baby in August — can you help me get everything sorted?",
      },
      {
        do: "Show Robin carrying the whole new-baby journey.",
        to: "Robin",
        prompt: "What will I need to do once the baby actually arrives?",
      },
    ],
  },
  {
    id: "rajesh-patel",
    archetype: "The professional family — company, cars and kids",
    headline: "Rajesh & Priya Patel · 43 · Cambridge",
    accent: "#4c2c92",
    summary:
      "Rajesh runs RKP Consulting Ltd; Priya teaches secondary school. Two young children, two cars including a Tesla, a healthy household income — and three different corners of government pulling at them at once. The persona that shows the cohort handling real breadth: company filings, vehicles and family, without Rajesh touching a single department.",
    themes: ["Limited company", "VAT & corporation tax", "Two cars incl. an EV", "Two young children"],
    agents: ["reg", "driving", "fay"],
    companyContext: {
      name: "RKP Consulting Ltd",
      number: "10234567",
      status: "active",
      incorporatedOn: "2016-05-12",
      confirmationStatementDue: "2026-05-26",
      accountsDue: "2026-08-31",
      directors: [{ name: "Rajesh Patel", appointedOn: "2016-05-12", active: true }],
    },
    seed: {
      responsibilities: [
        { key: "limited-company", label: "Director of RKP Consulting Ltd" },
        { key: "vehicles", label: "Two vehicles — Tesla Model 3, VW Golf" },
        { key: "children", label: "Two children — Anya (8) and Dev (6)" },
      ],
      liabilities: [
        { key: "confirmation-statement", label: "Confirmation statement — RKP Consulting Ltd" },
        { key: "vat-return", label: "VAT return — VAT-registered" },
        { key: "corporation-tax", label: "Corporation tax — RKP Consulting Ltd" },
        { key: "golf-tax", label: "VW Golf — vehicle tax may be due" },
      ],
      eligibilities: [
        { key: "tax-free-childcare", label: "Tax-Free Childcare (two children)" },
        { key: "free-hours", label: "Free childcare hours" },
      ],
    },
    moves: [
      { do: "Open the tray — three specialists already commissioned: Reg, Miles and Fay. The 'look how much it's holding' moment. Point out Rajesh never picked a department — Dot placed all three." },
      {
        do: "Ask Reg where the company stands.",
        to: "Reg",
        prompt: "Where does RKP Consulting Ltd stand right now — is anything due?",
      },
      {
        do: "Ask Miles to check both cars.",
        to: "Miles",
        prompt: "Can you check the tax and MOT on both my cars?",
      },
      {
        do: "Hand the childcare question to Fay.",
        to: "Fay",
        prompt: "Are we claiming all the childcare support we're entitled to for Anya and Dev?",
      },
    ],
  },
  {
    id: "fatima-nowak",
    archetype: "The family leaning on support",
    headline: "Fatima Nowak · 43 · Luton",
    accent: "#c05746",
    summary:
      "Fatima works part-time in school catering; Tomasz is a warehouse supervisor. Three children — Kasia (15), Adam (11, with an EHCP) and Lily (5, just starting school). A tighter budget, and the family for whom missing an entitlement or a deadline genuinely bites. The vulnerable-first story: government noticing on her behalf.",
    themes: ["Three children", "Child Benefit 16th-birthday cliff", "Adam's EHCP", "Free school meals & childcare"],
    agents: ["fay"],
    introduced: ["cass"],
    seed: {
      responsibilities: [
        { key: "children", label: "Three children — Kasia (15), Adam (11), Lily (5)" },
      ],
      liabilities: [
        { key: "child-benefit-cliff", label: "Child Benefit stops at Kasia's 16th birthday (22 Oct) unless confirmed" },
      ],
      eligibilities: [
        { key: "ehcp", label: "EHCP support for Adam (additional needs)" },
        { key: "free-school-meals", label: "Free school meals" },
        { key: "tax-free-childcare", label: "Tax-Free Childcare" },
        { key: "free-hours", label: "Free childcare hours for Lily" },
      ],
    },
    moves: [
      { do: "Let Dot's opener land — she leads with the Child Benefit cliff: it stops at Kasia's 16th birthday unless Fatima confirms she's staying in education. The vigilance beat." },
      {
        do: "Ask Fay to look after the family.",
        to: "Fay",
        prompt: "Can you keep Kasia's Child Benefit running, and check where Adam's EHCP and our free school meals stand?",
      },
      {
        do: "The third-party beat: open Cass in the tray — a benefits agent from Citizens Advice, not government. Commission her to show the consent moment (certified, revocable), then ask her:",
        to: "Cass",
        prompt: "Are we missing out on any benefits or support we should be claiming?",
      },
    ],
  },
  {
    id: "sarah-okafor",
    archetype: "Bereavement — the hardest week, carried",
    headline: "Sarah Okafor · 58 · Chelmsford",
    accent: "#4a7a6f",
    summary:
      "Sarah's husband David died in February. There's a will, a £645,000 estate, probate not yet started, and pensions to unwind — the mountain of admin that lands on someone at the worst possible moment. Grace is already with her, carrying the government and admin side so Sarah doesn't have to hold it while she grieves.",
    themes: ["Recent bereavement", "Tell Us Once", "Probate & inheritance tax", "Pensions & Bereavement Support"],
    agents: ["grace"],
    introduced: ["iris"],
    seed: {
      responsibilities: [
        { key: "bereaved", label: "Bereaved — husband David died 26 February" },
      ],
      liabilities: [
        { key: "probate", label: "Probate not yet started (£645k estate)" },
        { key: "iht", label: "Inheritance tax to assess" },
      ],
      eligibilities: [
        { key: "bereavement-support", label: "Bereavement Support Payment" },
        { key: "survivor-pension", label: "Survivor's pension — BT scheme & State Pension" },
      ],
    },
    moves: [
      {
        do: "Open Grace and let her carry it — Tell Us Once notifies every department at once, then Bereavement Support Payment. Notice the tone: gentle, unhurried. After she files something, tap the receipt's 'Undo' for the safe-to-be-wrong layer.",
        to: "Grace",
        prompt: "My husband David died in February and I don't know where to start.",
      },
      {
        do: "The third-party beat: open Iris in the tray — a bereavement companion from Cruse, a charity, not government. A third-party agent standing beside Grace: the same cohort coordinating on one event. Then talk to her:",
        to: "Iris",
        prompt: "I'm really struggling since David died.",
      },
    ],
  },
];

export const DEMO_PERSONA_IDS = new Set(DEMO_PERSONAS.map((d) => d.id));
