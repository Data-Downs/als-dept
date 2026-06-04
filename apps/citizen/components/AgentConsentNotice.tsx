"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

const STORAGE_KEY = "als:agent-consent";

/**
 * Ambient consent moment for the probabilistic (agent) interpretation of a
 * citizen's free-text. Shown once at the start of a conversation — light,
 * dismissible, and never a modal interrupt. Acknowledgement persists locally;
 * no model interprets anything until the citizen has seen this.
 */
export function AgentConsentNotice() {
  const [acknowledged, setAcknowledged] = useState(true);

  useEffect(() => {
    setAcknowledged(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (acknowledged) return null;

  return (
    <div className="mx-auto max-w-sm text-left bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6">
      <div className="flex items-start gap-2">
        <Sparkles size={16} className="text-govuk-blue mt-0.5 shrink-0" strokeWidth={1.5} />
        <div>
          <p className="text-xs text-gray-700 leading-relaxed">
            An AI agent will read what you write to understand your situation and
            find the right services for you. It helps frame and surface your
            options — it never makes a decision for you. Nothing you type is
            interpreted until you continue.
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, "1");
              setAcknowledged(true);
            }}
            className="mt-2 text-xs font-semibold text-govuk-blue hover:underline"
          >
            Got it, continue
          </button>
        </div>
      </div>
    </div>
  );
}
