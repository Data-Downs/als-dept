"use client";

import { useState } from "react";
import type { ToolUseRecord } from "@/lib/types";

const TOOL_META: Record<
  string,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  query_service_graph: {
    label: "Service search",
    icon: "🔍",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  get_life_event_plan: {
    label: "Life event plan",
    icon: "📋",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
  },
  get_related_services: {
    label: "Related services",
    icon: "🔗",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
  },
  check_eligibility: {
    label: "Eligibility check",
    icon: "✓",
    color: "text-green-700",
    bgColor: "bg-green-50",
  },
  get_citizen_context: {
    label: "Citizen profile",
    icon: "👤",
    color: "text-gray-700",
    bgColor: "bg-gray-50",
  },
  record_evidence: {
    label: "Evidence recording",
    icon: "📝",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
  },
};

function ToolCallDetail({
  record,
  index,
}: {
  record: ToolUseRecord;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_META[record.tool] || {
    label: record.tool,
    icon: "⚙️",
    color: "text-gray-700",
    bgColor: "bg-gray-50",
  };

  return (
    <div
      className={`rounded-lg border ${record.isError ? "border-red-200" : "border-gray-100"} overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50/50 transition-colors ${meta.bgColor}`}
      >
        {/* Timeline dot */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className={`w-6 h-6 rounded-full ${record.isError ? "bg-red-100" : "bg-white"} border-2 ${record.isError ? "border-red-300" : "border-gray-200"} flex items-center justify-center text-xs`}
          >
            {index + 1}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{meta.icon}</span>
            <span className={`text-xs font-semibold ${meta.color}`}>
              {meta.label}
            </span>
            {record.isError && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                Error
              </span>
            )}
          </div>
          {/* Quick summary */}
          {record.output && (
            <p className="text-[10px] text-govuk-dark-grey mt-0.5 truncate">
              {summarizeOutput(record.tool, record.output)}
            </p>
          )}
        </div>

        {/* Duration + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-govuk-mid-grey font-mono">
            {record.durationMs}ms
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className={`text-govuk-mid-grey transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            <path
              d="M4 2l4 4-4 4"
              stroke="currentColor"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-white">
          {/* Input */}
          <div className="px-3 py-2 border-b border-gray-50">
            <span className="text-[9px] font-bold uppercase tracking-wider text-govuk-mid-grey">
              Input
            </span>
            <pre className="text-[10px] text-govuk-dark-grey mt-1 font-mono whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(record.input, null, 2)}
            </pre>
          </div>

          {/* Output */}
          <div className="px-3 py-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-govuk-mid-grey">
              Output
            </span>
            {record.output ? (
              <pre className="text-[10px] text-govuk-dark-grey mt-1 font-mono whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(record.output, null, 2)}
              </pre>
            ) : (
              <p className="text-[10px] text-govuk-mid-grey mt-1 italic">
                No output
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function summarizeOutput(
  tool: string,
  output: Record<string, unknown>,
): string {
  switch (tool) {
    case "query_service_graph":
      return `Found ${output.totalCount} services${output.truncated ? " (showing first 6)" : ""}`;
    case "get_life_event_plan":
      return `${output.lifeEvent}: ${output.totalServices} services in ${output.groupCount} groups`;
    case "get_related_services":
      return `${output.service}: ${output.requiresCount} prereqs, ${output.enablesCount} downstream`;
    case "check_eligibility":
      return output.eligible === true
        ? "Eligible"
        : output.eligible === false
          ? "Not eligible"
          : "No policy data";
    case "get_citizen_context":
      return `${output.verifiedFieldCount} verified, ${output.submittedFieldCount} submitted fields`;
    case "record_evidence":
      return `Recorded: ${output.eventType}`;
    default:
      return JSON.stringify(output).slice(0, 80);
  }
}

export function TraceDetail({
  toolUseLog,
  iterations,
  reasoning,
  traceId,
}: {
  toolUseLog: ToolUseRecord[];
  iterations: number;
  reasoning: string;
  traceId?: string;
}) {
  const totalDuration = toolUseLog.reduce((sum, t) => sum + t.durationMs, 0);

  return (
    <div className="animate-fade-in">
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-govuk-mid-grey">
            {iterations} iteration{iterations !== 1 ? "s" : ""} ·{" "}
            {toolUseLog.length} tool call{toolUseLog.length !== 1 ? "s" : ""} ·{" "}
            {totalDuration}ms
          </span>
        </div>
        {traceId && (
          <span className="text-[9px] text-govuk-mid-grey font-mono">
            {traceId.slice(0, 20)}...
          </span>
        )}
      </div>

      {/* Tool call timeline */}
      {toolUseLog.length > 0 && (
        <div className="space-y-1.5">
          {toolUseLog.map((record, i) => (
            <ToolCallDetail key={i} record={record} index={i} />
          ))}
        </div>
      )}

      {/* Reasoning */}
      {reasoning && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
          <span className="text-[9px] font-bold uppercase tracking-wider text-govuk-mid-grey">
            Agent reasoning
          </span>
          <p className="text-[10px] text-govuk-dark-grey mt-1 italic leading-relaxed">
            {reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
