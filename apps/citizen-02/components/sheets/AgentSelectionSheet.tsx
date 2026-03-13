"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import type { AgentType } from "@/lib/types";

const AGENTS: Array<{
  id: AgentType;
  name: string;
  subtitle: string;
  description: string;
  behaviour: string;
  expectation: string;
  traits: string[];
}> = [
  {
    id: "dot",
    name: "DOT",
    subtitle: "Digital Online Triage",
    description: "A careful, methodical agent that follows GOV.UK policy precisely. Asks questions one at a time and explains reasoning clearly.",
    behaviour: "DOT walks you through each step individually, checking your eligibility against policy rules before moving on. It will always explain why it needs information and what it does with it.",
    expectation: "Expect a slower, more thorough conversation. DOT won\u2019t skip ahead or assume anything \u2014 every action is confirmed with you first.",
    traits: ["Methodical", "Policy-focused", "Step-by-step"],
  },
  {
    id: "max",
    name: "MAX",
    subtitle: "Multi-service Action eXpert",
    description: "A proactive agent that anticipates needs and suggests related services. Gathers information efficiently and offers comprehensive guidance.",
    behaviour: "MAX looks across multiple services at once and suggests things you might not have thought of. It gathers information upfront so it can work through several tasks in one go.",
    expectation: "Expect a faster, more wide-ranging conversation. MAX may surface benefits or obligations you weren\u2019t aware of and will try to handle as much as possible on your behalf.",
    traits: ["Proactive", "Efficient", "Comprehensive"],
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
    <div className="space-y-4">
      {AGENTS.map((agent) => (
        <button
          key={agent.id}
          onClick={() => setSelected(agent.id)}
          className={`w-full text-left p-4 rounded-card border-2 transition-all touch-feedback ${
            selected === agent.id
              ? "border-govuk-blue bg-blue-50/50"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
              agent.id === "dot" ? "bg-govuk-blue" : "bg-govuk-purple"
            }`}>
              {agent.id === "dot" ? "D" : "M"}
            </div>
            <div>
              <strong className="text-govuk-black">{agent.name}</strong>
              <p className="text-xs text-govuk-dark-grey">{agent.subtitle}</p>
            </div>
            {selected === agent.id && (
              <span className="ml-auto w-5 h-5 rounded-full bg-govuk-blue flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
            )}
          </div>
          <p className="text-sm text-govuk-black mb-2">{agent.description}</p>
          {selected === agent.id && (
            <div className="space-y-2 mb-3">
              <div>
                <p className="text-xs font-bold text-govuk-dark-grey uppercase tracking-wide mb-0.5">Behaviour</p>
                <p className="text-sm text-govuk-dark-grey leading-relaxed">{agent.behaviour}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-govuk-dark-grey uppercase tracking-wide mb-0.5">What to expect</p>
                <p className="text-sm text-govuk-dark-grey leading-relaxed">{agent.expectation}</p>
              </div>
            </div>
          )}
          <div className="flex gap-1.5">
            {agent.traits.map((trait) => (
              <span
                key={trait}
                className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-govuk-dark-grey"
              >
                {trait}
              </span>
            ))}
          </div>
        </button>
      ))}

      <button
        onClick={handleApply}
        className="w-full py-3 rounded-full bg-govuk-blue text-white font-bold text-sm hover:bg-blue-800 transition-colors touch-feedback"
      >
        Apply
      </button>
    </div>
  );
}
