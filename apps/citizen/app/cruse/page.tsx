"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TEAL = "#0f8a8a";
const IRIS = "#6b5b95";

type Msg = { role: "user" | "assistant"; content: string };

// A light picture of Sarah for Iris to open with — the rest she learns from
// the conversation, exactly as she would on a real charity's site.
const SARAH_PROFILE = {
  identity: { name: "Sarah", fullName: "Sarah Okafor", location: "Chelmsford" },
  responsibilities: [
    { key: "bereaved", label: "Recently bereaved — her husband David" },
  ],
  liabilities: [],
  eligibilities: [],
};

export default function CrusePage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [handedOver, setHandedOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(history: Msg[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: "iris",
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          profile: SARAH_PROFILE,
          permissions: { canAct: true, proactive: true },
        }),
      });
      const data = await res.json();
      if (data.reply) setMessages([...history, { role: "assistant", content: data.reply }]);
    } finally {
      setLoading(false);
    }
  }

  // Iris opens the moment the widget appears.
  useEffect(() => {
    send([{ role: "user", content: "Hi" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  function submit(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    send(next);
  }

  function handOver() {
    // Hand what Iris has gathered to the government cohort. The conversation is
    // the same persistent thing — it carries over. We stash it and open the
    // GOV.UK app, where Dot picks it up already knowing where Sarah left off.
    const carried = messages.filter(
      (m) => !(m.role === "user" && m.content === "Hi"),
    );
    localStorage.setItem("als-cruse-handoff", JSON.stringify({ messages: carried }));
    window.location.href = "/agent?from=cruse";
  }

  const said = messages.some((m) => m.role === "user" && m.content !== "Hi");

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      {/* Demonstration ribbon */}
      <div className="w-full bg-[#2a2a2a] text-white text-[12px] text-center py-1.5">
        Demonstration — a mock of a charity partner’s site, not the real Cruse
      </div>

      {/* Charity site header */}
      <header className="border-b border-black/10">
        <div className="max-w-[1000px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: TEAL }}
            >
              c
            </span>
            <div className="leading-tight">
              <p className="font-semibold text-[15px]">Cruse Bereavement Support</p>
              <p className="text-[11px] text-[#6a6a6a]">Support after someone dies</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-[14px] text-[#3a3a3a]">
            <span>Get support</span>
            <span>Understanding grief</span>
            <span>Ways to help</span>
            <span
              className="rounded-full px-4 py-1.5 text-white font-medium"
              style={{ background: TEAL }}
            >
              Talk to someone
            </span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        className="px-6 py-16"
        style={{ background: `linear-gradient(180deg, ${TEAL}0f, transparent)` }}
      >
        <div className="max-w-[1000px] mx-auto">
          <h1 className="text-[40px] leading-[1.1] font-semibold max-w-[16ch] tracking-[-0.01em]">
            Grief is something we all go through. You don’t have to go through it alone.
          </h1>
          <p className="mt-5 text-[18px] text-[#4a4a4a] max-w-[54ch]">
            Whatever you’re feeling after the death of someone close, we’re here —
            to listen, to sit with you, and to help you find your way through, at
            your own pace.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full px-6 py-3 text-white font-medium text-[15px]"
              style={{ background: TEAL }}
            >
              Talk to Iris now
            </button>
            <span className="rounded-full px-6 py-3 border border-black/15 font-medium text-[15px]">
              Call our helpline
            </span>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 border-t border-black/5">
        <div className="max-w-[1000px] mx-auto grid md:grid-cols-3 gap-8 text-[15px] text-[#4a4a4a]">
          <div>
            <h3 className="font-semibold text-[#1a1a1a] mb-1.5">Someone to talk to</h3>
            <p>Iris is here whenever you need her — day or night, at your pace, with no rush and no forms.</p>
          </div>
          <div>
            <h3 className="font-semibold text-[#1a1a1a] mb-1.5">Understanding grief</h3>
            <p>There’s no right way to grieve. We can help you make sense of what you’re feeling.</p>
          </div>
          <div>
            <h3 className="font-semibold text-[#1a1a1a] mb-1.5">Practical help too</h3>
            <p>When you’re ready, Iris can quietly take the weight of the paperwork off your shoulders.</p>
          </div>
        </div>
      </section>

      {/* Iris chat widget */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] rounded-2xl bg-white shadow-2xl border border-black/10 flex flex-col overflow-hidden">
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ background: IRIS }}
          >
            <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
              I
            </span>
            <div className="leading-tight text-white flex-1">
              <p className="font-semibold text-[15px]">Iris</p>
              <p className="text-[11px] opacity-90">Cruse Bereavement Support</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Minimise"
              className="text-white/80 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[46vh] min-h-[220px]">
            {messages
              .filter((m) => !(m.role === "user" && m.content === "Hi"))
              .map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
                  {m.role === "user" ? (
                    <div className="rounded-2xl rounded-br-md px-3.5 py-2 text-[14px] max-w-[85%] text-white" style={{ background: IRIS }}>
                      {m.content}
                    </div>
                  ) : (
                    <div className="text-[14px] leading-relaxed max-w-[90%] prose prose-sm max-w-none prose-p:my-1.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            {loading && (
              <div className="flex gap-1.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4c4c4] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4c4c4] animate-bounce [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4c4c4] animate-bounce [animation-delay:240ms]" />
              </div>
            )}
            {!said && !loading && messages.length > 0 && (
              <button
                type="button"
                onClick={() => submit("My husband David died in February and I'm not coping very well.")}
                className="text-[13px] rounded-full border px-3 py-1.5"
                style={{ borderColor: `${IRIS}55`, color: IRIS }}
              >
                My husband died recently
              </button>
            )}
          </div>

          {said && !handedOver && (
            <div className="px-4 pt-1 pb-2">
              <button
                type="button"
                onClick={() => {
                  setHandedOver(true);
                  handOver();
                }}
                className="w-full rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-white flex items-center justify-center gap-2"
                style={{ background: TEAL }}
              >
                Let Iris bring in your government agents
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
              <p className="text-[11px] text-center text-[#9a9a9a] mt-1.5">
                She’ll pass what you’ve told her — you won’t start again.
              </p>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="px-3 py-3 border-t border-black/5 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Iris…"
              className="flex-1 bg-[#f4f4f6] rounded-full px-4 py-2 text-[14px] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full text-white flex items-center justify-center disabled:opacity-30"
              style={{ background: IRIS }}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
