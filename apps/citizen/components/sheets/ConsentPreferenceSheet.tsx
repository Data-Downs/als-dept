"use client";

import { useState } from "react";
import type { ConsentPreference, ConsentScope } from "@als/schemas";
import { useAppStore } from "@/lib/store";

const CATEGORY_LABELS: Record<string, string> = {
  identity: "Identity data",
  contact: "Contact details",
  financial: "Financial data",
  health: "Health data",
  housing: "Housing data",
  employment: "Employment data",
  legal: "Legal data",
};

const SCOPE_OPTIONS: Array<{ value: ConsentScope; label: string; description: string }> = [
  { value: "service", label: "This service only", description: "Only applies to the specific service" },
  { value: "department", label: "Department-wide", description: "Applies to all services from this department" },
  { value: "cross-government", label: "All departments", description: "Applies across all government services" },
];

const DECISION_OPTIONS: Array<{
  value: ConsentPreference["decision"];
  label: string;
  colour: string;
}> = [
  { value: "allow", label: "Allow", colour: "bg-emerald-500" },
  { value: "deny", label: "Deny", colour: "bg-red-500" },
  { value: "ask-each-time", label: "Ask each time", colour: "bg-amber-500" },
];

interface ConsentPreferenceSheetProps {
  data: {
    preference: ConsentPreference;
  };
}

export function ConsentPreferenceSheet({ data }: ConsentPreferenceSheetProps) {
  const { preference } = data;
  const closeBottomSheet = useAppStore((s) => s.closeBottomSheet);
  const revokeConsentPreference = useAppStore(
    (s) => s.revokeConsentPreference,
  );
  const updateConsentPreference = useAppStore(
    (s) => s.updateConsentPreference,
  );

  const [scope, setScope] = useState<ConsentScope>(preference.scope);
  const [decision, setDecision] = useState<ConsentPreference["decision"]>(
    preference.decision,
  );
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const hasChanges = scope !== preference.scope || decision !== preference.decision;

  const handleSave = async () => {
    setSaving(true);
    await updateConsentPreference(preference.id, { scope, decision });
    setSaving(false);
    closeBottomSheet();
  };

  const handleRevoke = async () => {
    setRevoking(true);
    await revokeConsentPreference(preference.id);
    setRevoking(false);
    closeBottomSheet();
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#912b88"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h3 className="text-base font-bold text-govuk-text">
            {CATEGORY_LABELS[preference.dataCategory] ||
              preference.dataCategory}
          </h3>
        </div>
        {preference.department && (
          <p className="text-sm text-govuk-dark-grey">
            Department: {preference.department}
          </p>
        )}
      </div>

      {/* Decision */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-govuk-dark-grey mb-2">
          Decision
        </p>
        <div className="space-y-2">
          {DECISION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDecision(opt.value)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                decision === opt.value
                  ? "border-[#912b88] bg-purple-50"
                  : "border-govuk-mid-grey bg-white"
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full ${opt.colour}`}
              />
              <span
                className={`text-sm font-medium ${
                  decision === opt.value
                    ? "text-govuk-text"
                    : "text-govuk-dark-grey"
                }`}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Scope */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-govuk-dark-grey mb-2">
          Scope
        </p>
        <div className="space-y-2">
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setScope(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                scope === opt.value
                  ? "border-[#912b88] bg-purple-50"
                  : "border-govuk-mid-grey bg-white"
              }`}
            >
              <span
                className={`text-sm font-medium block ${
                  scope === opt.value
                    ? "text-govuk-text"
                    : "text-govuk-dark-grey"
                }`}
              >
                {opt.label}
              </span>
              <span className="text-[11px] text-govuk-dark-grey">
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active since */}
      <p className="text-[11px] text-govuk-mid-grey">
        Active since{" "}
        {new Date(preference.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      {/* Actions */}
      <div className="space-y-2">
        {hasChanges && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-[#912b88] text-white text-sm font-bold transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        )}
        <button
          type="button"
          onClick={handleRevoke}
          disabled={revoking}
          className="w-full py-3 rounded-xl border border-red-300 text-red-700 text-sm font-medium transition-opacity disabled:opacity-50"
        >
          {revoking ? "Revoking..." : "Revoke this permission"}
        </button>
      </div>
    </div>
  );
}
