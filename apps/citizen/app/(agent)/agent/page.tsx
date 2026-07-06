"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/lib/store";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { LoginSheet } from "@/components/sheets/LoginSheet";
import { OneLoginNotification } from "@/components/OneLoginNotification";

type AgentId = "dot" | "reg" | "grace";

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
};

type Receipt = {
  label: string;
  dataShared: string[];
  via: "one-login" | "government-gateway";
  idv: boolean;
};
type Msg =
  | { role: "user" | "assistant"; content: string }
  | { role: "receipt"; content: string; receipt: Receipt }
  | { role: "introduce"; agentId: AgentId };

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
  resolves?: Resolves;
};
type RosterEntry = { id: AgentId; state: "introduced" | "commissioned" | "stood-down" };
type WorkingItem = { key: string; label: string; status: "now" | "next" | "waiting" | "done" };

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
  });
  const [activeAgent, setActiveAgent] = useState<AgentId>("dot");
  const [roster, setRoster] = useState<RosterEntry[]>([
    { id: "dot", state: "commissioned" },
  ]);
  const [trayOpen, setTrayOpen] = useState(false);
  const [companyContext, setCompanyContext] = useState<unknown>(null);
  const [workingState, setWorkingState] = useState<WorkingItem[]>([]);
  const [handover, setHandover] = useState<string | null>(null);

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

  const setThread = (id: AgentId, next: Msg[] | ((prev: Msg[]) => Msg[])) =>
    setThreads((t) => ({
      ...t,
      [id]: typeof next === "function" ? next(t[id] ?? []) : next,
    }));

  function beginAuth(action: PendingAction, prof: Profile) {
    useAppStore.setState({
      persona: "agent-citizen",
      personaData: personaFromProfile(prof) as never,
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
          workingState,
          handover: agentId === "grace" ? handoverArg : null,
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
      if (data.introduce?.agentId) introduceSpecialist(data.introduce.agentId);
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

  function introduceSpecialist(agentId: AgentId) {
    setRoster((r) =>
      r.some((x) => x.id === agentId) ? r : [...r, { id: agentId, state: "introduced" }],
    );
    setThread("dot", (m) =>
      m.some((x) => x.role === "introduce" && x.agentId === agentId)
        ? m
        : [...m, { role: "introduce", agentId }],
    );
  }

  function commission(agentId: AgentId) {
    setRoster((r) =>
      r.map((x) => (x.id === agentId ? { ...x, state: "commissioned" } : x)),
    );
    setActiveAgent(agentId);
    setTrayOpen(false);
    // Hand the specialist Dot's conversation so they arrive already briefed.
    const dotTranscript = (threads.dot ?? [])
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          m.role === "user" || m.role === "assistant",
      )
      .filter((m) => !HIDDEN_OPENERS.has(m.content))
      .map((m) => `${m.role === "user" ? "Citizen" : "Dot"}: ${m.content}`)
      .join("\n");
    setHandover(dotTranscript);
    setThreads((t) => {
      if ((t[agentId] ?? []).length === 0) {
        setTimeout(
          () =>
            send(agentId, [{ role: "user", content: "[commissioned]" }], profile, dotTranscript),
          0,
        );
      }
      return t;
    });
  }

  // Opening turn — a hidden "Hi" so Dot introduces itself.
  useEffect(() => {
    send("dot", [{ role: "user", content: "Hi" }], EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          },
        },
        {
          role: "assistant",
          content:
            "Done — you didn't have to touch government yourself. The receipt above shows exactly what I shared, and you can undo or query it any time.",
        },
      ]);
    }
    setPendingAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetType, oneLoginVerified, gatewayVerified, identityVerified]);

  const messages = threads[activeAgent] ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setThread(activeAgent, next);
    setInput("");
    send(activeAgent, next, profile);
  }

  const visible = messages.filter(
    (m, i) => !(i === 0 && m.role === "user" && HIDDEN_OPENERS.has(m.content)),
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
          <span className="text-[10px] font-medium tracking-wide text-[#8a8a8a] border border-black/10 rounded-full px-2 py-0.5">
            V1 · Citizen
          </span>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-[640px] mx-auto space-y-5">
            {visible.map((m, i) =>
              m.role === "receipt" ? (
                <ReceiptCard key={i} receipt={m.receipt} />
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
            onClose={() => setTrayOpen(false)}
            onSelect={(entry) => {
              setActiveAgent(entry.state === "commissioned" ? entry.id : "dot");
              setTrayOpen(false);
            }}
          />
        )}
      </main>

      <aside className="w-[320px] shrink-0 border-l border-black/5 bg-white/60 overflow-y-auto hidden md:block">
        {activeAgent === "grace" ? (
          <GracePanel items={workingState} />
        ) : (
          <>
        <div className="px-5 py-4 border-b border-black/5">
          <p className="text-sm font-semibold">What your agents know</p>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            {known === 0 ? "Nothing yet — say hello." : `${known} things so far`}
          </p>
        </div>

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
      </aside>

      <OneLoginNotification />

      {sheetType === "login" && (
        <BottomSheet open onClose={closeBottomSheet} title="Sign in">
          <LoginSheet />
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

function AgentTray({
  roster,
  activeAgent,
  onClose,
  onSelect,
}: {
  roster: RosterEntry[];
  activeAgent: AgentId;
  onClose: () => void;
  onSelect: (entry: RosterEntry) => void;
}) {
  return (
    <div className="absolute inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white border-r border-black/10 shadow-xl flex flex-col">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <p className="text-sm font-semibold">Your agents</p>
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
        <div className="p-2 space-y-1 overflow-y-auto">
          {roster.map((entry) => {
            const m = AGENT_META[entry.id];
            const isActive = entry.id === activeAgent;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(entry)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isActive ? "bg-[#1d70b8]/[0.08]" : "hover:bg-black/[0.03]"
                } ${entry.state === "stood-down" ? "opacity-60" : ""}`}
              >
                <AgentAvatar id={entry.id} className="w-8 h-8" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
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
                  <p className="text-[11px] text-[#8a8a8a] truncate">{m.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-auto px-5 py-3 text-[11px] text-[#c4c4c4] border-t border-black/5">
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

function GracePanel({ items }: { items: WorkingItem[] }) {
  const sorted = [...items].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );
  return (
    <div>
      <div className="px-5 py-4 border-b border-black/5">
        <p className="text-sm font-semibold">What Grace is looking after</p>
        <p className="text-xs text-[#8a8a8a] mt-0.5">
          {items.length === 0
            ? "Nothing yet — she's just getting started."
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

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const via =
    receipt.via === "government-gateway"
      ? "Government Gateway"
      : `GOV.UK One Login${receipt.idv ? " · identity verified" : ""}`;
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
