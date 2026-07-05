"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { LoginSheet } from "@/components/sheets/LoginSheet";
import { OneLoginNotification } from "@/components/OneLoginNotification";

type Receipt = {
  label: string;
  dataShared: string[];
  via: "one-login" | "government-gateway";
  idv: boolean;
};
type Msg =
  | { role: "user" | "assistant"; content: string }
  | { role: "receipt"; content: string; receipt: Receipt };

type Entry = { key: string; label: string };
type Profile = {
  identity: Record<string, unknown>;
  responsibilities: Entry[];
  liabilities: Entry[];
  eligibilities: Entry[];
};
type ServiceAuth = {
  login: "one-login" | "government-gateway";
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

export default function AgentPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [resolved, setResolved] = useState<Resolves[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sheetType = useAppStore((s) => s.bottomSheet.type);
  const closeBottomSheet = useAppStore((s) => s.closeBottomSheet);
  const oneLoginVerified = useAppStore((s) => s.oneLoginVerified);
  const gatewayVerified = useAppStore((s) => s.gatewayVerified);
  const identityVerified = useAppStore((s) => s.identityVerified);

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

  async function send(history: Msg[], nextProfile: Profile) {
    setLoading(true);
    try {
      const apiMessages = history
        .filter((m) => m.role !== "receipt")
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          profile: nextProfile,
          completed,
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
      setMessages(next);
      if (data.profile) setProfile(data.profile);
      if (willAct) {
        setPendingAction(data.pendingAction);
        beginAuth(data.pendingAction, data.profile ?? nextProfile);
      }
    } finally {
      setLoading(false);
    }
  }

  // Opening turn — a hidden "Hi" so the agent introduces itself.
  useEffect(() => {
    send([{ role: "user", content: "Hi" }], EMPTY);
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
        c.includes(pendingAction.serviceId)
          ? c
          : [...c, pendingAction.serviceId],
      );
      if (pendingAction.resolves) {
        const r = pendingAction.resolves;
        setResolved((prev) =>
          prev.some((x) => x.list === r.list && x.key === r.key)
            ? prev
            : [...prev, r],
        );
      }
      setMessages((m) => [
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    send(next, profile);
  }

  const visible = messages.filter(
    (m, i) => !(i === 0 && m.role === "user" && m.content === "Hi"),
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

  return (
    <div className="h-screen w-screen flex bg-[#faf9f7] text-[#1a1a1a] overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 flex items-center gap-3 border-b border-black/5">
          <div className="w-7 h-7 rounded-full bg-[#1d70b8] flex items-center justify-center text-white text-xs font-semibold">
            a
          </div>
          <p className="text-sm font-semibold flex-1">Your agent</p>
          <span className="text-[10px] font-medium tracking-wide text-[#8a8a8a] border border-black/10 rounded-full px-2 py-0.5">
            V1 · Citizen
          </span>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-[640px] mx-auto space-y-5">
            {visible.map((m, i) =>
              m.role === "receipt" ? (
                <ReceiptCard key={i} receipt={m.receipt} />
              ) : (
                <div
                  key={i}
                  className={m.role === "user" ? "flex justify-end" : "flex"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "bg-[#1d70b8] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] max-w-[80%]"
                        : "text-[15px] leading-relaxed max-w-[85%] whitespace-pre-wrap"
                    }
                  >
                    {m.content}
                  </div>
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
              placeholder="Tell your agent about yourself…"
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
      </main>

      <aside className="w-[320px] shrink-0 border-l border-black/5 bg-white/60 overflow-y-auto hidden md:block">
        <div className="px-5 py-4 border-b border-black/5">
          <p className="text-sm font-semibold">What your agent knows</p>
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
  if (items.length === 0) return <Empty />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it.label}
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
