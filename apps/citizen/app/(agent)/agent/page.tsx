"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/lib/store";
import { dedupeEntries } from "@/lib/entry-dedupe";
import { DEMO_PERSONAS, type DemoPersona } from "@/lib/demo-personas";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { LoginSheet } from "@/components/sheets/LoginSheet";
import { OneLoginNotification } from "@/components/OneLoginNotification";

type AgentId =
  | "dot"
  | "reg"
  | "grace"
  | "driving"
  | "sol"
  | "robin"
  | "fay"
  | "cass"
  | "iris";

const AGENT_META: Record<
  AgentId,
  {
    name: string;
    tagline: string;
    provider: string | null;
    accent: string;
    // Third-party agents aren't built by government — they're certified to act
    // on the citizen's behalf, and require explicit, revocable consent.
    thirdParty?: boolean;
    certifiedBy?: string;
    access?: string[];
    temporary?: boolean;
    mandate?: string;
    about: string;
    capabilities: string[];
    useHint: string;
  }
> = {
  dot: {
    name: "Dot",
    tagline: "Your way in to government",
    provider: "GOV.UK",
    accent: "#1d70b8",
    about:
      "Dot is your personal government agent — the single way in to everything the state does. You never have to work out which department handles what; Dot works that out and brings in the right specialist agents for you.",
    capabilities: [
      "Understands what you need from how you describe it",
      "Recognises your situation and keeps a live picture of you",
      "Brings in and coordinates specialist agents on your behalf",
      "Carries what you've said so you never repeat yourself",
    ],
    useHint: "Just tell Dot what's going on, in your own words.",
  },
  reg: {
    name: "Reg",
    tagline: "Limited company agent",
    provider: "Companies House & HMRC",
    accent: "#4c2c92",
    mandate:
      "Keeps your company on the right side of things — confirmation statements, VAT, and corporation tax guidance. He’ll see your company record and can act with Companies House and HMRC on your behalf.",
    about:
      "Reg is your limited company agent, provided by Companies House and HMRC. He runs the compliance and admin of your company so you never have to hold it in your head.",
    capabilities: [
      "Tracks every statutory deadline from your real company record",
      "Runs compliance checks and flags gaps before they bite",
      "Files your confirmation statement and VAT with your sign-in",
      "Checks any supplier's VAT number against HMRC's register",
    ],
    useHint: "Ask Reg anything about your company's filings, tax or deadlines.",
  },
  grace: {
    name: "Grace",
    tagline: "Bereavement agent",
    provider: "GOV.UK · Tell Us Once",
    accent: "#4a7a6f",
    temporary: true,
    mandate:
      "Stays with you and carries the whole government and admin side after a death — registering, Tell Us Once, pensions and benefits — for as long as you need. She steps back once it’s in hand.",
    about:
      "Grace is a bereavement agent who stays with you and carries the whole government and admin side after a death, for as long as you need. She's here for now, and steps back once it's in hand.",
    capabilities: [
      "Handles Tell Us Once across every department at once",
      "Sorts registering the death, pensions and benefits",
      "Guides probate and inheritance tax at your pace",
      "Holds the whole picture so you never have to",
    ],
    useHint: "Tell Grace as much or as little as you feel able to.",
  },
  driving: {
    name: "Miles",
    tagline: "Licence & vehicles",
    provider: "DVLA & DVSA",
    accent: "#00703c",
    mandate:
      "One agent for your licence and your vehicles — renewals, MOT reminders, vehicle tax and booking tests — across DVLA and DVSA, so you never deal with them separately.",
    about:
      "Miles is your driving agent, across DVLA and DVSA. He looks after your licence and every vehicle you own, so you never deal with the two bodies separately.",
    capabilities: [
      "Looks any registration up — tax, MOT, recalls, the lot",
      "Checks whether you're licensed to drive a given vehicle",
      "Watches your licence, MOT and tax dates and flags what's next",
      "Taxes a vehicle or books a test with your sign-in",
    ],
    useHint: "Give Miles a registration, or ask about your licence.",
  },
  sol: {
    name: "Sol",
    tagline: "Working for yourself",
    provider: "HMRC",
    accent: "#b45309",
    mandate:
      "Keeps your tax and your books in order — Self Assessment, deadlines, Making Tax Digital, the VAT line, and what you're owed — so you can get on with the work, never become an accountant.",
    about:
      "Sol is your working-for-yourself agent, from HMRC. He keeps your tax and your books in order so you can get on with the work and never have to become an accountant.",
    capabilities: [
      "Tracks Self Assessment and Making Tax Digital deadlines",
      "Spots what you're owed and what you owe",
      "Files your return with your sign-in",
      "Keeps an eye on the VAT threshold as you grow",
    ],
    useHint: "Ask Sol about your tax, deadlines, or what you're owed.",
  },
  robin: {
    name: "Robin",
    tagline: "New baby",
    provider: "GOV.UK · for new parents",
    accent: "#a84f7a",
    temporary: true,
    mandate:
      "Looks after everything the state needs around your new baby — maternity pay, registering the birth, Child Benefit and childcare — so you can focus on the baby. Steps back once it's all in hand.",
    about:
      "Robin is a new-baby agent who looks after everything the state needs around your baby, so you can focus on the baby itself. Here for now, and steps back once it's all in hand.",
    capabilities: [
      "Sorts registering the birth",
      "Sets up maternity or paternity pay",
      "Claims Child Benefit and arranges childcare support",
      "Holds the whole new-baby to-do so you don't have to",
    ],
    useHint: "Tell Robin how things are going with the baby.",
  },
  fay: {
    name: "Fay",
    tagline: "Family & children",
    provider: "HMRC, DfE & your council",
    accent: "#c05746",
    mandate:
      "One agent for everything to do with your children — Child Benefit, childcare, school places, additional needs — so you never chase schools, councils and HMRC separately.",
    about:
      "Fay is your family and children agent, across HMRC, the Department for Education and your council. She looks after everything to do with your children so you never chase three bodies separately.",
    capabilities: [
      "Watches child-related benefits and deadlines (like the 16th-birthday cliff)",
      "Sets up Tax-Free Childcare and free hours",
      "Helps with school places and additional needs (EHCP)",
      "Joins up HMRC, the council and the school for you",
    ],
    useHint: "Ask Fay about anything to do with your children.",
  },
  cass: {
    name: "Cass",
    tagline: "Benefits & entitlements",
    provider: "Citizens Advice",
    accent: "#0b6b8f",
    thirdParty: true,
    certifiedBy: "GDS Agent Register",
    access: [
      "Your income and household circumstances",
      "Which benefits and support you already receive",
      "Permission to prepare and submit claims on your behalf",
    ],
    about:
      "Cass is a benefits agent from Citizens Advice — not built by government, but certified by it to act for you. She checks everything you might be entitled to across the whole benefits system and helps you claim it, the way a Citizens Advice adviser would, at a scale no single caseworker ever could.",
    capabilities: [
      "Checks every benefit and entitlement you might be missing",
      "Prepares and submits claims for you, with your sign-in",
      "Speaks up for you the way a caseworker would",
      "Keeps track of what you're owed as your circumstances change",
    ],
    useHint: "Tell Cass what's going on at home — she'll work out what you're owed.",
  },
  iris: {
    name: "Iris",
    tagline: "Bereavement support",
    provider: "Cruse Bereavement Support",
    accent: "#6b5b95",
    thirdParty: true,
    certifiedBy: "GDS Agent Register",
    temporary: true,
    access: [
      "That you've been recently bereaved",
      "What support you've already arranged",
      "Nothing else is shared without asking you first",
    ],
    about:
      "Iris is a bereavement companion from Cruse Bereavement Support — a charity government trusts to stand beside you. Where Grace carries the government admin, Iris is here for the harder part: someone to talk to, gentle guidance on what to expect, and a way through at your own pace.",
    capabilities: [
      "Someone to talk to, whenever you need",
      "Gentle guidance on what comes next",
      "Connects you to local Cruse support",
      "Works alongside Grace so nothing falls between them",
    ],
    useHint: "Talk to Iris about how you're doing, not only the admin.",
  },
};

type Receipt = {
  label: string;
  dataShared: string[];
  via: "one-login" | "government-gateway";
  idv: boolean;
  reason: string;
  approver: string;
  at: string;
  serviceId: string;
  resolves?: Resolves;
  undone?: boolean;
};
type Msg =
  | { role: "user" | "assistant"; content: string }
  | { role: "receipt"; content: string; receipt: Receipt }
  | { role: "introduce"; agentId: AgentId };

type ConvoMeta = { title?: string; updatedAt: number };
type ArchivedConvo = {
  id: string;
  agentId: AgentId;
  messages: Msg[];
  title?: string;
  updatedAt: number;
};
type AgentPermissions = { canAct: boolean; proactive: boolean };
const DEFAULT_PERMISSIONS: AgentPermissions = { canAct: true, proactive: true };

/** Compact, human relative time for the tray's conversation list. */
function timeAgo(ts?: number): string {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

type Entry = { key: string; label: string };
type Profile = {
  identity: Record<string, unknown>;
  responsibilities: Entry[];
  liabilities: Entry[];
  eligibilities: Entry[];
};
type ServiceAuth = {
  login: "one-login" | "government-gateway";
  accepts?: Array<"one-login" | "government-gateway" | "none-in-person">;
  identityVerification?: boolean;
};
type Resolves = { list: "liabilities" | "eligibilities"; key: string; label: string };
type PendingAction = {
  serviceId: string;
  label: string;
  dataShared: string[];
  auth: ServiceAuth;
  summary: string;
  reason: string;
  resolves?: Resolves;
};
type RosterEntry = { id: AgentId; state: "introduced" | "commissioned" | "stood-down" };
type WorkingItem = { key: string; label: string; status: "now" | "next" | "waiting" | "done" };

/** An inbound government message. In this model it never lands in a mailbox —
 *  the durable facts become wallet credentials (known) and anything to do
 *  becomes an action the agent offers (done); the original stays retrievable. */
type Credential = {
  key: string;
  label: string;
  value: string;
  source: string;
  original: string;
};
type InboundEvent = {
  id: string;
  from: string;
  notifBody: string;
  original: string;
  agentMessage: string;
  facts: { key: string; label: string; value: string }[];
  /** Absorbed without troubling the citizen — no notification, no chat, no
   *  credential. It exists only in "everything that came in". */
  silent?: boolean;
};

const INBOUND_EVENTS: InboundEvent[] = [
  {
    id: "hmrc-tax-code",
    from: "HMRC",
    notifBody: "Your tax code has changed",
    agentMessage:
      "[Inbound from HMRC] The citizen's tax code has changed to 1257L, effective 6 April 2026, following a review of their PAYE record. The review also found an underpayment of £312 for the 2025–26 tax year, which can be settled online. The original notice is available to view.",
    facts: [{ key: "tax-code", label: "Tax code", value: "1257L" }],
    original:
      "HM Revenue & Customs\nPAYE Coding Notice\n\nDear Mr Downs,\n\nYour tax code for the 2026–27 tax year is 1257L. This replaces your previous code and takes effect from 6 April 2026.\n\nWe have also reviewed your record for 2025–26 and found an underpayment of £312.00. You can settle this online at any time.\n\nWhy your code may have changed: a change to your estimated income, benefits, or allowances.\n\nYou do not need to do anything about your code — your employer will use it automatically.\n\nHM Revenue & Customs",
  },
  {
    id: "dvla-licence",
    from: "DVLA",
    notifBody: "Your driving licence is due to expire",
    agentMessage:
      "[Inbound from DVLA] The citizen's photocard driving licence expires on 14 August 2026. It must be renewed to keep driving legally; renewal can be done online and costs £14. The original reminder is available to view.",
    facts: [
      { key: "driving-licence-expiry", label: "Driving licence expires", value: "14 Aug 2026" },
    ],
    original:
      "Driver & Vehicle Licensing Agency\nDriving Licence Renewal Reminder\n\nDear Mr Downs,\n\nYour photocard driving licence expires on 14 August 2026. You must renew it before then to continue driving legally.\n\nRenewing online takes about 5 minutes and costs £14. You'll need a valid UK passport if you want us to reuse your passport photo.\n\nYour entitlement to drive is not affected — only the photocard needs renewing.\n\nDVLA, Swansea",
  },
  {
    id: "cabinet-office-consultation",
    from: "Cabinet Office",
    notifBody: "A public consultation has opened",
    agentMessage: "",
    silent: true,
    facts: [],
    original:
      "Cabinet Office\nPublic Consultation\n\nA consultation on proposed changes to GOV.UK digital identity services has opened. Responses close 30 September 2026.\n\nThis is for your information only. No action is required, and nothing about your records has changed.\n\nYou can respond if you wish, but you do not have to.\n\nCabinet Office",
  },
];

/** A card in the citizen's wallet — Apple Wallet-style. Comes from a persona's
 *  held credentials or from inbound government post. */
type WalletCard = {
  key: string;
  title: string;
  issuer: string;
  primary: string;
  secondary?: string;
  status?: "valid" | "expired" | "info";
  original?: string;
};

type PersonaSummary = { id: string; name: string; initials: string; color: string; desc: string };

const ISSUER_ACCENT: Record<string, string> = {
  HMRC: "#0b7285",
  DVLA: "#00703c",
  DVSA: "#00703c",
  DWP: "#4c2c92",
  "Cabinet Office": "#1a1a1a",
  "GOV.UK One Login": "#1d70b8",
  "One Login": "#1d70b8",
  "Royal Mail": "#b3121b",
  NHS: "#005eb8",
  "Companies House": "#4c2c92",
  "Home Office": "#8f3a84",
};
const issuerAccent = (issuer: string) => ISSUER_ACCENT[issuer] ?? "#505a5f";

const CRED_TITLE: Record<string, string> = {
  "driving-licence": "Driving licence",
  "national-insurance": "National Insurance",
  "proof-of-address": "Proof of address",
  passport: "Passport",
  "one-login": "GOV.UK One Login",
};
const credTitle = (type: string) =>
  CRED_TITLE[type] ??
  type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

function personaCredToCard(c: Record<string, unknown>): WalletCard {
  const type = String(c.type ?? "credential");
  const issued = c.issued ? formatDate(String(c.issued)) : null;
  const expires = c.expires ? formatDate(String(c.expires)) : null;
  return {
    key: `${c.issuer}-${type}`,
    title: credTitle(type),
    issuer: String(c.issuer ?? "GOV.UK"),
    primary: String(c.number ?? ""),
    secondary: expires ? `Expires ${expires}` : issued ? `Issued ${issued}` : undefined,
    status: c.status === "expired" ? "expired" : "valid",
  };
}

function personaToProfile(p: Record<string, unknown>): Profile {
  const first = String(p.personaName ?? p.name ?? "").split(/\s|&/)[0] || "You";
  const addr = (p.address ?? {}) as Record<string, unknown>;
  const addressStr =
    [
      addr.line1 ?? addr.address_line_1,
      addr.city ?? addr.locality ?? addr.town,
      addr.postcode ?? addr.postal_code,
    ]
      .filter(Boolean)
      .join(", ") || undefined;
  const identity: Record<string, unknown> = { name: first, fullName: p.name };
  if (p.date_of_birth) identity.dateOfBirth = p.date_of_birth;
  if (p.age) identity.age = p.age;
  if (addressStr) identity.address = addressStr;
  if (p.national_insurance_number)
    identity.nationalInsuranceNumber = p.national_insurance_number;
  return { identity, responsibilities: [], liabilities: [], eligibilities: [] };
}

const EMPTY: Profile = {
  identity: {},
  responsibilities: [],
  liabilities: [],
  eligibilities: [],
};

/** A minimal citizen for the login wall, built from the discovered profile.
 *  No logins yet — so acting on a One Login service fires the create branch. */
function personaFromProfile(profile: Profile) {
  const id = profile.identity;
  const name = String(id.fullName || id.name || "You");
  const first = String(id.name || name).split(" ")[0] || "you";
  const email = String(id.email || `${first.toLowerCase()}@example.com`);
  return {
    personaId: "agent-citizen",
    personaName: name,
    primaryContact: { firstName: first, email },
    logins: { governmentGateway: [], oneLogin: null, nhsLogin: null },
  };
}

const HIDDEN_OPENERS = new Set(["Hi", "[commissioned]"]);

// Which specialist a knowledge lozenge is about, from its wording. Specific
// first. If none matches — or the match isn't commissioned — it goes to Dot,
// who brings the right agent in, so a tap never dead-ends.
const TOPIC_ROUTES: { agent: AgentId; re: RegExp }[] = [
  { agent: "cass", re: /universal credit|pension credit|\bpip\b|\besa\b|\buc\b|housing benefit|council tax reduction|carer'?s allowance|free school meals|benefit|entitlement/i },
  { agent: "grace", re: /bereave|death|died|funeral|probate|estate|tell us once/i },
  { agent: "reg", re: /compan|confirmation statement|corporation tax|\bvat\b|director|companies house|\bpaye\b/i },
  { agent: "driving", re: /licence|vehicle|\bmot\b|dvla|dvsa|\bcar\b|driving|sorn|road tax/i },
  { agent: "robin", re: /maternity|paternity|\bbaby\b|\bbirth\b|new.?born|expecting/i },
  { agent: "sol", re: /self.?assess|self.?employ|sole trader|tax return|making tax digital|business expense|refund|freelance|national insurance|\butr\b/i },
  { agent: "fay", re: /child benefit|childcare|tax.?free childcare|school|ehcp|\bsend\b|free.?school|nursery|30 hours|15 hours|pupil/i },
];

function topicAgent(label: string): AgentId {
  for (const r of TOPIC_ROUTES) if (r.re.test(label)) return r.agent;
  return "dot";
}

export default function AgentPage() {
  const [threads, setThreads] = useState<Record<AgentId, Msg[]>>({
    dot: [],
    reg: [],
    grace: [],
    driving: [],
    sol: [],
    robin: [],
    fay: [],
    cass: [],
    iris: [],
  });
  const [activeAgent, setActiveAgent] = useState<AgentId>("dot");
  // Per-agent conversation metadata: a generated title and the last-active
  // time, so each agent's thread surfaces in the tray as a resumable
  // conversation. Persisted alongside the threads.
  const [convoMeta, setConvoMeta] = useState<Partial<Record<AgentId, ConvoMeta>>>(
    {},
  );
  // Dot's "where things stand" recap, generated fresh each time a persona with
  // history is opened. Ephemeral — never persisted, never stored in the thread.
  // While it's on screen the prior thread is hidden; it's reachable from the
  // tray. `resuming` covers the moment between opening and the recap arriving;
  // `reveal` drives the type-it-out animation.
  const [resumeSummary, setResumeSummary] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [reveal, setReveal] = useState(0);
  // Past conversations per agent. threads[agent] is the one currently open;
  // starting or reopening a conversation swaps through here, so the rest of the
  // app keeps its "one active thread per agent" invariant.
  const [archived, setArchived] = useState<ArchivedConvo[]>([]);
  const [agentPermissions, setAgentPermissions] = useState<
    Partial<Record<AgentId, AgentPermissions>>
  >({});
  // When the citizen granted a third-party agent access (its consent moment).
  const [consentAt, setConsentAt] = useState<Partial<Record<AgentId, number>>>({});
  const [agentDetail, setAgentDetail] = useState<AgentId | null>(null);
  // The interstitial briefing shown after picking a demo persona, before the
  // experience loads.
  const [pendingDemo, setPendingDemo] = useState<DemoPersona | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([
    { id: "dot", state: "commissioned" },
  ]);
  const [trayOpen, setTrayOpen] = useState(false);
  const [companyContext, setCompanyContext] = useState<unknown>(null);
  const [workingState, setWorkingState] = useState<WorkingItem[]>([]);
  const [handover, setHandover] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{
    agent: AgentId;
    items: { label: string; message: string }[];
  }>({ agent: "dot", items: [] });
  const [wallet, setWallet] = useState<WalletCard[]>([]);
  const [inboundLog, setInboundLog] = useState<InboundEvent[]>([]);
  const [viewingOriginal, setViewingOriginal] = useState<{
    source: string;
    original: string;
  } | null>(null);
  const [inboundNotif, setInboundNotif] = useState<{ from: string; body: string } | null>(null);
  const [inboundMenu, setInboundMenu] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [currentUser, setCurrentUser] = useState<string>("new-user");
  const [personaRecord, setPersonaRecord] = useState<Record<string, unknown> | null>(null);
  const [personaMenu, setPersonaMenu] = useState(false);

  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actingAgent, setActingAgent] = useState<AgentId>("dot");
  const [completed, setCompleted] = useState<string[]>([]);
  const [resolved, setResolved] = useState<Resolves[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sheetType = useAppStore((s) => s.bottomSheet.type);
  const closeBottomSheet = useAppStore((s) => s.closeBottomSheet);
  const oneLoginVerified = useAppStore((s) => s.oneLoginVerified);
  const gatewayVerified = useAppStore((s) => s.gatewayVerified);
  const identityVerified = useAppStore((s) => s.identityVerified);

  const setThread = (id: AgentId, next: Msg[] | ((prev: Msg[]) => Msg[])) => {
    setThreads((t) => ({
      ...t,
      [id]: typeof next === "function" ? next(t[id] ?? []) : next,
    }));
    setConvoMeta((cm) => ({
      ...cm,
      [id]: { title: cm[id]?.title, updatedAt: Date.now() },
    }));
  };

  function beginAuth(action: PendingAction, prof: Profile) {
    useAppStore.setState({
      persona: currentUser,
      personaData: (personaRecord ?? personaFromProfile(prof)) as never,
      pendingAuth: action.auth,
      oneLoginVerified: false,
      gatewayVerified: false,
      identityVerified: false,
      pendingIdentityCheck: action.auth.identityVerification === true,
      pendingMessage: null,
      oneLoginChallenge: null,
      phoneNotification: null,
      bottomSheet: { type: "login" },
    });
  }

  function drivingContextFor() {
    if (!personaRecord) return null;
    const creds = Array.isArray(personaRecord.credentials)
      ? (personaRecord.credentials as Record<string, unknown>[])
      : [];
    const lic = creds.find((c) => c.type === "driving-licence");
    const vehicles = Array.isArray(personaRecord.vehicles)
      ? (personaRecord.vehicles as Record<string, unknown>[])
      : [];
    const issued = lic?.issued ?? lic?.issueDate ?? lic?.validFrom;
    const issuedYear = issued
      ? Number(String(issued).slice(0, 4)) || undefined
      : undefined;
    const age = personaRecord.age != null ? Number(personaRecord.age) : undefined;
    return {
      licence: {
        expiry: lic?.expires ? formatDate(String(lic.expires)) : undefined,
        categories: Array.isArray(lic?.categories)
          ? (lic!.categories as string[])
          : undefined,
        issuedYear,
        holderAge: Number.isFinite(age) ? age : undefined,
      },
      vehicles: vehicles.map((v) => ({
        make: v.make,
        model: v.model,
        registrationNumber: v.registrationNumber,
        colour: v.colour ?? v.color,
        fuelType: v.fuelType ?? v.fuel,
        year: v.year,
        motExpiry: v.motExpiry ? formatDate(String(v.motExpiry)) : undefined,
        taxExpiry: v.taxExpiry ? formatDate(String(v.taxExpiry)) : undefined,
      })),
    };
  }

  function selfEmployedContextFor() {
    if (!personaRecord) return null;
    const emp = personaRecord.employment as Record<string, unknown> | undefined;
    const fin = personaRecord.financials as Record<string, unknown> | undefined;
    if (!(personaRecord.self_employed || emp?.status === "Self-employed")) return null;
    return {
      tradingName: emp?.tradingName,
      businessType: emp?.businessType,
      annualRevenue: emp?.annualRevenue,
      netIncome: emp?.netIncome,
      taxRefundOwed: fin?.taxRefundOwed,
      unpaidInvoices: fin?.unpaidInvoices,
    };
  }

  function familyContextFor() {
    if (!personaRecord) return null;
    const kids = Array.isArray(personaRecord.children)
      ? (personaRecord.children as Record<string, unknown>[])
      : [];
    if (!kids.length) return null;
    const now = new Date();
    return {
      children: kids.map((c) => {
        const dob = c.dateOfBirth ? String(c.dateOfBirth) : undefined;
        let age: number | undefined;
        if (dob) {
          const [y, m, d] = dob.split("-").map(Number);
          age =
            now.getFullYear() -
            y -
            (now.getMonth() + 1 < m ||
            (now.getMonth() + 1 === m && now.getDate() < d)
              ? 1
              : 0);
        }
        return { name: c.firstName, age, dob };
      }),
    };
  }

  async function send(
    agentId: AgentId,
    history: Msg[],
    nextProfile: Profile,
    handoverArg: string | null = handover,
  ) {
    setLoading(true);
    try {
      const apiMessages = history
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            m.role === "user" || m.role === "assistant",
        )
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: agentId,
          messages: apiMessages,
          profile: nextProfile,
          completed,
          companyContext,
          // A fresh event agent (its opener) must not inherit another agent's
          // working state — start it empty.
          workingState:
            history.length === 1 &&
            (history[0] as { content?: string }).content === "[commissioned]"
              ? []
              : workingState,
          handover: agentId !== "dot" ? handoverArg : null,
          drivingContext: agentId === "driving" ? drivingContextFor() : null,
          selfEmployedContext: agentId === "sol" ? selfEmployedContextFor() : null,
          familyContext: agentId === "fay" ? familyContextFor() : null,
          permissions: agentPermissions[agentId] ?? DEFAULT_PERMISSIONS,
        }),
      });
      const data = await res.json();
      // Never act on something already done this session, even if the model asks.
      const willAct =
        data.pendingAction && !completed.includes(data.pendingAction.serviceId);
      const next: Msg[] = [...history];
      if (data.reply) next.push({ role: "assistant", content: data.reply });
      else if (willAct)
        next.push({
          role: "assistant",
          content: `I'll take care of that — I just need you to sign in to ${data.pendingAction.label} first.`,
        });
      setThread(agentId, next);
      if (data.profile) setProfile(data.profile);
      if (data.companyContext) setCompanyContext(data.companyContext);
      if (Array.isArray(data.workingState)) setWorkingState(data.workingState);
      setSuggestions({
        agent: agentId,
        items: Array.isArray(data.suggestions) ? data.suggestions : [],
      });
      if (data.introduce?.agentId) introduceSpecialist(data.introduce.agentId, agentId);
      if (data.retire) {
        setRoster((r) =>
          r.map((x) => (x.id === agentId ? { ...x, state: "stood-down" } : x)),
        );
      }
      if (willAct) {
        setActingAgent(agentId);
        setPendingAction(data.pendingAction);
        beginAuth(data.pendingAction, data.profile ?? nextProfile);
      }
    } finally {
      setLoading(false);
    }
  }

  // On reopening a persona with history, ask Dot to generate a "where things
  // stand" recap and a short title for each agent's conversation. One call,
  // grounded only in what's actually happened.
  async function runResume(
    prof: Profile,
    rosterArg: RosterEntry[],
    threadsArg: Record<AgentId, Msg[]>,
  ) {
    const digests: Record<string, string> = {};
    for (const entry of rosterArg) {
      const lines = (threadsArg[entry.id] ?? [])
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            (m.role === "user" || m.role === "assistant") &&
            !HIDDEN_OPENERS.has(m.content) &&
            !m.content.startsWith("[Inbound"),
        )
        .slice(-6)
        .map(
          (m) =>
            `${m.role === "user" ? "Citizen" : AGENT_META[entry.id].name}: ${m.content}`,
        );
      if (lines.length) digests[entry.id] = lines.join("\n");
    }
    if (!Object.keys(digests).length) {
      setResumeSummary(null);
      setResuming(false);
      return;
    }
    // Land on Dot with a "catching up" state — the prior thread stays hidden
    // behind the tray until the recap streams in (or the citizen picks one).
    setActiveAgent("dot");
    setResuming(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "resume",
          profile: prof,
          roster: rosterArg,
          digests,
        }),
      });
      const data = await res.json();
      setResumeSummary(typeof data.summary === "string" ? data.summary : null);
      setResuming(false);
      if (data.titles && typeof data.titles === "object") {
        setConvoMeta((cm) => {
          const next = { ...cm };
          for (const [aid, title] of Object.entries(data.titles as Record<string, string>)) {
            const id = aid as AgentId;
            next[id] = { title, updatedAt: next[id]?.updatedAt ?? Date.now() };
          }
          return next;
        });
      }
    } catch {
      /* recap is a nicety — never block the app on it */
      setResuming(false);
    }
  }

  function introduceSpecialist(agentId: AgentId, by: AgentId) {
    setRoster((r) =>
      r.some((x) => x.id === agentId) ? r : [...r, { id: agentId, state: "introduced" }],
    );
    // The introduction card lands in the thread of whoever made it — Dot, or a
    // specialist coordinating on the citizen's behalf.
    setThread(by, (m) =>
      m.some((x) => x.role === "introduce" && x.agentId === agentId)
        ? m
        : [...m, { role: "introduce", agentId }],
    );
  }

  function commission(agentId: AgentId) {
    // The context to hand over is the thread that actually introduced this
    // agent (where its card sits) — which may not be the one on screen when you
    // commission from the tray. Fall back to the active thread, then to any
    // handover already carried across (e.g. from a partner surface like Cruse).
    const introducer = (Object.keys(threads) as AgentId[]).find((id) =>
      (threads[id] ?? []).some((m) => m.role === "introduce" && m.agentId === agentId),
    );
    const from = introducer ?? activeAgent;
    setRoster((r) =>
      r.map((x) => (x.id === agentId ? { ...x, state: "commissioned" } : x)),
    );
    // Commissioning a third-party agent IS the moment consent is granted.
    if (AGENT_META[agentId].thirdParty) {
      setConsentAt((c) => ({ ...c, [agentId]: Date.now() }));
    }
    setActiveAgent(agentId);
    setAgentDetail(null);
    setTrayOpen(false);
    const fromThread = (threads[from] ?? [])
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          m.role === "user" || m.role === "assistant",
      )
      .filter((m) => !HIDDEN_OPENERS.has(m.content))
      .map((m) => `${m.role === "user" ? "Citizen" : AGENT_META[from].name}: ${m.content}`)
      .join("\n");
    const transcript = fromThread.trim() ? fromThread : handover ?? "";
    setHandover(transcript);
    if ((threads[agentId] ?? []).length === 0 && AGENT_META[agentId].temporary) {
      setWorkingState([]);
    }
    setThreads((t) => {
      if ((t[agentId] ?? []).length === 0) {
        setTimeout(
          () =>
            send(agentId, [{ role: "user", content: "[commissioned]" }], profile, transcript),
          0,
        );
      }
      return t;
    });
  }

  // Snapshot the agent's currently-open thread into the archive if it holds any
  // real exchange, so a swap or a fresh start never loses it.
  function archiveActive(agentId: AgentId) {
    const cur = threads[agentId] ?? [];
    const hasReal = cur.some(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        !HIDDEN_OPENERS.has(m.content) &&
        !m.content.startsWith("[Inbound"),
    );
    if (!hasReal) return;
    setArchived((a) => [
      ...a,
      {
        id: crypto.randomUUID(),
        agentId,
        messages: cur,
        title: convoMeta[agentId]?.title,
        updatedAt: convoMeta[agentId]?.updatedAt ?? Date.now(),
      },
    ]);
  }

  // Start a brand-new conversation with an already-commissioned agent: file the
  // current one away, clear the slate, and let the agent greet fresh.
  function newConversation(agentId: AgentId) {
    archiveActive(agentId);
    setThreads((t) => ({ ...t, [agentId]: [] }));
    setConvoMeta((cm) => {
      const n = { ...cm };
      delete n[agentId];
      return n;
    });
    if (AGENT_META[agentId].temporary) setWorkingState([]);
    setActiveAgent(agentId);
    setResumeSummary(null);
    setResuming(false);
    setTrayOpen(false);
    setAgentDetail(null);
    const opener = agentId === "dot" ? "Hi" : "[commissioned]";
    setTimeout(
      () => send(agentId, [{ role: "user", content: opener }], profile, ""),
      0,
    );
  }

  // Open a conversation from the tray. The active one is a no-op beyond
  // focusing the agent; an archived one is swapped into the active slot.
  function openConversation(agentId: AgentId, convoId: string) {
    setTrayOpen(false);
    setAgentDetail(null);
    setResumeSummary(null);
    setResuming(false);
    if (convoId === `active:${agentId}`) {
      setActiveAgent(agentId);
      return;
    }
    const target = archived.find((c) => c.id === convoId);
    if (!target) {
      setActiveAgent(agentId);
      return;
    }
    archiveActive(agentId);
    setArchived((a) => a.filter((c) => c.id !== convoId));
    setThreads((t) => ({ ...t, [agentId]: target.messages }));
    setConvoMeta((cm) => ({
      ...cm,
      [agentId]: { title: target.title, updatedAt: target.updatedAt },
    }));
    setActiveAgent(agentId);
  }

  function setPermission(agentId: AgentId, patch: Partial<AgentPermissions>) {
    setAgentPermissions((p) => ({
      ...p,
      [agentId]: { ...(p[agentId] ?? DEFAULT_PERMISSIONS), ...patch },
    }));
  }

  // Decommission stands the agent down but keeps every conversation — it's
  // recoverable, never deleted. Re-commissioning brings it straight back.
  function decommissionAgent(agentId: AgentId) {
    if (agentId === "dot") return;
    setRoster((r) =>
      r.map((x) => (x.id === agentId ? { ...x, state: "stood-down" } : x)),
    );
    if (activeAgent === agentId) setActiveAgent("dot");
    setAgentDetail(null);
    setTrayOpen(false);
  }

  function recommissionAgent(agentId: AgentId) {
    setRoster((r) =>
      r.map((x) => (x.id === agentId ? { ...x, state: "commissioned" } : x)),
    );
  }

  // Per-persona persistence: each citizen (and "new user") keeps their own
  // saved session under their own key. The accumulated state is the product —
  // switching between people must never lose it.
  const [ready, setReady] = useState(false);

  function hydrateFrom(s: {
    threads?: Record<AgentId, Msg[]>;
    profile?: Profile;
    wallet?: WalletCard[];
    inboundLog?: InboundEvent[];
    completed?: string[];
    resolved?: Resolves[];
    workingState?: WorkingItem[];
    roster?: RosterEntry[];
    activeAgent?: AgentId;
    companyContext?: unknown;
    handover?: string | null;
    personaRecord?: Record<string, unknown> | null;
    currentUser?: string;
    convoMeta?: Partial<Record<AgentId, ConvoMeta>>;
    archived?: ArchivedConvo[];
    agentPermissions?: Partial<Record<AgentId, AgentPermissions>>;
    consentAt?: Partial<Record<AgentId, number>>;
  }): boolean {
    if (s.threads) setThreads(s.threads);
    setConvoMeta(s.convoMeta ?? {});
    setArchived(Array.isArray(s.archived) ? s.archived : []);
    setAgentPermissions(s.agentPermissions ?? {});
    setConsentAt(s.consentAt ?? {});
    if (s.profile) setProfile(s.profile);
    if (s.wallet) setWallet(s.wallet);
    if (s.inboundLog) setInboundLog(s.inboundLog);
    if (s.completed) setCompleted(s.completed);
    if (s.resolved) setResolved(s.resolved);
    if (s.workingState) setWorkingState(s.workingState);
    if (s.roster) setRoster(s.roster);
    if (s.activeAgent) setActiveAgent(s.activeAgent);
    if (s.companyContext !== undefined) setCompanyContext(s.companyContext);
    if (s.handover !== undefined) setHandover(s.handover ?? null);
    if (s.personaRecord !== undefined) setPersonaRecord(s.personaRecord ?? null);
    if (s.currentUser) setCurrentUser(s.currentUser);
    setSuggestions({ agent: s.activeAgent ?? "dot", items: [] });
    if (s.personaRecord) {
      useAppStore.setState({
        persona: s.currentUser,
        personaData: s.personaRecord as never,
      });
    }
    return !!s.threads?.dot?.length;
  }

  useEffect(() => {
    // A hand-off arriving from a partner surface (Cruse → Iris) takes priority:
    // the conversation carries over and Dot picks up where Sarah left off.
    try {
      const handoff = localStorage.getItem("als-cruse-handoff");
      if (handoff) {
        localStorage.removeItem("als-cruse-handoff");
        const parsed = JSON.parse(handoff);
        startFromCruse(Array.isArray(parsed.messages) ? parsed.messages : []);
        setReady(true);
        return;
      }
    } catch {
      /* fall through to normal restore */
    }
    let restored = false;
    try {
      const lastUser = localStorage.getItem("als-last-user") ?? "new-user";
      const raw = localStorage.getItem(`als-agent-state:${lastUser}`);
      if (raw) {
        const s = JSON.parse(raw);
        restored = hydrateFrom(s);
        if (restored) runResume(s.profile ?? EMPTY, s.roster ?? [], s.threads ?? {});
      }
    } catch {
      /* corrupt state — start fresh */
    }
    if (!restored) {
      send("dot", [{ role: "user", content: "Hi" }], EMPTY);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        `als-agent-state:${currentUser}`,
        JSON.stringify({
          threads,
          profile,
          wallet,
          inboundLog,
          completed,
          resolved,
          workingState,
          roster,
          activeAgent,
          companyContext,
          handover,
          personaRecord,
          currentUser,
          convoMeta,
          archived,
          agentPermissions,
          consentAt,
        }),
      );
      localStorage.setItem("als-last-user", currentUser);
    } catch {
      /* storage full or unavailable — non-fatal */
    }
  }, [
    ready,
    threads,
    profile,
    wallet,
    inboundLog,
    completed,
    resolved,
    workingState,
    roster,
    activeAgent,
    companyContext,
    handover,
    personaRecord,
    currentUser,
    convoMeta,
    archived,
    agentPermissions,
    consentAt,
  ]);

  // When the login wall closes, decide whether the agent's action completed.
  useEffect(() => {
    if (!pendingAction || sheetType === "login") return;
    const a = pendingAction.auth;
    const signedIn =
      a.login === "government-gateway" ? gatewayVerified : oneLoginVerified;
    const idOk = a.identityVerification ? identityVerified : true;
    if (signedIn && idOk) {
      setCompleted((c) =>
        c.includes(pendingAction.serviceId) ? c : [...c, pendingAction.serviceId],
      );
      if (pendingAction.resolves) {
        const r = pendingAction.resolves;
        setResolved((prev) =>
          prev.some((x) => x.list === r.list && x.key === r.key) ? prev : [...prev, r],
        );
      }
      const who = String(profile.identity.fullName || profile.identity.name || "You");
      setThread(actingAgent, (m) => [
        ...m,
        {
          role: "receipt",
          content: pendingAction.label,
          receipt: {
            label: pendingAction.label,
            dataShared: pendingAction.dataShared,
            via: a.login,
            idv: !!a.identityVerification,
            reason: pendingAction.reason,
            approver: who,
            at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            serviceId: pendingAction.serviceId,
            resolves: pendingAction.resolves,
          },
        },
        {
          role: "assistant",
          content:
            "Done — you didn't have to touch government yourself. The receipt above shows exactly what I shared. You can ask why I did it, or undo it, any time.",
        },
      ]);
    }
    setPendingAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetType, oneLoginVerified, gatewayVerified, identityVerified]);

  const messages = threads[activeAgent] ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading, resumeSummary, reveal]);

  // Type the recap out in real time once it arrives.
  useEffect(() => {
    if (!resumeSummary) {
      setReveal(0);
      return;
    }
    setReveal(0);
    let n = 0;
    const id = setInterval(() => {
      n += 3;
      setReveal(n);
      if (n >= resumeSummary.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [resumeSummary]);

  function submitText(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setThread(activeAgent, next);
    setInput("");
    setResumeSummary(null);
    setResuming(false);
    setSuggestions({ agent: activeAgent, items: [] });
    send(activeAgent, next, profile);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitText(input);
  }

  // Safe to be wrong: any action can be reversed. Undo reverts the state it
  // changed and leaves a record of both the action and the reversal.
  function undoAction(agent: AgentId, receipt: Receipt) {
    setCompleted((c) => c.filter((id) => id !== receipt.serviceId));
    if (receipt.resolves) {
      const r = receipt.resolves;
      setResolved((prev) =>
        prev.filter((x) => !(x.list === r.list && x.key === r.key)),
      );
    }
    setThread(agent, (m) => {
      let flipped = false;
      const next = m.map((msg) => {
        if (
          !flipped &&
          msg.role === "receipt" &&
          msg.receipt.serviceId === receipt.serviceId &&
          !msg.receipt.undone
        ) {
          flipped = true;
          return { ...msg, receipt: { ...msg.receipt, undone: true } };
        }
        return msg;
      });
      return [
        ...next,
        {
          role: "assistant",
          content:
            "Undone. I've reversed that — nothing was submitted, and there's a record of both the action and the reversal.",
        },
      ];
    });
  }

  // An inbound government message: it never becomes a mailbox item. The facts
  // land in the wallet (known); the active agent metabolises the rest and
  // offers any action (done). The original stays one tap away.
  function fireInbound(ev: InboundEvent) {
    setInboundMenu(false);
    // Everything that arrives is recorded, always — even the silent ones.
    setInboundLog((l) => [...l, ev]);
    const cards: WalletCard[] = ev.facts.map((f) => ({
      key: f.key,
      title: f.label,
      issuer: ev.from,
      primary: f.value,
      secondary: `Updated ${ev.from === "HMRC" ? "by HMRC" : "just now"}`,
      status: "info",
      original: ev.original,
    }));
    if (cards.length) {
      setWallet((w) => {
        const have = new Set(w.map((x) => x.key));
        return [...w, ...cards.filter((x) => !have.has(x.key))];
      });
    }
    // Silent: absorbed without troubling the citizen. It only shows up in the
    // "everything that came in" archive — nothing else changes.
    if (ev.silent) return;
    setInboundNotif({ from: ev.from, body: ev.notifBody });
    const next: Msg[] = [...messages, { role: "user", content: ev.agentMessage }];
    setThread(activeAgent, next);
    setSuggestions({ agent: activeAgent, items: [] });
    send(activeAgent, next, profile);
  }

  useEffect(() => {
    if (!inboundNotif) return;
    const t = setTimeout(() => setInboundNotif(null), 5000);
    return () => clearTimeout(t);
  }, [inboundNotif]);

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => setPersonas(d.personas ?? []))
      .catch(() => {});
  }, []);

  // Become a different citizen (or a fresh, unknown one). Loads their identity
  // and wallet; Dot greets whoever they now are.
  async function loadPersona(id: string | null) {
    const userId = id ?? "new-user";
    setPersonaMenu(false);
    if (userId === currentUser) return;
    // Restore this citizen's own saved session, if they have one.
    try {
      const raw = localStorage.getItem(`als-agent-state:${userId}`);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.threads?.dot?.length) {
          hydrateFrom(s);
          runResume(s.profile ?? EMPTY, s.roster ?? [], s.threads ?? {});
          return;
        }
      }
    } catch {
      /* fall through to a fresh session */
    }
    // No saved session — seed fresh. Set currentUser FIRST so the save effect
    // never writes this reset into the previous persona's slot.
    setResumeSummary(null);
    setResuming(false);
    setConvoMeta({});
    setArchived([]);
    setAgentPermissions({});
    setConsentAt({});
    setAgentDetail(null);
    setCurrentUser(userId);
    setPersonaRecord(null);
    setInboundLog([]);
    setWorkingState([]);
    setCompleted([]);
    setResolved([]);
    setWallet([]);
    setRoster([{ id: "dot", state: "commissioned" }]);
    setActiveAgent("dot");
    setCompanyContext(null);
    setHandover(null);
    setSuggestions({ agent: "dot", items: [] });
    setThreads({ dot: [], reg: [], grace: [], driving: [], sol: [], robin: [], fay: [], cass: [], iris: [] });
    if (!id) {
      setProfile(EMPTY);
      send("dot", [{ role: "user", content: "Hi" }], EMPTY);
      return;
    }
    try {
      const res = await fetch(`/api/personas/${id}`);
      const data = await res.json();
      const persona = data.persona as Record<string, unknown>;
      setPersonaRecord(persona);
      const prof = personaToProfile(persona);
      setProfile(prof);
      const creds = Array.isArray(persona.credentials)
        ? (persona.credentials as Record<string, unknown>[])
        : [];
      setWallet(creds.map(personaCredToCard));
      send("dot", [{ role: "user", content: "Hi" }], prof);
    } catch {
      /* ignore */
    }
  }

  // Load a curated demo persona: their identity and wallet, their situation
  // pre-seeded so Dot opens proactively, and the relevant agents already
  // commissioned. Lands on Dot's proactive opener.
  async function startDemo(demo: DemoPersona) {
    setPendingDemo(null);
    if (demo.id === currentUser) return;
    setResumeSummary(null);
    setResuming(false);
    setConvoMeta({});
    setArchived([]);
    setAgentPermissions({});
    setConsentAt({});
    setAgentDetail(null);
    setCurrentUser(demo.id);
    setInboundLog([]);
    setWorkingState([]);
    setCompleted([]);
    setResolved([]);
    setSuggestions({ agent: "dot", items: [] });
    setThreads({ dot: [], reg: [], grace: [], driving: [], sol: [], robin: [], fay: [], cass: [], iris: [] });
    setRoster([
      { id: "dot", state: "commissioned" },
      ...demo.agents.map((a) => ({ id: a as AgentId, state: "commissioned" as const })),
      ...(demo.introduced ?? []).map((a) => ({ id: a as AgentId, state: "introduced" as const })),
    ]);
    setActiveAgent("dot");
    setHandover(null);
    setCompanyContext(demo.companyContext ?? null);
    try {
      const res = await fetch(`/api/personas/${demo.id}`);
      const data = await res.json();
      const persona = data.persona as Record<string, unknown>;
      setPersonaRecord(persona);
      const base = personaToProfile(persona);
      const prof: Profile = {
        ...base,
        responsibilities: dedupeEntries([...base.responsibilities, ...demo.seed.responsibilities]),
        liabilities: dedupeEntries([...base.liabilities, ...demo.seed.liabilities]),
        eligibilities: dedupeEntries([...base.eligibilities, ...demo.seed.eligibilities]),
      };
      setProfile(prof);
      const creds = Array.isArray(persona.credentials)
        ? (persona.credentials as Record<string, unknown>[])
        : [];
      setWallet(creds.map(personaCredToCard));
      send("dot", [{ role: "user", content: "Hi" }], prof);
    } catch {
      /* ignore */
    }
  }

  // Arrive from a partner surface (Cruse). The conversation Sarah had with Iris
  // is the same persistent thing — it carries over. Iris is already commissioned
  // and holds that thread; she's handed to Grace; and Dot opens already knowing
  // where Sarah left off. Nothing is re-entered.
  async function startFromCruse(irisMessages: Msg[]) {
    const demo = DEMO_PERSONAS.find((d) => d.id === "sarah-okafor");
    if (!demo) return;
    setResumeSummary(null);
    setResuming(false);
    setArchived([]);
    setAgentPermissions({});
    setAgentDetail(null);
    setCurrentUser(demo.id);
    setInboundLog([]);
    setWorkingState([]);
    setCompleted([]);
    setResolved([]);
    setSuggestions({ agent: "dot", items: [] });
    setCompanyContext(null);
    const irisThread: Msg[] = [
      ...irisMessages.filter((m) => m.role === "user" || m.role === "assistant"),
      {
        role: "assistant",
        content:
          "I've asked your government agents to pick this up so you never have to start again anywhere. Grace will carry the official side — registration, Tell Us Once, pensions and benefits — and I'm still right here for you whenever you need me.",
      },
      { role: "introduce", agentId: "grace" },
    ];
    setThreads({
      dot: [], reg: [], grace: [], driving: [], sol: [], robin: [], fay: [], cass: [],
      iris: irisThread,
    });
    // Grace is brought in as part of the hand-off — not left for Sarah to find
    // and commission. She's a government agent, so no extra consent step.
    setRoster([
      { id: "dot", state: "commissioned" },
      { id: "iris", state: "commissioned" },
      { id: "grace", state: "commissioned" },
    ]);
    setConsentAt({ iris: Date.now() });
    setConvoMeta({
      iris: { title: "Talking to Iris · Cruse", updatedAt: Date.now() },
      grace: { title: "David's affairs", updatedAt: Date.now() },
    });
    setActiveAgent("dot");
    // The context Iris gathered — handed to Grace so she opens already knowing.
    const transcript = irisMessages
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          (m.role === "user" || m.role === "assistant") && m.content !== "Hi",
      )
      .map((m) => `${m.role === "user" ? "Citizen" : "Iris (Cruse)"}: ${m.content}`)
      .join("\n");
    setHandover(transcript);
    try {
      const res = await fetch(`/api/personas/${demo.id}`);
      const data = await res.json();
      const persona = data.persona as Record<string, unknown>;
      setPersonaRecord(persona);
      const base = personaToProfile(persona);
      const prof: Profile = {
        ...base,
        responsibilities: dedupeEntries([...base.responsibilities, ...demo.seed.responsibilities]),
        liabilities: dedupeEntries([...base.liabilities, ...demo.seed.liabilities]),
        eligibilities: dedupeEntries([...base.eligibilities, ...demo.seed.eligibilities]),
      };
      setProfile(prof);
      const creds = Array.isArray(persona.credentials)
        ? (persona.credentials as Record<string, unknown>[])
        : [];
      setWallet(creds.map(personaCredToCard));
      // Grace opens already briefed with everything Iris gathered.
      setTimeout(
        () => send("grace", [{ role: "user", content: "[commissioned]" }], prof, transcript),
        0,
      );
      // Dot recaps — she knows where Sarah left off, and that Grace is in and briefed.
      runResume(
        prof,
        [
          { id: "iris", state: "commissioned" },
          { id: "grace", state: "commissioned" },
        ],
        {
          dot: [], reg: [], grace: [
            {
              role: "assistant",
              content:
                "Grace has just been brought in to carry the official government side after the death — registration, Tell Us Once, pensions and benefits — and has been briefed with everything Sarah told Iris.",
            },
          ], driving: [], sol: [], robin: [], fay: [], cass: [],
          iris: irisThread,
        },
      );
    } catch {
      /* ignore */
    }
  }

  const visible = messages.filter(
    (m, i) =>
      !(i === 0 && m.role === "user" && HIDDEN_OPENERS.has(m.content)) &&
      !(m.role === "user" && m.content.startsWith("[Inbound")),
  );

  const identityRows = Object.entries(profile.identity).filter(
    ([, v]) => v != null && v !== "",
  );
  // Rationalise the "what your agents know" frame: collapse entries that say
  // the same thing in different words, so it reads as one clear list.
  const responsibilities = dedupeEntries(profile.responsibilities);
  const liabilities = dedupeEntries(profile.liabilities);
  const eligibilities = dedupeEntries(profile.eligibilities);
  const known =
    identityRows.length +
    responsibilities.length +
    liabilities.length +
    eligibilities.length;

  // Mark discovered entries an action has discharged, and surface any
  // resolution that was never recorded as a fact of its own.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  function withResolved(
    list: "liabilities" | "eligibilities",
    entries: Entry[],
  ): ChipItem[] {
    const rs = resolved.filter((r) => r.list === list);
    const matched = (r: Resolves) =>
      entries.find((e) => norm(e.key + e.label).includes(norm(r.key)));
    const items: ChipItem[] = entries.map((e) => ({
      label: e.label,
      done: rs.some((r) => matched(r) === e),
    }));
    for (const r of rs) if (!matched(r)) items.push({ label: r.label, done: true });
    return items;
  }

  // A done lozenge should surface the receipt that discharged it — find the
  // conversation (active or archived) whose receipt resolves this item.
  function findReceiptFor(label: string): { agentId: AgentId; convoId: string } | null {
    const t = norm(label);
    const hit = (m: Msg) =>
      m.role === "receipt" &&
      !!m.receipt.resolves &&
      (norm(m.receipt.resolves.label) === t ||
        t.includes(norm(m.receipt.resolves.key)) ||
        norm(m.receipt.resolves.label).includes(t) ||
        t.includes(norm(m.receipt.resolves.label)));
    for (const id of Object.keys(threads) as AgentId[]) {
      if ((threads[id] ?? []).some(hit)) return { agentId: id, convoId: `active:${id}` };
    }
    for (const a of archived) {
      if (a.messages.some(hit)) return { agentId: a.agentId, convoId: a.id };
    }
    return null;
  }

  // Tapping a fact in "what your agents know" hands it to the right agent,
  // mid-flight: an action-framed opener for live items, the receipt for done
  // ones. Routes to the matching specialist if it's commissioned, else Dot.
  function pickKnowledge(
    list: "responsibilities" | "liabilities" | "eligibilities",
    item: ChipItem,
  ) {
    setTrayOpen(false);
    setAgentDetail(null);
    if (item.done) {
      const loc = findReceiptFor(item.label);
      if (loc) {
        openConversation(loc.agentId, loc.convoId);
        return;
      }
    }
    const cand = topicAgent(item.label);
    const agent: AgentId =
      cand !== "dot" && roster.some((r) => r.id === cand && r.state === "commissioned")
        ? cand
        : "dot";
    const clean = item.label.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const text = item.done
      ? `Can you remind me what happened with ${clean}?`
      : list === "liabilities"
        ? `I'd like to sort ${clean}.`
        : list === "eligibilities"
          ? `I think I might be entitled to ${clean} — can you help me with it?`
          : `Can you help me with ${clean}?`;
    setActiveAgent(agent);
    setResumeSummary(null);
    setResuming(false);
    const cur = threads[agent] ?? [];
    const next: Msg[] = [...cur, { role: "user", content: text }];
    setThread(agent, next);
    setSuggestions({ agent, items: [] });
    send(agent, next, profile);
  }

  const active = AGENT_META[activeAgent];
  // The resume landing: Dot's welcome + streamed recap, shown instead of the
  // thread. The prior conversation is a tap away in the tray.
  const landing = activeAgent === "dot" && (resuming || !!resumeSummary);

  return (
    <div className="h-screen w-screen flex bg-[#faf9f7] text-[#1a1a1a] overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="px-6 py-4 flex items-center gap-3 border-b border-black/5">
          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            aria-label="Your agents"
            className="text-[#505a5f] hover:text-[#1a1a1a] transition-colors -ml-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <AgentAvatar id={activeAgent} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{active.name}</p>
            {active.provider && (
              <p className="text-[11px] text-[#8a8a8a] leading-tight">
                {active.provider}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowWallet(true)}
            aria-label="Wallet"
            className="text-[#8a8a8a] hover:text-[#1a1a1a] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="13" rx="2.5" />
              <path d="M3 10h18" />
              <circle cx="17" cy="14" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setInboundMenu((v) => !v)}
              aria-label="Simulate inbound post"
              className="text-[#8a8a8a] hover:text-[#1a1a1a] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            {inboundMenu && (
              <div className="absolute right-0 top-9 z-50 w-64 rounded-xl border border-black/10 bg-white shadow-lg p-1">
                <p className="px-3 py-1.5 text-[10px] tracking-wide text-[#8a8a8a]">
                  Simulate inbound post
                </p>
                {INBOUND_EVENTS.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => fireInbound(ev)}
                    className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-black/[0.03]"
                  >
                    <span className="font-medium">{ev.from}</span> — {ev.notifBody}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPersonaMenu((v) => !v)}
              className="text-[10px] font-medium tracking-wide text-[#505a5f] border border-black/10 rounded-full pl-2 pr-1.5 py-0.5 hover:border-black/20 flex items-center gap-1 transition-colors"
            >
              {currentUser === "new-user"
                ? "New user"
                : personas.find((p) => p.id === currentUser)?.name ?? "Citizen"}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {personaMenu && (
              <div className="absolute right-0 top-8 z-50 w-64 rounded-xl border border-black/10 bg-white shadow-lg p-1 max-h-[70vh] overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] tracking-wide text-[#8a8a8a]">
                  Switch citizen
                </p>
                <button
                  type="button"
                  onClick={() => loadPersona(null)}
                  className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-black/[0.03] flex items-center gap-2.5"
                >
                  <span className="w-6 h-6 rounded-full bg-[#1d70b8]/10 text-[#1d70b8] flex items-center justify-center text-sm shrink-0">
                    +
                  </span>
                  New user (start fresh)
                </button>
                {DEMO_PERSONAS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setPersonaMenu(false);
                      setPendingDemo(d);
                    }}
                    className="w-full text-left rounded-lg px-3 py-2 hover:bg-black/[0.03] flex items-center gap-2.5"
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white shrink-0"
                      style={{ background: d.accent }}
                    >
                      {d.headline
                        .split("·")[0]
                        .trim()
                        .split(/\s|&/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm truncate">
                        {d.headline.split("·")[0].trim()}
                      </span>
                      <span className="block text-[11px] text-[#8a8a8a] truncate">
                        {d.archetype}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-[640px] mx-auto space-y-5">
            {landing ? (
              resumeSummary ? (
                <div className="flex">
                  <div className="text-[15px] leading-relaxed max-w-[85%] prose prose-sm prose-neutral max-w-none prose-p:my-2 prose-ul:my-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {resumeSummary.slice(0, reveal)}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c4c4c4] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c4c4c4] animate-bounce [animation-delay:120ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c4c4c4] animate-bounce [animation-delay:240ms]" />
                </div>
              )
            ) : (
              <>
            {visible.map((m, i) =>
              m.role === "receipt" ? (
                <ReceiptCard
                  key={i}
                  receipt={m.receipt}
                  onUndo={() => undoAction(activeAgent, m.receipt)}
                />
              ) : m.role === "introduce" ? (
                <CommissioningCard
                  key={i}
                  agentId={m.agentId}
                  commissioned={
                    roster.find((x) => x.id === m.agentId)?.state !== "introduced"
                  }
                  onCommission={() => commission(m.agentId)}
                  onOpen={() => setActiveAgent(m.agentId)}
                />
              ) : (
                <div
                  key={i}
                  className={m.role === "user" ? "flex justify-end" : "flex"}
                >
                  {m.role === "user" ? (
                    <div className="bg-[#1d70b8] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] max-w-[80%]">
                      {m.content}
                    </div>
                  ) : (
                    <div className="text-[15px] leading-relaxed max-w-[85%] prose prose-sm prose-neutral max-w-none prose-p:my-2 prose-ul:my-2 prose-headings:mt-3 prose-headings:mb-1.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ),
            )}
            {loading && (
              <div className="flex gap-1.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4c4c4] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4c4c4] animate-bounce [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4c4c4] animate-bounce [animation-delay:240ms]" />
              </div>
            )}
            {!loading &&
              suggestions.agent === activeAgent &&
              suggestions.items.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {suggestions.items.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => submitText(s.message)}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-black/[0.02]"
                      style={{ borderColor: `${active.accent}55`, color: active.accent }}
                    >
                      {s.label}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
              </>
            )}
          </div>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-4 border-t border-black/5">
          <div className="max-w-[640px] mx-auto flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${active.name}…`}
              className="flex-1 bg-white border border-black/10 rounded-full px-4 py-2.5 text-[15px] focus:outline-none focus:border-[#1d70b8]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-full bg-[#1d70b8] text-white flex items-center justify-center disabled:opacity-30 transition-opacity"
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </form>

        {trayOpen && (
          <AgentTray
            roster={roster}
            activeAgent={activeAgent}
            conversations={trayConversations(threads, convoMeta, archived)}
            onClose={() => setTrayOpen(false)}
            onOpenConversation={openConversation}
            onNewConversation={newConversation}
            onOpenDetail={(id) => {
              setAgentDetail(id);
              setTrayOpen(false);
            }}
          />
        )}

        {agentDetail && (
          <AgentDetailView
            agentId={agentDetail}
            state={roster.find((x) => x.id === agentDetail)?.state ?? "commissioned"}
            permissions={agentPermissions[agentDetail] ?? DEFAULT_PERMISSIONS}
            activity={agentActivity(agentDetail, threads, archived, convoMeta)}
            consentAt={consentAt[agentDetail]}
            onClose={() => setAgentDetail(null)}
            onSetPermission={(patch) => setPermission(agentDetail, patch)}
            onNewConversation={() => newConversation(agentDetail)}
            onCommission={() => commission(agentDetail)}
            onDecommission={() => decommissionAgent(agentDetail)}
            onRecommission={() => recommissionAgent(agentDetail)}
          />
        )}
      </main>

      <aside className="w-[320px] shrink-0 border-l border-black/5 bg-white/60 overflow-y-auto hidden md:block">
        {active.temporary ? (
          <WorkingPanel name={active.name} items={workingState} />
        ) : (
          <>
        <div className="px-5 py-4 border-b border-black/5">
          <p className="text-sm font-semibold">What your agents know</p>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            {known === 0 ? "Nothing yet — say hello." : `${known} things so far`}
          </p>
        </div>

        {wallet.length > 0 && (
          <PanelSection title="Wallet">
            <div className="space-y-2">
              {wallet.slice(0, 4).map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{c.title}</p>
                    <p className="text-[10px] text-[#8a8a8a]">{c.issuer}</p>
                  </div>
                  {c.original && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingOriginal({ source: c.issuer, original: c.original! })
                      }
                      className="text-[10px] font-medium text-[#1d70b8] shrink-0 hover:underline"
                    >
                      View original
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setShowWallet(true)}
                className="text-[11px] font-medium text-[#1d70b8] hover:underline pt-1"
              >
                Open wallet →
              </button>
            </div>
          </PanelSection>
        )}

        <PanelSection title="You">
          {identityRows.length === 0 ? (
            <Empty />
          ) : (
            identityRows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1">
                <span className="text-xs text-[#8a8a8a] capitalize">
                  {k.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-medium text-right">{String(v)}</span>
              </div>
            ))
          )}
        </PanelSection>

        <PanelSection title="Responsible for">
          <Chips
            items={responsibilities.map((r) => ({ label: r.label }))}
            accent="#1d70b8"
            onPick={(it) => pickKnowledge("responsibilities", it)}
          />
        </PanelSection>
        <PanelSection title="Liable for">
          <Chips
            items={withResolved("liabilities", liabilities)}
            accent="#b45309"
            onPick={(it) => pickKnowledge("liabilities", it)}
          />
        </PanelSection>
        <PanelSection title="Eligible for">
          <Chips
            items={withResolved("eligibilities", eligibilities)}
            accent="#00703c"
            onPick={(it) => pickKnowledge("eligibilities", it)}
          />
        </PanelSection>
          </>
        )}

        {inboundLog.length > 0 && (
          <button
            type="button"
            onClick={() => setShowArchive(true)}
            className="w-full text-left px-5 py-4 border-t border-black/5 flex items-center gap-2 text-xs text-[#505a5f] hover:text-[#1a1a1a] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-6l-2 3h-4l-2-3H2" />
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
            Everything that came in ({inboundLog.length})
          </button>
        )}
      </aside>

      <OneLoginNotification />

      {pendingDemo && (
        <PersonaBriefing
          demo={pendingDemo}
          onStart={() => startDemo(pendingDemo)}
          onClose={() => setPendingDemo(null)}
        />
      )}

      {showWallet && (
        <div className="fixed inset-0 z-[60] flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowWallet(false)}
          />
          <div className="relative ml-auto w-full max-w-[420px] h-full bg-[#f2f2f5] shadow-xl flex flex-col">
            <div className="px-5 py-4 flex items-center justify-between border-b border-black/5">
              <div>
                <p className="text-base font-semibold">Wallet</p>
                <p className="text-xs text-[#8a8a8a]">
                  {wallet.length} card{wallet.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWallet(false)}
                aria-label="Close"
                className="text-[#8a8a8a] hover:text-[#1a1a1a]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {wallet.length === 0 ? (
                <p className="text-sm text-[#8a8a8a] text-center pt-16 px-6">
                  No cards yet. Credentials appear here as government issues them
                  — and as your agents earn them for you.
                </p>
              ) : (
                wallet.map((c) => (
                  <WalletCardView
                    key={c.key}
                    card={c}
                    onViewOriginal={
                      c.original
                        ? () =>
                            setViewingOriginal({ source: c.issuer, original: c.original! })
                        : undefined
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {inboundNotif && (
        <button
          type="button"
          onClick={() => setInboundNotif(null)}
          className="fixed top-3 inset-x-3 z-[9999] text-left animate-[slideDown_0.3s_ease-out] max-w-[420px] mx-auto"
        >
          <div className="rounded-2xl bg-white/90 backdrop-blur-xl shadow-lg border border-black/5 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-black flex items-center justify-center">
                <span className="text-[7px] font-bold text-white leading-none">GOV</span>
              </div>
              <span className="text-xs font-semibold flex-1">{inboundNotif.from}</span>
              <span className="text-[11px] text-[#8a8a8a]">now</span>
            </div>
            <p className="text-sm leading-snug">{inboundNotif.body}</p>
          </div>
        </button>
      )}

      {sheetType === "login" && (
        <BottomSheet open onClose={closeBottomSheet} title="Sign in">
          <LoginSheet />
        </BottomSheet>
      )}

      {showArchive && (
        <BottomSheet
          open
          onClose={() => setShowArchive(false)}
          title="Everything that came in"
        >
          <div className="px-1 pb-4">
            <p className="text-[11px] text-[#8a8a8a] mb-3">
              Every message government has sent you — nothing is hidden, even the
              ones your agents handled quietly without troubling you.
            </p>
            <div className="space-y-2">
              {inboundLog.length === 0 ? (
                <p className="text-xs text-[#c4c4c4]">Nothing yet.</p>
              ) : (
                inboundLog.map((ev, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-black/10 p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold">{ev.from}</p>
                        {ev.silent && (
                          <span className="text-[9px] font-medium text-[#8a8a8a] bg-black/[0.04] rounded-full px-1.5 py-0.5">
                            handled quietly
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#505a5f] truncate">
                        {ev.notifBody}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setViewingOriginal({ source: ev.from, original: ev.original })
                      }
                      className="text-[10px] font-medium text-[#1d70b8] shrink-0 hover:underline"
                    >
                      View original
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </BottomSheet>
      )}

      {viewingOriginal && (
        <BottomSheet
          open
          onClose={() => setViewingOriginal(null)}
          title={`From ${viewingOriginal.source}`}
        >
          <div className="px-1 pb-4">
            <p className="text-[11px] text-[#8a8a8a] mb-2">
              The original. You never had to open this — {viewingOriginal.source}{" "}
              sent it, your agent handled it.
            </p>
            <div className="whitespace-pre-wrap text-[13px] text-[#333] leading-relaxed rounded-lg border border-black/10 bg-[#faf9f7] p-3">
              {viewingOriginal.original}
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function AgentAvatar({ id, className }: { id: AgentId; className?: string }) {
  const m = AGENT_META[id];
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white shrink-0 ${className ?? "w-7 h-7"}`}
      style={{ background: m.accent }}
    >
      {id === "dot" ? (
        <span className="w-2 h-2 rounded-full bg-white" />
      ) : (
        <span className="text-xs font-semibold">{m.name[0]}</span>
      )}
    </div>
  );
}

function TrayTag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[9px] font-semibold tracking-wide rounded-full px-1.5 py-0.5 shrink-0"
      style={{ color, background: `${color}1a` }}
    >
      {label}
    </span>
  );
}

type TrayConversation = { id: string; title: string; updatedAt?: number };

const isRealMsg = (m: Msg): m is { role: "user" | "assistant"; content: string } =>
  (m.role === "user" || m.role === "assistant") &&
  !HIDDEN_OPENERS.has(m.content) &&
  !m.content.startsWith("[Inbound");

function deriveTitle(messages: Msg[], agentId: AgentId): string {
  const firstAsk = messages.find((m) => isRealMsg(m) && m.role === "user");
  const text = firstAsk && "content" in firstAsk ? firstAsk.content : "";
  if (!text) return AGENT_META[agentId].tagline;
  return text.length > 42 ? `${text.slice(0, 42).trimEnd()}…` : text;
}

/** Every conversation the citizen has with each agent — the one currently open
 *  (id "active:<agent>") plus any archived ones — newest first. */
function trayConversations(
  threads: Record<AgentId, Msg[]>,
  convoMeta: Partial<Record<AgentId, ConvoMeta>>,
  archived: ArchivedConvo[],
): Partial<Record<AgentId, TrayConversation[]>> {
  const out: Partial<Record<AgentId, TrayConversation[]>> = {};
  for (const id of Object.keys(threads) as AgentId[]) {
    const list: TrayConversation[] = [];
    const active = (threads[id] ?? []).filter(isRealMsg);
    if (active.length) {
      list.push({
        id: `active:${id}`,
        title: convoMeta[id]?.title || deriveTitle(threads[id] ?? [], id),
        updatedAt: convoMeta[id]?.updatedAt,
      });
    }
    for (const a of archived.filter((c) => c.agentId === id)) {
      list.push({
        id: a.id,
        title: a.title || deriveTitle(a.messages, id),
        updatedAt: a.updatedAt,
      });
    }
    list.sort((x, y) => (y.updatedAt ?? 0) - (x.updatedAt ?? 0));
    out[id] = list;
  }
  return out;
}

type AgentActivity = { conversations: number; lastActive?: number; actions: string[] };

/** What an agent has actually been doing: how many conversations, when it was
 *  last active, and every action it's completed (across active + archived). */
function agentActivity(
  agentId: AgentId,
  threads: Record<AgentId, Msg[]>,
  archived: ArchivedConvo[],
  convoMeta: Partial<Record<AgentId, ConvoMeta>>,
): AgentActivity {
  const threadsForAgent: Msg[][] = [];
  if ((threads[agentId] ?? []).some(isRealMsg)) threadsForAgent.push(threads[agentId]);
  let lastActive = convoMeta[agentId]?.updatedAt;
  for (const a of archived.filter((c) => c.agentId === agentId)) {
    threadsForAgent.push(a.messages);
    if (a.updatedAt && (!lastActive || a.updatedAt > lastActive)) lastActive = a.updatedAt;
  }
  const actions: string[] = [];
  for (const t of threadsForAgent) {
    for (const m of t) {
      if (m.role === "receipt" && !m.receipt.undone) actions.push(m.receipt.label);
    }
  }
  return { conversations: threadsForAgent.length, lastActive, actions };
}

const PenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

function AgentTray({
  roster,
  activeAgent,
  conversations,
  onClose,
  onOpenConversation,
  onNewConversation,
  onOpenDetail,
}: {
  roster: RosterEntry[];
  activeAgent: AgentId;
  conversations: Partial<Record<AgentId, TrayConversation[]>>;
  onClose: () => void;
  onOpenConversation: (agentId: AgentId, convoId: string) => void;
  onNewConversation: (agentId: AgentId) => void;
  onOpenDetail: (agentId: AgentId) => void;
}) {
  return (
    <div className="absolute inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside className="absolute left-0 top-0 bottom-0 w-[300px] bg-white border-r border-black/10 shadow-xl flex flex-col">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[#1a1a1a]">Your agents</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[#8a8a8a] hover:text-[#1a1a1a]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-2 pb-2 overflow-y-auto">
          {roster.map((entry) => {
            const m = AGENT_META[entry.id];
            const list = conversations[entry.id] ?? [];
            const openable = entry.state !== "introduced";
            return (
              <div
                key={entry.id}
                className={`mt-1 ${entry.state === "stood-down" ? "opacity-55" : ""}`}
              >
                {/* Agent — a prominent, tappable section header */}
                <div className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-black/[0.025]">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(entry.id)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                  >
                    <AgentAvatar id={entry.id} className="w-7 h-7 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-[#1a1a1a] truncate">
                          {m.name}
                        </span>
                        {entry.state === "introduced" && (
                          <TrayTag label="Introduced" color={m.accent} />
                        )}
                        {entry.state === "commissioned" && m.temporary && (
                          <TrayTag label="Here for now" color={m.accent} />
                        )}
                        {entry.state === "stood-down" && (
                          <TrayTag label="Stood down" color="#8a8a8a" />
                        )}
                      </span>
                      <span className="block text-[11px] text-[#9a9a9a] truncate">
                        {m.tagline}
                      </span>
                    </span>
                  </button>
                  {openable && (
                    <button
                      type="button"
                      onClick={() => onNewConversation(entry.id)}
                      aria-label={`New conversation with ${m.name}`}
                      title={`New conversation with ${m.name}`}
                      className="shrink-0 text-[#a4a4a4] hover:text-[#1a1a1a] p-1 rounded-md hover:bg-black/[0.04]"
                    >
                      <PenIcon />
                    </button>
                  )}
                </div>

                {/* Conversations under the agent */}
                {openable && list.length > 0 ? (
                  <div className="ml-[26px] mt-0.5">
                    {list.map((c) => {
                      const isActive = entry.id === activeAgent && c.id === `active:${entry.id}`;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onOpenConversation(entry.id, c.id)}
                          className={`w-full flex items-center gap-2.5 rounded-lg pl-2.5 pr-2 py-2 text-left transition-colors ${
                            isActive ? "bg-black/[0.05]" : "hover:bg-black/[0.035]"
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#cbcbcb] shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-[13px] text-[#1a1a1a]">
                            {c.title}
                          </span>
                          {c.updatedAt && (
                            <span className="shrink-0 text-[10px] text-[#b4b4b4]">
                              {timeAgo(c.updatedAt)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : openable ? (
                  <button
                    type="button"
                    onClick={() => onNewConversation(entry.id)}
                    className="ml-[26px] flex items-center gap-2.5 rounded-lg pl-2.5 pr-2 py-2 text-left text-[#a4a4a4] hover:bg-black/[0.035] transition-colors"
                  >
                    <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-dashed border-[#d4d4d4] shrink-0" />
                    <span className="text-[13px]">Start a conversation</span>
                  </button>
                ) : (
                  <p className="ml-[26px] pl-2.5 py-1.5 text-[12px] text-[#c4c4c4]">
                    Introduced — commission from the chat to begin
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-auto px-4 py-3 text-[11px] text-[#b4b4b4]">
          Tap an agent to see what it is and does, or start a new conversation.
        </p>
      </aside>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors shrink-0 ${
        on ? "bg-[#1d70b8]" : "bg-black/15"
      }`}
    >
      <span
        className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function CopyPrompt({
  prompt,
  to,
  accent,
}: {
  prompt: string;
  to?: string;
  accent: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2 flex items-start gap-2">
      <div className="min-w-0 flex-1">
        {to && (
          <p
            className="text-[10px] font-semibold uppercase tracking-wide mb-0.5"
            style={{ color: accent }}
          >
            Paste to {to}
          </p>
        )}
        <p className="text-[13px] text-[#1a1a1a] leading-snug">&ldquo;{prompt}&rdquo;</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(prompt);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors"
        style={{ background: `${accent}14`, color: accent }}
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}

function PersonaBriefing({
  demo,
  onStart,
  onClose,
}: {
  demo: DemoPersona;
  onStart: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
      <div className="relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl bg-[#faf9f7] shadow-2xl">
        <div
          className="h-1.5 w-full rounded-t-2xl"
          style={{ background: demo.accent }}
        />
        <div className="p-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 text-[#8a8a8a] hover:text-[#1a1a1a]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <p
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: demo.accent }}
          >
            {demo.archetype}
          </p>
          <h2 className="text-2xl font-semibold mt-1">{demo.headline}</h2>

          <p className="mt-4 text-[15px] leading-relaxed text-[#2a2a2a]">
            {demo.summary}
          </p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {demo.themes.map((t) => (
              <span
                key={t}
                className="text-xs font-medium rounded-full px-2.5 py-1"
                style={{ background: `${demo.accent}14`, color: demo.accent }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] mb-2">
              Agents already commissioned
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {(["dot", ...demo.agents] as AgentId[]).map((id) => (
                <div key={id} className="flex items-center gap-2">
                  <AgentAvatar id={id} className="w-7 h-7" />
                  <span className="text-[13px] font-medium">{AGENT_META[id].name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] mb-2">
              How to show this off
            </p>
            <ol className="space-y-3">
              {demo.moves.map((m, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="shrink-0 w-5 h-5 rounded-full text-white text-[11px] font-semibold flex items-center justify-center mt-0.5"
                    style={{ background: demo.accent }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-[14px] text-[#2a2a2a]">{m.do}</p>
                    {m.prompt && (
                      <CopyPrompt prompt={m.prompt} to={m.to} accent={demo.accent} />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="mt-7 w-full rounded-xl px-4 py-3.5 text-[15px] font-semibold text-white"
            style={{ background: demo.accent }}
          >
            Start the demo →
          </button>
        </div>
      </div>
    </div>
  );
}

function AgentDetailView({
  agentId,
  state,
  permissions,
  activity,
  consentAt,
  onClose,
  onSetPermission,
  onNewConversation,
  onCommission,
  onDecommission,
  onRecommission,
}: {
  agentId: AgentId;
  state: string;
  permissions: AgentPermissions;
  activity: AgentActivity;
  consentAt?: number;
  onClose: () => void;
  onSetPermission: (patch: Partial<AgentPermissions>) => void;
  onNewConversation: () => void;
  onCommission: () => void;
  onDecommission: () => void;
  onRecommission: () => void;
}) {
  const m = AGENT_META[agentId];
  const [confirmDecom, setConfirmDecom] = useState(false);
  const isDot = agentId === "dot";
  const isThird = !!m.thirdParty;
  const stoodDown = state === "stood-down";
  const introduced = state === "introduced";
  const commissioned = !introduced && !stoodDown;
  return (
    <div className="absolute inset-0 z-40 bg-[#faf9f7] flex flex-col">
      <header className="px-4 py-3 flex items-center gap-2 border-b border-black/5 bg-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="text-[#505a5f] hover:text-[#1a1a1a] -ml-1 p-1"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="text-sm font-semibold">{m.name}</p>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-6 py-6 space-y-7">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <AgentAvatar id={agentId} className="w-14 h-14" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{m.name}</h2>
                {m.temporary && !stoodDown && (
                  <TrayTag label="Here for now" color={m.accent} />
                )}
                {stoodDown && <TrayTag label="Stood down" color="#8a8a8a" />}
              </div>
              <p className="text-[13px] text-[#6a6a6a]">
                {m.tagline}
                {m.provider ? ` · ${m.provider}` : ""}
              </p>
            </div>
          </div>

          {/* Third-party provenance */}
          {isThird && (
            <div
              className="flex items-start gap-3 rounded-2xl border px-4 py-3"
              style={{ borderColor: `${m.accent}33`, background: `${m.accent}0a` }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={m.accent} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <p className="text-[13px] leading-relaxed text-[#2a2a2a]">
                Not a government agent — provided by <strong>{m.provider}</strong> and certified to act on your behalf by the <strong>{m.certifiedBy}</strong>. Government doesn't build it; it trusts it, with your consent.
              </p>
            </div>
          )}

          {/* What it is */}
          <section className="space-y-2">
            <p className="text-[15px] leading-relaxed text-[#2a2a2a]">{m.about}</p>
          </section>

          {/* What it can do */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] mb-2">
              What {m.name} can do
            </h3>
            <ul className="space-y-2">
              {m.capabilities.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#2a2a2a]">
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={m.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="mt-0.5 shrink-0"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* How to use it */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] mb-2">
              How to use {m.name}
            </h3>
            <p className="text-[14px] text-[#2a2a2a]">{m.useHint}</p>
          </section>

          {/* Access & consent — third-party agents only */}
          {isThird && m.access && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] mb-2">
                {commissioned
                  ? consentAt
                    ? `Access you granted ${timeAgo(consentAt)}`
                    : "Access you've granted"
                  : `What you'd be granting ${m.name}`}
              </h3>
              <div className="rounded-2xl border border-black/[0.07] bg-white px-4 py-3.5">
                <ul className="space-y-2">
                  {m.access.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#2a2a2a]">
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: m.accent }}
                      />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 pt-3 border-t border-black/5 text-[12px] text-[#8a8a8a]">
                  Certified, consented and revocable — you can withdraw {m.name}'s access at any time, and everything she does is recorded and reversible.
                </p>
              </div>
            </section>
          )}

          {/* What it's been doing */}
          {commissioned && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] mb-2">
              What {m.name} has been doing for you
            </h3>
            <div className="rounded-2xl border border-black/[0.07] bg-white divide-y divide-black/5">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-[#6a6a6a]">Conversations</span>
                <span className="text-[14px] font-medium">{activity.conversations}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-[#6a6a6a]">Last active</span>
                <span className="text-[14px] font-medium">
                  {activity.lastActive ? timeAgo(activity.lastActive) : "—"}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-[13px] text-[#6a6a6a] mb-1.5">Actions taken on your behalf</p>
                {activity.actions.length ? (
                  <ul className="space-y-1">
                    {activity.actions.map((a, i) => (
                      <li key={i} className="text-[13px] text-[#2a2a2a] capitalize">
                        · {a}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-[#9a9a9a]">
                    Nothing filed yet — {m.name} only ever acts with your sign-in, and always leaves a receipt.
                  </p>
                )}
              </div>
            </div>
          </section>
          )}

          {/* Permissions */}
          {commissioned && !isDot && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] mb-2">
                Settings &amp; permissions
              </h3>
              <div className="rounded-2xl border border-black/[0.07] bg-white divide-y divide-black/5">
                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium">Act on my behalf</p>
                    <p className="text-[12px] text-[#8a8a8a]">
                      Let {m.name} complete things for you (always with your sign-in).
                    </p>
                  </div>
                  <Toggle
                    on={permissions.canAct}
                    onChange={(v) => onSetPermission({ canAct: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium">Offer proactive suggestions</p>
                    <p className="text-[12px] text-[#8a8a8a]">
                      Let {m.name} surface next steps rather than only answering.
                    </p>
                  </div>
                  <Toggle
                    on={permissions.proactive}
                    onChange={(v) => onSetPermission({ proactive: v })}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Actions */}
          <section className="space-y-2 pb-4">
            {introduced ? (
              <>
                <button
                  type="button"
                  onClick={onCommission}
                  className="w-full rounded-xl px-4 py-3.5 text-[15px] font-semibold text-white"
                  style={{ background: m.accent }}
                >
                  {isThird ? `Grant access & commission ${m.name}` : `Commission ${m.name}`}
                </button>
                <p className="text-center text-[12px] text-[#9a9a9a] pt-1">
                  {isThird
                    ? `${m.name} can't see or do anything until you grant access — and you can withdraw it any time.`
                    : `${m.name} is provisioned by government and ready when you are.`}
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onNewConversation}
                  className="w-full rounded-xl px-4 py-3 text-[14px] font-medium text-white"
                  style={{ background: m.accent }}
                >
                  Start a new conversation
                </button>
                {isDot ? (
                  <p className="text-center text-[12px] text-[#9a9a9a] pt-1">
                    Dot is your way in to government and can't be decommissioned.
                  </p>
                ) : stoodDown ? (
                  <button
                    type="button"
                    onClick={onRecommission}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-[14px] font-medium text-[#1a1a1a] hover:bg-black/[0.02]"
                  >
                    {isThird ? `Grant ${m.name} access again` : `Recommission ${m.name}`}
                  </button>
                ) : confirmDecom ? (
                  <div className="rounded-xl border border-[#d4351c]/30 bg-[#d4351c]/[0.04] p-3 space-y-2">
                    <p className="text-[13px] text-[#2a2a2a]">
                      {isThird
                        ? `Withdraw ${m.name}'s access? She'll no longer be able to see your information or act for you. Your conversations are kept, and you can grant access again any time.`
                        : `Decommission ${m.name}? Your conversations are kept and ${m.name} can be brought back any time.`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={onDecommission}
                        className="flex-1 rounded-lg bg-[#d4351c] px-3 py-2 text-[13px] font-medium text-white"
                      >
                        {isThird ? "Withdraw access" : "Decommission"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDecom(false)}
                        className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-[13px] font-medium"
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDecom(true)}
                    className="w-full rounded-xl px-4 py-3 text-[14px] font-medium text-[#d4351c] hover:bg-[#d4351c]/[0.05]"
                  >
                    {isThird ? `Withdraw ${m.name}'s access` : `Decommission ${m.name}`}
                  </button>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function CommissioningCard({
  agentId,
  commissioned,
  onCommission,
  onOpen,
}: {
  agentId: AgentId;
  commissioned: boolean;
  onCommission: () => void;
  onOpen: () => void;
}) {
  const m = AGENT_META[agentId];
  return (
    <div className="flex">
      <div
        className="max-w-[90%] w-full rounded-2xl border bg-white px-4 py-4"
        style={{ borderColor: `${m.accent}33` }}
      >
        <div className="flex items-center gap-3 mb-3">
          <AgentAvatar id={agentId} className="w-9 h-9" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{m.name}</p>
            <p className="text-[11px] text-[#8a8a8a] leading-tight">
              {m.tagline}
            </p>
          </div>
        </div>
        {m.provider && (
          <p className="text-xs text-[#505a5f] mb-2">
            Provided by <span className="font-medium">{m.provider}</span>
            {m.thirdParty && m.certifiedBy && (
              <> · certified by {m.certifiedBy}</>
            )}
          </p>
        )}
        <p className="text-[13px] text-[#505a5f] leading-relaxed mb-3">
          {m.mandate ?? m.about}
        </p>
        {commissioned ? (
          <button
            type="button"
            onClick={onOpen}
            className="w-full rounded-lg border border-black/10 text-[#1a1a1a] font-medium text-sm py-2.5 hover:bg-black/[0.03] transition-colors flex items-center justify-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00703c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {m.thirdParty ? `Access granted — open ${m.name}` : `Commissioned — open ${m.name}`}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onCommission}
              className="w-full rounded-lg text-white font-semibold text-sm py-2.5 transition-opacity hover:opacity-90"
              style={{ background: m.accent }}
            >
              {m.thirdParty ? `Grant access & commission ${m.name}` : `Commission ${m.name}`}
            </button>
            <p className="text-[11px] text-center text-[#8a8a8a] mt-2">
              {m.thirdParty
                ? "Certified, consented and revocable — withdraw any time."
                : "You can stand them down any time."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<WorkingItem["status"], string> = {
  now: "Now",
  next: "Next",
  waiting: "Waiting",
  done: "Done",
};
const STATUS_COLOR: Record<WorkingItem["status"], string> = {
  now: "#4a7a6f",
  next: "#8a8a8a",
  waiting: "#b45309",
  done: "#00703c",
};
const STATUS_ORDER: WorkingItem["status"][] = ["now", "next", "waiting", "done"];

function WalletCardView({
  card,
  onViewOriginal,
}: {
  card: WalletCard;
  onViewOriginal?: () => void;
}) {
  const accent = issuerAccent(card.issuer);
  const statusText =
    card.status === "expired"
      ? "Expired"
      : card.status === "info"
        ? "Updated"
        : card.status === "valid"
          ? "Valid"
          : "";
  return (
    <div
      className="rounded-2xl p-4 text-white shadow-md relative overflow-hidden min-h-[150px] flex flex-col"
      style={{ background: `linear-gradient(140deg, ${accent}, rgba(0,0,0,0.42))` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide opacity-95">
          {card.issuer}
        </span>
        {statusText && (
          <span
            className="text-[10px] font-medium rounded-full px-2 py-0.5"
            style={{ background: "rgba(255,255,255,0.22)" }}
          >
            {statusText}
          </span>
        )}
      </div>
      <p className="text-lg font-semibold mt-auto">{card.title}</p>
      {card.primary && (
        <p className="text-sm font-mono tracking-wide mt-1 opacity-95 break-all">
          {card.primary}
        </p>
      )}
      <div className="flex items-end justify-between mt-2 gap-2">
        {card.secondary ? (
          <p className="text-xs opacity-80">{card.secondary}</p>
        ) : (
          <span />
        )}
        {onViewOriginal && (
          <button
            type="button"
            onClick={onViewOriginal}
            className="text-[11px] underline opacity-90 shrink-0"
          >
            View original
          </button>
        )}
      </div>
    </div>
  );
}

function WorkingPanel({ name, items }: { name: string; items: WorkingItem[] }) {
  const sorted = [...items].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );
  return (
    <div>
      <div className="px-5 py-4 border-b border-black/5">
        <p className="text-sm font-semibold">What {name} is looking after</p>
        <p className="text-xs text-[#8a8a8a] mt-0.5">
          {items.length === 0
            ? "Nothing yet — just getting started."
            : "So you don't have to hold it."}
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {sorted.length === 0 ? (
          <p className="text-xs text-[#c4c4c4]">—</p>
        ) : (
          sorted.map((it) => (
            <div key={it.key} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: STATUS_COLOR[it.status] }}
              />
              <p
                className={`flex-1 text-[13px] leading-snug ${
                  it.status === "done" ? "text-[#9a9a9a]" : "text-[#1a1a1a]"
                }`}
              >
                {it.label}
              </p>
              <span
                className="text-[10px] font-medium tracking-wide shrink-0 mt-0.5"
                style={{ color: STATUS_COLOR[it.status] }}
              >
                {STATUS_LABEL[it.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReceiptCard({
  receipt,
  onUndo,
}: {
  receipt: Receipt;
  onUndo: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const via =
    receipt.via === "government-gateway"
      ? "Government Gateway"
      : `GOV.UK One Login${receipt.idv ? " · identity verified" : ""}`;

  if (receipt.undone) {
    return (
      <div className="flex">
        <div className="max-w-[85%] rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
          <span className="text-[11px] font-semibold tracking-wide text-[#8a8a8a]">
            Reversed
          </span>
          <p className="text-sm text-[#8a8a8a] capitalize line-through decoration-1 mt-0.5">
            {receipt.label}
          </p>
          <p className="text-xs text-[#8a8a8a] mt-1">
            Undone — nothing was submitted. The action and its reversal are on
            the record.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <div className="max-w-[85%] rounded-xl border border-[#00703c]/25 bg-[#00703c]/[0.06] px-4 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-4 h-4 rounded-full bg-[#00703c] flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold tracking-wide text-[#00703c]">
            Receipt
          </span>
        </div>
        <p className="text-sm font-medium text-[#1a1a1a] capitalize">
          Done — {receipt.label}.
        </p>
        <p className="text-xs text-[#505a5f] mt-1.5">
          Shared: {receipt.dataShared.join(", ")}
        </p>
        <p className="text-xs text-[#505a5f]">Signed in via: {via}</p>

        {showWhy && (
          <div className="mt-2.5 text-xs text-[#505a5f] space-y-1 bg-white/70 rounded-lg p-2.5 border border-[#00703c]/10">
            <p>
              <span className="font-medium text-[#1a1a1a]">Why:</span>{" "}
              {receipt.reason}
            </p>
            <p>
              <span className="font-medium text-[#1a1a1a]">Approved by:</span>{" "}
              {receipt.approver}, via {via}, at {receipt.at}
            </p>
            <p className="text-[#8a8a8a] pt-0.5">
              Recorded, challengeable and reversible.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-[#00703c]/15">
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="text-[11px] font-medium text-[#00703c] hover:underline"
          >
            {showWhy ? "Hide" : "Why did this happen?"}
          </button>
          <button
            type="button"
            onClick={onUndo}
            className="text-[11px] font-medium text-[#505a5f] hover:text-[#1a1a1a] flex items-center gap-1"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
            </svg>
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-black/5">
      <p className="text-[11px] font-semibold tracking-wide text-[#8a8a8a] mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-[#c4c4c4]">—</p>;
}

type ChipItem = { label: string; done?: boolean };

function Chips({
  items,
  accent,
  onPick,
}: {
  items: ChipItem[];
  accent: string;
  onPick?: (it: ChipItem) => void;
}) {
  // The model can record the same thing under two keys; collapse duplicate
  // labels so the panel never shows a chip twice, preferring the resolved one.
  const byLabel = new Map<string, ChipItem>();
  for (const it of items) {
    const prev = byLabel.get(it.label);
    if (!prev || (it.done && !prev.done)) byLabel.set(it.label, it);
  }
  const unique = [...byLabel.values()];
  if (unique.length === 0) return <Empty />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {unique.map((it, i) => {
        const style = it.done
          ? { background: "#00703c14", color: "#00703c" }
          : { background: `${accent}14`, color: accent };
        const inner = (
          <>
            {it.done && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {it.label}
          </>
        );
        return onPick ? (
          <button
            key={`${it.label}-${i}`}
            type="button"
            onClick={() => onPick(it)}
            title={
              it.done
                ? "See what was done about this"
                : "Hand this to the right agent"
            }
            className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 cursor-pointer transition hover:brightness-90 active:scale-[0.97]"
            style={style}
          >
            {inner}
          </button>
        ) : (
          <span
            key={`${it.label}-${i}`}
            className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1"
            style={style}
          >
            {inner}
          </span>
        );
      })}
    </div>
  );
}
