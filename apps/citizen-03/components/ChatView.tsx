"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import type { AgentCard, ToolProgress } from "@/lib/types";
import { TraceDetail } from "./TraceDetail";
import ReactMarkdown from "react-markdown";

// ── Streaming tool progress ──

function ToolProgressBar({ tools }: { tools: ToolProgress[] }) {
  if (tools.length === 0) return null;

  return (
    <div className="flex justify-start">
      <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 border border-gray-100 shadow-sm max-w-[85%]">
        <div className="space-y-1.5">
          {tools.map((tp, i) => (
            <div key={i} className="flex items-center gap-2">
              {tp.status === "running" ? (
                <div className="w-3.5 h-3.5 shrink-0">
                  <svg className="animate-spin" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="#b1b4b6" strokeWidth="1.5"/>
                    <path d="M12.5 7a5.5 5.5 0 00-5.5-5.5" stroke="#1d70b8" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              ) : tp.status === "error" ? (
                <span className="text-[10px]">❌</span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <circle cx="7" cy="7" r="5.5" fill="#00703c" fillOpacity="0.1" stroke="#00703c" strokeWidth="1.2"/>
                  <path d="M4.5 7l2 2 3-3.5" stroke="#00703c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              <span className={`text-xs ${tp.status === "running" ? "text-govuk-black font-medium" : "text-govuk-dark-grey"}`}>
                {tp.label}
              </span>
              {tp.status === "complete" && tp.durationMs !== undefined && (
                <span className="text-[9px] text-govuk-mid-grey font-mono">{tp.durationMs}ms</span>
              )}
            </div>
          ))}
          {tools.some((tp) => tp.status === "running") && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-govuk-mid-grey rounded-full animate-bounce-dot" />
                <span className="w-1.5 h-1.5 bg-govuk-mid-grey rounded-full animate-bounce-dot" style={{ animationDelay: "0.16s" }} />
                <span className="w-1.5 h-1.5 bg-govuk-mid-grey rounded-full animate-bounce-dot" style={{ animationDelay: "0.32s" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Service / Action / Info Cards ──

const URGENCY_STYLES = {
  immediate: { border: "border-l-govuk-red", badge: "bg-red-100 text-red-700", label: "Do this first" },
  soon: { border: "border-l-govuk-orange", badge: "bg-orange-100 text-orange-700", label: "Important" },
  later: { border: "border-l-govuk-blue", badge: "bg-blue-100 text-blue-700", label: "When ready" },
};

function AgentCardComponent({ card, onTap }: { card: AgentCard; onTap: (text: string) => void }) {
  const urgency = card.urgency ? URGENCY_STYLES[card.urgency] : null;

  if (card.type === "service") {
    return (
      <button
        onClick={() => onTap(`Tell me more about ${card.title}`)}
        className={`w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 active:scale-[0.98] ${urgency ? `border-l-4 ${urgency.border}` : ""}`}
      >
        <div className="px-3.5 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {urgency && (
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${urgency.badge}`}>
                    {urgency.label}
                  </span>
                )}
                {card.eligible === true && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                    Eligible
                  </span>
                )}
                {card.eligible === false && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    Not eligible
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-sm text-govuk-black mt-1">{card.title}</h3>
              <p className="text-xs text-govuk-dark-grey mt-0.5 leading-relaxed">{card.description}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" className="text-govuk-mid-grey shrink-0 mt-1">
              <path d="M6 3l5 5-5 5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {card.govuk_url && (
            <a
              href={card.govuk_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-2 text-[10px] text-govuk-blue hover:text-govuk-dark-blue"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M8 5.5v2.5a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1h2.5M6 1h3v3M4.5 5.5L9 1" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              View on GOV.UK
            </a>
          )}
        </div>
      </button>
    );
  }

  if (card.type === "action") {
    return (
      <button
        onClick={() => onTap(`Help me with: ${card.title}`)}
        className="w-full text-left bg-govuk-blue/5 rounded-xl border border-govuk-blue/20 px-3.5 py-3 hover:bg-govuk-blue/10 transition-all duration-200 active:scale-[0.98]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-govuk-blue/10 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 3v8M3 7h8" stroke="#1d70b8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-govuk-black">{card.title}</h3>
            <p className="text-xs text-govuk-dark-grey mt-0.5">{card.description}</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-govuk-mid-grey shrink-0">
            <path d="M6 3l5 5-5 5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
    );
  }

  // info card
  return (
    <div className="bg-yellow-50 rounded-xl border border-yellow-200 px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-full bg-yellow-300 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-yellow-800">!</span>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-govuk-black">{card.title}</h3>
          <p className="text-xs text-govuk-dark-grey mt-0.5 leading-relaxed">{card.description}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main ChatView ──

export function ChatView() {
  const messages = useAppStore((s) => s.messages);
  const isLoading = useAppStore((s) => s.isLoading);
  const reasoning = useAppStore((s) => s.reasoning);
  const hasNewReasoning = useAppStore((s) => s.hasNewReasoning);
  const lastToolUseLog = useAppStore((s) => s.lastToolUseLog);
  const lastIterations = useAppStore((s) => s.lastIterations);
  const lastTraceId = useAppStore((s) => s.lastTraceId);
  const cards = useAppStore((s) => s.cards);
  const quickReplies = useAppStore((s) => s.quickReplies);
  const toolProgress = useAppStore((s) => s.toolProgress);
  const showTrace = useAppStore((s) => s.showTrace);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const toggleTrace = useAppStore((s) => s.toggleTrace);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, cards, toolProgress]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    setInput("");
    sendMessage(msg);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-govuk-blue text-white px-4 py-3 pt-14 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo("dashboard")}
              className="p-1 -ml-1 rounded hover:bg-white/10 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4l-6 6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-semibold">Government Services</h1>
              <p className="text-[10px] text-blue-200">Agentic assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Trace toggle */}
            <button
              onClick={toggleTrace}
              className={`relative flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                showTrace ? "bg-white/20" : "hover:bg-white/10"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 6h2l1.5-3 2 6L8 3l1.5 3H11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Trace
              {hasNewReasoning && !showTrace && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-govuk-yellow rounded-full" />
              )}
            </button>

            {/* Settings */}
            <button
              onClick={toggleSettings}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2" stroke="white" strokeWidth="1.2"/>
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-govuk-mid-grey">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-govuk-blue/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="#1d70b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-govuk-black">Ask me about any government service</p>
            <p className="text-xs mt-1">I&apos;ll search services, check eligibility, and guide you step by step.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;

          return (
            <div key={i} className="animate-fade-in">
              {/* Message bubble */}
              <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-govuk-blue text-white rounded-br-md"
                      : "bg-white text-govuk-black border border-gray-100 rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-h2:text-base prose-h3:text-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>

              {/* Cards — shown after the last assistant message */}
              {isLastAssistant && cards.length > 0 && (
                <div className="mt-2 space-y-2 stagger-in">
                  {cards.map((card, j) => (
                    <AgentCardComponent key={j} card={card} onTap={handleSend} />
                  ))}
                </div>
              )}

              {/* Trace — shown after cards when enabled */}
              {showTrace && isLastAssistant && lastToolUseLog.length > 0 && (
                <div className="mt-3 animate-fade-in">
                  <TraceDetail
                    toolUseLog={lastToolUseLog}
                    iterations={lastIterations}
                    reasoning={reasoning}
                    traceId={lastTraceId}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Streaming tool progress */}
        {isLoading && toolProgress.length > 0 && (
          <ToolProgressBar tools={toolProgress} />
        )}

        {/* Loading indicator (shown before any tool progress) */}
        {isLoading && toolProgress.length === 0 && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-govuk-mid-grey rounded-full animate-bounce-dot" />
                  <span className="w-2 h-2 bg-govuk-mid-grey rounded-full animate-bounce-dot" style={{ animationDelay: "0.16s" }} />
                  <span className="w-2 h-2 bg-govuk-mid-grey rounded-full animate-bounce-dot" style={{ animationDelay: "0.32s" }} />
                </div>
                <span className="text-[10px] text-govuk-mid-grey">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Quick replies */}
      {quickReplies.length > 0 && !isLoading && (
        <div className="shrink-0 px-4 py-2 bg-gray-50/80 border-t border-gray-100 overflow-x-auto">
          <div className="flex gap-2">
            {quickReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => handleSend(reply)}
                className="shrink-0 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-govuk-blue hover:bg-blue-50 hover:border-govuk-blue transition-colors whitespace-nowrap active:scale-[0.97]"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-govuk-blue focus:ring-1 focus:ring-govuk-blue disabled:opacity-50 transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-govuk-blue text-white flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-govuk-dark-blue transition-colors active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12M12 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
