"use client";

import { useState } from "react";
import { DEMO_PERSONAS } from "@/lib/demo-personas";

const AGENT_NAMES: Record<string, string> = {
  dot: "Dot",
  reg: "Reg",
  grace: "Grace",
  driving: "Miles",
  sol: "Sol",
  robin: "Robin",
  fay: "Fay",
  cass: "Cass · Citizens Advice",
  iris: "Iris · Cruse",
};

function Copy({ text, accent }: { text: string; accent: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors"
      style={{ background: `${accent}14`, color: accent }}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a]">
      <div className="max-w-[840px] mx-auto px-6 py-14 pb-24">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9a9a9a]">
          GOV.UK · agentic citizen experience
        </p>
        <h1 className="text-[34px] leading-[1.15] font-semibold mt-1.5 tracking-[-0.01em]">
          Demo guide
        </h1>
        <p className="text-[18px] text-[#6a6a6a] mt-3 max-w-[60ch]">
          Five curated citizens, each chosen for how much of the cohort they
          exercise. Every step below carries the exact prompt to paste — hit
          Copy, switch to the app, paste.
        </p>

        <div className="rounded-2xl border border-black/[0.08] bg-white p-6 mt-8">
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#9a9a9a] mb-2.5">
            How the demo runs
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-[15px] text-[#2a2a2a]">
            <li>Open the citizen switcher (top right) and choose a person.</li>
            <li>Read their briefing, then press <strong>Start the demo</strong>. Their situation loads and Dot opens proactively.</li>
            <li>Work down the steps here — Copy each prompt, paste it to the named agent.</li>
          </ol>
        </div>

        {DEMO_PERSONAS.map((d) => (
          <section
            key={d.id}
            className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden mt-8"
          >
            <div className="h-1.5 w-full" style={{ background: d.accent }} />
            <div className="p-7">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.06em]"
                style={{ color: d.accent }}
              >
                {d.archetype}
              </p>
              <h2 className="text-[22px] font-semibold mt-1 tracking-[-0.01em]">
                {d.headline}
              </h2>
              <p className="text-[15px] text-[#6a6a6a] mt-3">{d.summary}</p>

              <div className="flex flex-wrap gap-1.5 mt-4">
                {d.themes.map((t) => (
                  <span
                    key={t}
                    className="text-[12px] font-semibold rounded-full px-2.5 py-1"
                    style={{ background: `${d.accent}14`, color: d.accent }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#9a9a9a]">
                  Agents:
                </span>
                {[...d.agents, ...(d.introduced ?? [])].map((a) => (
                  <span
                    key={a}
                    className="text-[13px] font-semibold bg-black/[0.04] rounded-full px-2.5 py-1"
                  >
                    {AGENT_NAMES[a] ?? a}
                  </span>
                ))}
              </div>

              <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#9a9a9a] mt-6 mb-3">
                How to show it off
              </p>
              <ol className="space-y-4">
                {d.moves.map((m, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="shrink-0 w-6 h-6 rounded-full text-white text-[12px] font-bold flex items-center justify-center mt-0.5"
                      style={{ background: d.accent }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-[15px] text-[#2a2a2a]">{m.do}</p>
                      {m.prompt && (
                        <div className="rounded-lg border border-black/10 bg-[#faf9f7] px-3.5 py-2.5 flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            {m.to && (
                              <p
                                className="text-[10px] font-semibold uppercase tracking-[0.05em] mb-0.5"
                                style={{ color: d.accent }}
                              >
                                Paste to {m.to}
                              </p>
                            )}
                            <p className="text-[14px] text-[#1a1a1a] leading-snug">
                              &ldquo;{m.prompt}&rdquo;
                            </p>
                          </div>
                          <Copy text={m.prompt} accent={d.accent} />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ))}

        <div className="mt-10 border-t border-black/[0.08] pt-6 text-[15px] text-[#6a6a6a] space-y-3">
          <p>
            <strong className="text-[#1a1a1a]">Two things best shown as a new user.</strong>{" "}
            Choose <code className="bg-black/5 rounded px-1.5 py-0.5 text-[0.9em]">New user (start fresh)</code> to demonstrate:
          </p>
          <p>
            <strong className="text-[#1a1a1a]">Reg &amp; live Companies House.</strong>{" "}
            Say you run a company and give a real company name — Reg recognises
            you from the live register (real directors and filing dates), then
            files with a One Login sign-in.
          </p>
          <p>
            <strong className="text-[#1a1a1a]">Sol &amp; the money you&rsquo;re owed.</strong>{" "}
            Say you&rsquo;re a self-employed sole trader — Sol picks up the tax side,
            and this is where the &ldquo;you&rsquo;re owed £1,800 you didn&rsquo;t know
            about&rdquo; beat lands.
          </p>
        </div>
      </div>
    </div>
  );
}
