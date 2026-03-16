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
];

export function AgentSelectionSheet() {
  const currentAgent = useAppStore((s) => s.agent);
  const setAgent = useAppStore((s) => s.setAgent);
  const closeBottomSheet = useAppStore((s) => s.closeBottomSheet);
  const showToast = useAppStore((s) => s.showToast);
  const [selected, setSelected] = useState<AgentType>(currentAgent);

  const handleApply = () => {
    setAgent(selected);
    closeBottomSheet();
    showToast(`Agent set to ${selected.toUpperCase()}`);
  };

  return (
    <div className="space-y-3">
      {AGENTS.map((agent) => {
        const isDot = agent.id === "dot";
        const isMax = agent.id === "max";
        const isSelected = selected === agent.id;

        // Dot: pale blue (safe). Max: pale amber (caution).
        const baseBg = isDot ? "bg-blue-50/70" : "bg-amber-50/70";
        const selectedBorder = isDot ? "border-govuk-blue" : "border-amber-500";
        const unselectedBorder = isDot ? "border-blue-200" : "border-amber-200";

        return (
          <button
            key={agent.id}
            onClick={() => setSelected(agent.id)}
            className={`w-full text-left p-4 rounded-card border-2 transition-all touch-feedback ${baseBg} ${
              isSelected
                ? selectedBorder
                : `${unselectedBorder} hover:border-gray-300`
            }`}
          >
            <div className="flex items-center gap-3 mb-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  isDot ? "bg-govuk-blue" : "bg-amber-500"
                }`}
              >
                {isDot ? "D" : "M"}
              </div>
              <div className="flex-1">
                <strong className="text-govuk-black">{agent.name}</strong>
                <p className="text-xs text-govuk-dark-grey">{agent.subtitle}</p>
              </div>
              {isSelected && (
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isDot ? "bg-govuk-blue" : "bg-amber-500"
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
            <p className="text-sm text-govuk-dark-grey mb-2">
              {agent.description}
            </p>

            {/* Trust badge for Dot */}
            {isDot && (
              <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-md bg-blue-100/80 w-fit">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1d70b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-xs font-medium text-govuk-blue">
                  Verified steps — you approve every action
                </span>
              </div>
            )}

            {/* Caution notice for Max */}
            {isMax && (
              <div className="flex items-start gap-1.5 mb-2 px-2.5 py-1.5 rounded-md bg-amber-100/80 w-fit">
                <svg
                  className="shrink-0 mt-0.5"
                  width="14"
                  height="14"
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
                <span className="text-xs font-medium text-amber-800">
                  Fast but autonomous — always double-check actions taken on
                  your behalf
                </span>
              </div>
            )}

            <div className="flex gap-1.5">
              {agent.traits.map((trait) => (
                <span
                  key={trait}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isDot
                      ? "bg-blue-100 text-govuk-blue"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {trait}
                </span>
              ))}
            </div>
          </button>
        );
      })}

      <button
        onClick={handleApply}
        className="w-full py-3 rounded-full bg-govuk-blue text-white font-bold text-sm  transition-colors touch-feedback"
      >
        Apply
      </button>
    </div>
  );
}
