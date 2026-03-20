"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import type { AgentType } from "@/lib/types";

const AGENTS: Array<{
  id: AgentType;
  name: string;
  subtitle: string;
  description: string;
  traits: string[];
}> = [
  {
    id: "dot",
    name: "DOT",
    subtitle: "Cautious and careful",
    description:
      "Checks with you before every step. You stay fully in control.",
    traits: ["Step-by-step", "Transparent", "You decide"],
  },
  {
    id: "max",
    name: "MAX",
    subtitle: "Proactive and fast",
    description:
      "Acts on your behalf and handles tasks in the background. Gets things done quickly.",
    traits: ["Proactive", "Autonomous", "Fast"],
  },
  {
    id: "none",
    name: "NO AGENT",
    subtitle: "Manual mode",
    description:
      "Browse services and visit GOV.UK directly. No AI, no chat, no automation.",
    traits: ["Manual", "Direct links", "You do everything"],
  },
];

export function AgentSelectionSheet() {
  const currentAgent = useAppStore((s) => s.agent);
  const setAgent = useAppStore((s) => s.setAgent);
  const serviceMode = useAppStore((s) => s.serviceMode);
  const setServiceMode = useAppStore((s) => s.setServiceMode);
  const closeBottomSheet = useAppStore((s) => s.closeBottomSheet);
  const showAgentIntro = useAppStore((s) => s.showAgentIntro);
  const [selected, setSelected] = useState<AgentType>(currentAgent);
  const isDemo = serviceMode === "demo";

  const handleApply = () => {
    setAgent(selected);
    closeBottomSheet();
    showAgentIntro();
  };

  return (
    <div className="space-y-2.5">
      {AGENTS.map((agent) => {
        const isDot = agent.id === "dot";
        const isMax = agent.id === "max";
        const isNone = agent.id === "none";
        const isSelected = selected === agent.id;

        // Dot: pale blue (safe). Max: pale amber (caution). None: neutral grey.
        const baseBg = isDot
          ? "bg-blue-50/70"
          : isMax
            ? "bg-amber-50/70"
            : "bg-gray-50/70";
        const selectedBorder = isDot
          ? "border-govuk-blue"
          : isMax
            ? "border-amber-500"
            : "border-gray-500";
        const unselectedBorder = isDot
          ? "border-blue-200"
          : isMax
            ? "border-amber-200"
            : "border-gray-200";

        return (
          <button
            key={agent.id}
            onClick={() => setSelected(agent.id)}
            className={`w-full text-left px-3.5 py-3 rounded-card border-2 transition-all touch-feedback ${baseBg} ${
              isSelected
                ? selectedBorder
                : `${unselectedBorder} hover:border-gray-300`
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                  isDot
                    ? "bg-govuk-blue"
                    : isMax
                      ? "bg-amber-500"
                      : "bg-gray-500"
                }`}
              >
                {isDot ? (
                  "D"
                ) : isMax ? (
                  "M"
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <line x1="8" y1="8" x2="16" y2="16" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <strong className="text-sm text-govuk-black">
                  {agent.name}
                </strong>
                <p className="text-xs text-govuk-dark-grey leading-tight">
                  {agent.subtitle}
                </p>
              </div>
              {isSelected && (
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isDot
                      ? "bg-govuk-blue"
                      : isMax
                        ? "bg-amber-500"
                        : "bg-gray-500"
                  }`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              )}
            </div>
            <p className="text-[13px] text-govuk-dark-grey mb-1.5 leading-snug">
              {agent.description}
            </p>

            {/* Trust badge for Dot */}
            {isDot && (
              <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-md bg-blue-100/80 w-fit">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1d70b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="shrink-0"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-[11px] font-medium text-govuk-blue">
                  Verified steps — you approve every action
                </span>
              </div>
            )}

            {/* Caution notice for Max */}
            {isMax && (
              <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-md bg-amber-100/80 w-fit">
                <svg
                  className="shrink-0"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b45309"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="text-[11px] font-medium text-amber-800">
                  Fast but autonomous — double-check actions
                </span>
              </div>
            )}

            {/* No AI notice */}
            {isNone && (
              <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-md bg-gray-100/80 w-fit">
                <svg
                  className="shrink-0"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4b5563"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <line x1="8" y1="8" x2="16" y2="16" />
                </svg>
                <span className="text-[11px] font-medium text-gray-700">
                  No AI — you browse GOV.UK directly
                </span>
              </div>
            )}

            <div className="flex gap-1.5">
              {agent.traits.map((trait) => (
                <span
                  key={trait}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    isDot
                      ? "bg-blue-100 text-govuk-blue"
                      : isMax
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {trait}
                </span>
              ))}
            </div>
          </button>
        );
      })}

      {/* Demo / Live toggle */}
      <div className="flex items-center justify-between px-3.5 py-3 rounded-card border border-gray-200 bg-gray-50/50">
        <div className="flex-1 min-w-0">
          <strong className="text-sm text-govuk-black">
            {isDemo ? "Demo mode" : "Live mode"}
          </strong>
          <p className="text-xs text-govuk-dark-grey leading-tight">
            {isDemo
              ? "Scripted responses — no API key needed"
              : "Real LLM — requires ANTHROPIC_API_KEY"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setServiceMode(isDemo ? "mcp" : "demo")}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-3 ${
            isDemo ? "bg-gray-300" : "bg-govuk-green"
          }`}
          role="switch"
          aria-checked={!isDemo}
          aria-label="Toggle live mode"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              isDemo ? "" : "translate-x-5"
            }`}
          />
        </button>
      </div>

      <button
        onClick={handleApply}
        className="w-full py-3 rounded-full bg-govuk-blue text-white font-bold text-sm transition-colors touch-feedback"
      >
        Apply
      </button>
    </div>
  );
}
