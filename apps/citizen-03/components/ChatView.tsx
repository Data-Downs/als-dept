"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import type { ToolUseRecord, AgentCard } from "@/lib/types";
import ReactMarkdown from "react-markdown";

// ── Tool trace cards ──

const TOOL_META: Record<string, { label: string; icon: string; color: string }> = {
  query_service_graph: { label: "Searched services", icon: "🔍", color: "bg-blue-50 border-blue-200" },
  get_life_event_plan: { label: "Life event plan", icon: "📋", color: "bg-purple-50 border-purple-200" },
  get_related_services: { label: "Related services", icon: "🔗", color: "bg-indigo-50 border-indigo-200" },
  check_eligibility: { label: "Eligibility check", icon: "✓", color: "bg-green-50 border-green-200" },
  get_citizen_context: { label: "Your profile", icon: "👤", color: "bg-gray-50 border-gray-200" },
  record_evidence: { label: "Recorded evidence", icon: "📝", color: "bg-yellow-50 border-yellow-200" },
};

function ToolTraceRow({ record }: { record: ToolUseRecord }) {
  const meta = TOOL_META[record.tool] || { label: record.tool, icon: "⚙️", color: "bg-gray-50 border-gray-200" };
  const output = record.output;

  let summary = "";
  if (output) {
    switch (record.tool) {
      case "query_service_graph": summary = `${output.totalCount} services`; break;
      case "get_life_event_plan": summary = `${output.lifeEvent}: ${output.totalServices} services`; break;
      case "get_related_services": summary = `${output.requiresCount} prereqs, ${output.enablesCount} downstream`; break;
      case "check_eligibility": summary = output.eligible === true ? "Eligible" : output.eligible === false ? "Not eligible" : "No policy"; break;
      case "get_citizen_context": summary = `${output.verifiedFieldCount} verified fields`; break;
      case "record_evidence": summary = `${output.eventType}`; break;
    }
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${meta.color}`}>
      <span>{meta.icon}</span>
      <span className="text-gray-600">{meta.label}</span>
      {summary && <span className="text-gray-400">· {summary}</span>}
    </span>
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
        className={`w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow touch-feedback ${urgency ? `border-l-4 ${urgency.border}` : ""}`}
      >
        <div className="px-3.5 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
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
              className="inline-block mt-1.5 text-[10px] text-govuk-blue underline"
            >
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
        className="w-full text-left bg-govuk-blue/5 rounded-xl border border-govuk-blue/20 px-3.5 py-3 hover:bg-govuk-blue/10 transition-colors touch-feedback"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-govuk-blue/10 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3v8" stroke="#1d70b8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-govuk-black">{card.title}</h3>
            <p className="text-xs text-govuk-dark-grey mt-0.5">{card.description}</p>
          </div>
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
          <p className="text-xs text-govuk-dark-grey mt-0.5">{card.description}</p>
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
  const cards = useAppStore((s) => s.cards);
  const quickReplies = useAppStore((s) => s.quickReplies);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const clearReasoningBadge = useAppStore((s) => s.clearReasoningBadge);

  const [input, setInput] = useState("");
  const [showTrace, setShowTrace] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, cards]);

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
              className="p-1 -ml-1 rounded hover:bg-white/10"
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

          <button
            onClick={() => {
              setShowTrace(!showTrace);
              if (hasNewReasoning) clearReasoningBadge();
            }}
            className={`relative flex items-center gap-1 px-2 py-1 rounded text-xs ${
              showTrace ? "bg-white/20" : "hover:bg-white/10"
            }`}
          >
            Trace
            {hasNewReasoning && !showTrace && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-govuk-yellow rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-govuk-mid-grey">
            <p className="text-sm">Ask me about any government service.</p>
            <p className="text-xs mt-1">I&apos;ll search services, check eligibility, and guide you step by step.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;

          return (
            <div key={i}>
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
                <div className="mt-2 space-y-2 animate-fade-in">
                  {cards.map((card, j) => (
                    <AgentCardComponent key={j} card={card} onTap={handleSend} />
                  ))}
                </div>
              )}

              {/* Tool trace — shown after cards when trace is enabled */}
              {showTrace && isLastAssistant && lastToolUseLog.length > 0 && (
                <div className="mt-2 animate-fade-in">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[10px] text-gray-400 font-medium">
                      {lastIterations} loop{lastIterations !== 1 ? "s" : ""}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {lastToolUseLog.map((record, j) => (
                      <ToolTraceRow key={j} record={record} />
                    ))}
                  </div>
                  {reasoning && (
                    <p className="text-[10px] text-gray-400 mt-1.5 italic leading-relaxed">{reasoning}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
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
                className="shrink-0 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs text-govuk-blue hover:bg-blue-50 hover:border-govuk-blue transition-colors whitespace-nowrap"
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
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-govuk-blue focus:ring-1 focus:ring-govuk-blue disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-govuk-blue text-white flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-govuk-dark-blue transition-colors"
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
