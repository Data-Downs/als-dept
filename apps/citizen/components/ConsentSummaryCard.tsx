"use client";

import { useState } from "react";
import type { ConsentGrant } from "@/lib/types";
import { resolveConsentFraming } from "@als/schemas";
import type { ConsentScope } from "@als/schemas";
import { useAppStore } from "@/lib/store";
import { categoriseField } from "@als/personal-data/src/field-categories";

interface ConsentSummaryCardProps {
  grants: ConsentGrant[];
  decisions: Record<string, "granted" | "denied">;
  onSubmit: () => void;
  onChangeDecision: (grantId: string) => void;
  hasRequiredDenials: boolean;
  isSubmitting: boolean;
  interactionType?: string;
  department?: string;
  serviceId?: string;
}

const SCOPE_OPTIONS: Array<{ value: ConsentScope; label: string }> = [
  { value: "once", label: "Just this time" },
  { value: "department", label: "Always for this department" },
  { value: "cross-government", label: "All departments" },
];

export function ConsentSummaryCard({
  grants,
  decisions,
  onSubmit,
  onChangeDecision,
  hasRequiredDenials,
  isSubmitting,
  interactionType,
  department,
  serviceId,
}: ConsentSummaryCardProps) {
  const grantedCount = grants.filter(
    (g) => decisions[g.id] === "granted",
  ).length;
  const deniedCount = grants.filter((g) => decisions[g.id] === "denied").length;
  const framing = resolveConsentFraming(interactionType);
  const addConsentPreference = useAppStore((s) => s.addConsentPreference);

  const [rememberPreference, setRememberPreference] = useState(false);
  const [preferenceScope, setPreferenceScope] = useState<ConsentScope>("department");

  const handleSubmitWithPreference = async () => {
    // Save standing preferences for granted consents
    if (rememberPreference && preferenceScope !== "once") {
      const grantedGrants = grants.filter((g) => decisions[g.id] === "granted");
      const categoriesSeen = new Set<string>();

      for (const grant of grantedGrants) {
        const categories = [...new Set(grant.data_shared.map(categoriseField))];
        for (const category of categories) {
          if (categoriesSeen.has(category)) continue;
          categoriesSeen.add(category);
          await addConsentPreference({
            userId: "", // filled server-side
            dataCategory: category,
            scope: preferenceScope,
            decision: "allow",
            department: preferenceScope === "department" ? department : undefined,
            serviceId: preferenceScope === "service" ? serviceId : undefined,
          });
        }
      }
    }
    onSubmit();
  };

  return (
    <div className="my-3 rounded-2xl bg-white shadow-sm">
      <div className="px-5 py-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#912b88"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </span>
          <span className="text-sm font-bold text-purple-700">
            Consent Summary
          </span>
          <span className="text-xs text-govuk-dark-grey ml-auto">
            {grantedCount} granted &middot; {deniedCount} declined
          </span>
        </div>

        <p className="text-sm text-govuk-dark-grey mb-4">
          Review your consent decisions before continuing.
        </p>

        {/* Summary rows */}
        <div className="space-y-0">
          {grants.map((grant) => {
            const decision = decisions[grant.id];
            const isGranted = decision === "granted";

            return (
              <div
                key={grant.id}
                className="py-3 border-t border-gray-200 first:border-t-0 first:pt-0 last:pb-0"
              >
                {/* Row header: description + status + change */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-govuk-black truncate">
                      {grant.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                        isGranted
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isGranted ? "Granted" : "Declined"}
                    </span>
                    <button
                      onClick={() => onChangeDecision(grant.id)}
                      className="text-xs text-govuk-blue underline hover:no-underline"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Data being shared (only if granted) */}
                {isGranted && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {grant.data_shared.map((d) => (
                      <span
                        key={d}
                        className="text-xs bg-gray-100 text-govuk-dark-grey px-2 py-0.5 rounded-lg"
                      >
                        {d.replace(/_/g, " ")}
                      </span>
                    ))}
                    <span className="text-xs text-govuk-dark-grey">
                      &rarr; {grant.source.replace(/-/g, " ")}
                    </span>
                  </div>
                )}

                {/* Required denial warning (inline) */}
                {!isGranted && grant.required && (
                  <p className="text-xs text-red-600 mt-1">
                    This consent is required to continue.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Required denials warning banner */}
        {hasRequiredDenials && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
            <p className="text-sm font-bold text-yellow-800">
              {framing.requiredDenialTitle}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              {framing.requiredDenialWarning}
            </p>
          </div>
        )}

        {/* Remember preference toggle */}
        {grantedCount > 0 && !hasRequiredDenials && (
          <div className="mt-4 border border-purple-200 rounded-xl p-4 bg-purple-50/50">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberPreference}
                onChange={(e) => setRememberPreference(e.target.checked)}
                className="w-4 h-4 rounded border-purple-300 text-[#912b88] focus:ring-[#912b88] accent-[#912b88]"
              />
              <span className="text-sm font-medium text-govuk-text">
                Remember this preference
              </span>
            </label>
            {rememberPreference && (
              <div className="mt-3 ml-7 space-y-1.5">
                {SCOPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="consent-scope"
                      value={opt.value}
                      checked={preferenceScope === opt.value}
                      onChange={() => setPreferenceScope(opt.value)}
                      className="w-3.5 h-3.5 text-[#912b88] focus:ring-[#912b88] accent-[#912b88]"
                    />
                    <span className="text-xs text-govuk-dark-grey">
                      {opt.value === "department" && department
                        ? `Always for ${department}`
                        : opt.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit button */}
        <div className="mt-4">
          <button
            onClick={handleSubmitWithPreference}
            disabled={hasRequiredDenials || isSubmitting}
            className={`w-full py-3 rounded-full font-bold text-sm transition-colors ${
              hasRequiredDenials || isSubmitting
                ? "bg-govuk-mid-grey text-white cursor-not-allowed"
                : "bg-[#00703c] text-white hover:bg-[#005a30]"
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit and continue"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
