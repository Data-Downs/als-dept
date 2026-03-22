"use client";

import type { ConsentPreference } from "@als/schemas";
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

const SCOPE_LABELS: Record<string, string> = {
  once: "One-time",
  service: "This service",
  department: "Department-wide",
  "cross-government": "All departments",
};

const DECISION_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  allow: { label: "Allowed", bg: "bg-emerald-100", text: "text-emerald-800" },
  deny: { label: "Denied", bg: "bg-red-100", text: "text-red-800" },
  "ask-each-time": {
    label: "Ask each time",
    bg: "bg-amber-100",
    text: "text-amber-800",
  },
};

export function ConsentPreferenceCard({
  preference,
}: {
  preference: ConsentPreference;
}) {
  const openBottomSheet = useAppStore((s) => s.openBottomSheet);
  const decision = DECISION_CONFIG[preference.decision] || DECISION_CONFIG.allow;

  const title = preference.department
    ? `${preference.department} may access your ${CATEGORY_LABELS[preference.dataCategory]?.toLowerCase() || preference.dataCategory}`
    : `All departments may access your ${CATEGORY_LABELS[preference.dataCategory]?.toLowerCase() || preference.dataCategory}`;

  const scopeLabel = SCOPE_LABELS[preference.scope] || preference.scope;

  return (
    <button
      type="button"
      onClick={() =>
        openBottomSheet("consent-preference", { preference })
      }
      className="w-full text-left"
    >
      <div className="rounded-2xl bg-purple-50 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        {/* Purple accent bar */}
        <div className="h-1.5 bg-[#912b88]" />

        <div className="px-4 py-3">
          {/* Top row: shield icon + scope badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#912b88"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wide text-[#912b88]">
                {CATEGORY_LABELS[preference.dataCategory] ||
                  preference.dataCategory}
              </span>
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${decision.bg} ${decision.text}`}
            >
              {decision.label}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-govuk-text mt-1">{title}</p>

          {/* Bottom row: scope + date */}
          <div className="flex items-center justify-between mt-2 text-[11px] text-govuk-dark-grey">
            <span className="inline-flex items-center gap-1">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
              {scopeLabel}
            </span>
            <span>
              Since{" "}
              {new Date(preference.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
