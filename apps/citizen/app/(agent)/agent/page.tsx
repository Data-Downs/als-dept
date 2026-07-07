"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/lib/store";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { LoginSheet } from "@/components/sheets/LoginSheet";
import { OneLoginNotification } from "@/components/OneLoginNotification";

type AgentId = "dot" | "reg" | "grace" | "driving" | "sol" | "robin" | "fay";

const AGENT_META: Record<
  AgentId,
  {
    name: string;
    tagline: string;
    provider: string | null;
    accent: string;
    temporary?: boolean;
    mandate?: string;
  }
> = {
  dot: {
    name: "Dot",
    tagline: "Your way in to government",
    provider: null,
    accent: "#1d70b8",
  },
  reg: {
    name: "Reg",
    tagline: "Limited company agent",
    provider: "Companies House & HMRC",
    accent: "#4c2c92",
    mandate:
      "Keeps your company on the right side of things — confirmation statements, VAT, and corporation tax guidance. He’ll see your company record and can act with Companies House and HMRC on your behalf.",
  },
  grace: {
    name: "Grace",
    tagline: "Bereavement agent",
    provider: "GOV.UK · Tell Us Once",
    accent: "#4a7a6f",
    temporary: true,
    mandate:
      "Stays with you and carries the whole government and admin side after a death — registering, Tell Us Once, pensions and benefits — for as long as you need. She steps back once it’s in hand.",
  },
  driving: {
    name: "Miles",
    tagline: "Licence & vehicles",
    provider: "DVLA & DVSA",
    accent: "#00703c",
    mandate:
      "One agent for your licence and your vehicles — renewals, MOT reminders, vehicle tax and booking tests — across DVLA and DVSA, so you never deal with them separately.",
  },
  sol: {
    name: "Sol",
    tagline: "Working for yourself",
    provider: "HMRC",
    accent: "#b45309",
    mandate:
      "Keeps your tax and your books in order — Self Assessment, deadlines, Making Tax Digital, the VAT line, and what you're owed — so you can get on with the work, never become an accountant.",
  },
  robin: {
    name: "Robin",
    tagline: "New baby",
    provider: "GOV.UK · for new parents",
    accent: "#a84f7a",
    temporary: true,
    mandate:
      "Looks after everything the state needs around your new baby — maternity pay, registering the birth, Child Benefit and childcare — so you can focus on the baby. Steps back once it's all in hand.",
  },
  fay: {
    name: "Fay",
    tagline: "Family & children",
    provider: "HMRC, DfE & your council",
    accent: "#c05746",
    mandate:
      "One agent for everything to do with your children — Child Benefit, childcare, school places, additional needs — so you never chase schools, councils and HMRC separately.",
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

export default function AgentPage() {
  const [threads, setThreads] = useState<Record<AgentId, Msg[]>>({
    dot: [],
    reg: [],
    grace: [],
    driving: [],
    sol: [],
    robin: [],
    fay: [],
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
    // Whoever's thread the card sits in is the one handing over — Dot, or a
    // specialist coordinating on the citizen's behalf (e.g. Grace bringing Reg).
    const from = activeAgent;
    setRoster((r) =>
      r.map((x) => (x.id === agentId ? { ...x, state: "commissioned" } : x)),
    );
    setActiveAgent(agentId);
    setTrayOpen(false);
    const transcript = (threads[from] ?? [])
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          m.role === "user" || m.role === "assistant",
      )
      .filter((m) => !HIDDEN_OPENERS.has(m.content))
      .map((m) => `${m.role === "user" ? "Citizen" : AGENT_META[from].name}: ${m.content}`)
      .join("\n");
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
  }): boolean {
    if (s.threads) setThreads(s.threads);
    setConvoMeta(s.convoMeta ?? {});
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
    setThreads({ dot: [], reg: [], grace: [], driving: [], sol: [], robin: [], fay: [] });
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

  const visible = messages.filter(
    (m, i) =>
      !(i === 0 && m.role === "user" && HIDDEN_OPENERS.has(m.content)) &&
      !(m.role === "user" && m.content.startsWith("[Inbound")),
  );

  const identityRows = Object.entries(profile.identity).filter(
    ([, v]) => v != null && v !== "",
  );
  const known =
    identityRows.length +
    profile.responsibilities.length +
    profile.liabilities.length +
    profile.eligibilities.length;

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
                {personas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => loadPersona(p.id)}
                    className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-black/[0.03] flex items-center gap-2.5"
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white shrink-0"
                      style={{ background: p.color }}
                    >
                      {p.initials}
                    </span>
                    <span className="truncate">{p.name}</span>
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
            conversations={trayConversations(threads, convoMeta)}
            onClose={() => setTrayOpen(false)}
            onOpen={(id) => {
              setActiveAgent(id);
              setResumeSummary(null);
              setResuming(false);
              setTrayOpen(false);
            }}
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
            items={profile.responsibilities.map((r) => ({ label: r.label }))}
            accent="#1d70b8"
          />
        </PanelSection>
        <PanelSection title="Liable for">
          <Chips
            items={withResolved("liabilities", profile.liabilities)}
            accent="#b45309"
          />
        </PanelSection>
        <PanelSection title="Eligible for">
          <Chips
            items={withResolved("eligibilities", profile.eligibilities)}
            accent="#00703c"
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

type TrayConversation = { title: string; updatedAt?: number; hasHistory: boolean };

/** Per-agent conversation summary for the tray: a title (generated, else the
 *  first thing the citizen said, else the tagline) and when it was last active. */
function trayConversations(
  threads: Record<AgentId, Msg[]>,
  convoMeta: Partial<Record<AgentId, ConvoMeta>>,
): Partial<Record<AgentId, TrayConversation>> {
  const out: Partial<Record<AgentId, TrayConversation>> = {};
  for (const id of Object.keys(threads) as AgentId[]) {
    const real = (threads[id] ?? []).filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        (m.role === "user" || m.role === "assistant") &&
        !HIDDEN_OPENERS.has(m.content) &&
        !m.content.startsWith("[Inbound"),
    );
    const firstAsk = real.find((m) => m.role === "user")?.content;
    const fallback = firstAsk
      ? firstAsk.length > 42
        ? `${firstAsk.slice(0, 42).trimEnd()}…`
        : firstAsk
      : AGENT_META[id].tagline;
    out[id] = {
      title: convoMeta[id]?.title || fallback,
      updatedAt: convoMeta[id]?.updatedAt,
      hasHistory: real.length > 0,
    };
  }
  return out;
}

function AgentTray({
  roster,
  activeAgent,
  conversations,
  onClose,
  onOpen,
}: {
  roster: RosterEntry[];
  activeAgent: AgentId;
  conversations: Partial<Record<AgentId, TrayConversation>>;
  onClose: () => void;
  onOpen: (id: AgentId) => void;
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
            const convo = conversations[entry.id];
            const isActive = entry.id === activeAgent;
            const openable = entry.state !== "introduced";
            return (
              <div
                key={entry.id}
                className={entry.state === "stood-down" ? "opacity-55" : ""}
              >
                <div className="flex items-center gap-2 px-2.5 pt-4 pb-1">
                  <span
                    className="w-[7px] h-[7px] rounded-full shrink-0"
                    style={{ background: m.accent }}
                  />
                  <span className="text-[12px] font-medium tracking-wide text-[#8a8a8a] truncate">
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
                </div>
                {openable && convo?.hasHistory ? (
                  <button
                    type="button"
                    onClick={() => onOpen(entry.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                      isActive ? "bg-black/[0.05]" : "hover:bg-black/[0.035]"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full border-[1.5px] border-[#cbcbcb] shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-[#1a1a1a]">
                      {convo.title}
                    </span>
                    {convo.updatedAt && (
                      <span className="shrink-0 text-[11px] text-[#b4b4b4]">
                        {timeAgo(convo.updatedAt)}
                      </span>
                    )}
                  </button>
                ) : openable ? (
                  <button
                    type="button"
                    onClick={() => onOpen(entry.id)}
                    className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-[#a4a4a4] hover:bg-black/[0.035] transition-colors"
                  >
                    <span className="w-4 h-4 rounded-full border-[1.5px] border-dashed border-[#d4d4d4] shrink-0" />
                    <span className="text-[14px]">Start a conversation</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-2.5 py-2.5 text-[#c4c4c4]">
                    <span className="w-4 h-4 rounded-full border-[1.5px] border-dashed border-[#e4e4e4] shrink-0" />
                    <span className="text-[13px]">Not yet commissioned</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-auto px-4 py-3 text-[11px] text-[#b4b4b4]">
          Agents appear here once Dot introduces them and you commission them.
        </p>
      </aside>
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
          </p>
        )}
        <p className="text-[13px] text-[#505a5f] leading-relaxed mb-3">
          {m.mandate}
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
            Commissioned — open {m.name}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onCommission}
              className="w-full rounded-lg text-white font-semibold text-sm py-2.5 transition-opacity hover:opacity-90"
              style={{ background: m.accent }}
            >
              Commission {m.name}
            </button>
            <p className="text-[11px] text-center text-[#8a8a8a] mt-2">
              You can stand them down any time.
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

function Chips({ items, accent }: { items: ChipItem[]; accent: string }) {
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
      {unique.map((it, i) => (
        <span
          key={`${it.label}-${i}`}
          className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1"
          style={
            it.done
              ? { background: "#00703c14", color: "#00703c" }
              : { background: `${accent}14`, color: accent }
          }
        >
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
        </span>
      ))}
    </div>
  );
}
