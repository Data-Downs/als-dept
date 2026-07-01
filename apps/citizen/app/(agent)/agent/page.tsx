"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { LoginSheet } from "@/components/sheets/LoginSheet";

type Msg = { role: "user" | "assistant"; content: string };
type Profile = {
  identity: Record<string, unknown>;
  responsibilities: string[];
  liabilities: string[];
  eligibilities: string[];
};

const EMPTY: Profile = {
  identity: {},
  responsibilities: [],
  liabilities: [],
  eligibilities: [],
};

export default function AgentPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const bottomSheet = useAppStore((s) => s.bottomSheet);
  const closeBottomSheet = useAppStore((s) => s.closeBottomSheet);

  async function send(history: Msg[], nextProfile: Profile) {
    setLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, profile: nextProfile }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([...history, { role: "assistant", content: data.reply }]);
      }
      if (data.profile) setProfile(data.profile);
    } finally {
      setLoading(false);
    }
  }

  // Opening turn — a hidden "Hi" so the agent introduces itself per its brief.
  useEffect(() => {
    send([{ role: "user", content: "Hi" }], EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    send(next, profile);
  }

  // Hide the synthetic opening "Hi".
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

  return (
    <div className="h-screen w-screen flex bg-[#faf9f7] text-[#1a1a1a] overflow-hidden">
      {/* Conversation */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 flex items-center gap-3 border-b border-black/5">
          <div className="w-7 h-7 rounded-full bg-[#1d70b8] flex items-center justify-center text-white text-xs font-semibold">
            a
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Your agent</p>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wide text-[#8a8a8a] border border-black/10 rounded-full px-2 py-0.5">
            V1 · Citizen
          </span>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-[640px] mx-auto space-y-5">
            {visible.map((m, i) => (
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
            ))}
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

      {/* Profile panel */}
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
                <span className="text-xs text-[#8a8a8a] capitalize">{k}</span>
                <span className="text-xs font-medium text-right">{String(v)}</span>
              </div>
            ))
          )}
        </PanelSection>

        <PanelSection title="Responsible for">
          <Chips items={profile.responsibilities} accent="#1d70b8" />
        </PanelSection>
        <PanelSection title="Liable for">
          <Chips items={profile.liabilities} accent="#b45309" />
        </PanelSection>
        <PanelSection title="Eligible for">
          <Chips items={profile.eligibilities} accent="#00703c" />
        </PanelSection>
      </aside>

      {/* Login wall — reused from the citizen app, ready for when the agent acts */}
      {bottomSheet.type === "login" && (
        <BottomSheet open onClose={closeBottomSheet} title="Sign in">
          <LoginSheet />
        </BottomSheet>
      )}
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-[#c4c4c4]">—</p>;
}

function Chips({ items, accent }: { items: string[]; accent: string }) {
  if (items.length === 0) return <Empty />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className="text-xs font-medium rounded-full px-2.5 py-1"
          style={{ background: `${accent}14`, color: accent }}
        >
          {it}
        </span>
      ))}
    </div>
  );
}
