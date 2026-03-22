"use client";

import { useAppStore } from "@/lib/store";

/**
 * ServiceStepCard — compact inline card for rendering a service step
 * within chat messages. Used when the agent mentions a specific service
 * as part of a life event journey.
 *
 * Renders as a small, official-looking card with department badge,
 * service name, and brief description. Visually distinct from chat text
 * to signal "this is a concrete thing that will happen."
 */

/** Department colour accents */
const DEPT_COLOURS: Record<string, string> = {
  GRO: "#4c6272",
  DWP: "#00857e",
  HMRC: "#008770",
  DVLA: "#006c56",
  HMCTS: "#902082",
  "Home Office": "#9b1a47",
  NHS: "#005eb8",
  OPG: "#4c6272",
};

function getDeptColour(dept: string): string {
  return DEPT_COLOURS[dept] || "#1d70b8";
}

/** Status indicator */
function StatusDot({ status }: { status: "upcoming" | "ready" | "done" }) {
  const config = {
    upcoming: { colour: "bg-govuk-blue", label: "Next step" },
    ready: { colour: "bg-amber-500", label: "Ready to start" },
    done: { colour: "bg-govuk-green", label: "Complete" },
  };
  const c = config[status];
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${c.colour}`} />
      <span className="text-[10px] font-medium text-govuk-dark-grey uppercase tracking-wide">
        {c.label}
      </span>
    </span>
  );
}

interface ServiceStepCardProps {
  serviceId: string;
  name: string;
  dept: string;
  description?: string;
  status?: "upcoming" | "ready" | "done";
  urgent?: boolean;
  /** "step" = full card with accent bar (for highlighted next action).
   *  "mention" = quiet list item with left border (for conversational lists). */
  variant?: "step" | "mention";
}

export function ServiceStepCard({
  serviceId,
  name,
  dept,
  description,
  status = "upcoming",
  urgent,
  variant = "step",
}: ServiceStepCardProps) {
  const accentColour = getDeptColour(dept);

  // ── Mention variant: quiet, assured list item ──
  if (variant === "mention") {
    return (
      <div
        className="my-1.5 flex items-start gap-3 rounded-lg bg-white/60 pl-3 pr-4 py-2.5 border-l-[3px]"
        style={{ borderLeftColor: accentColour }}
      >
        {/* Status circle */}
        <div className="mt-0.5 shrink-0">
          {status === "done" ? (
            <div className="w-[18px] h-[18px] rounded-full bg-govuk-green flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : (
            <div
              className="w-[18px] h-[18px] rounded-full border-2"
              style={{ borderColor: accentColour }}
            />
          )}
        </div>
        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-govuk-text leading-snug">
            {name}
          </p>
          {description && (
            <p className="text-[11px] text-govuk-dark-grey mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
          {urgent && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-red-700">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Should be done within 5 days
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Step variant: full card with accent bar (default) ──
  return (
    <div className="my-2 rounded-xl overflow-hidden shadow-sm bg-white border border-gray-100">
      {/* Accent bar */}
      <div className="h-1" style={{ backgroundColor: accentColour }} />

      <div className="px-4 py-3">
        {/* Top row: department + status */}
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: accentColour }}
          >
            {dept}
          </span>
          <StatusDot status={status} />
        </div>

        {/* Service name */}
        <h4 className="text-sm font-bold text-govuk-text leading-snug">
          {name}
        </h4>

        {/* Description */}
        {description && (
          <p className="text-xs text-govuk-dark-grey mt-1 leading-relaxed">
            {description}
          </p>
        )}

        {/* Urgent badge */}
        {urgent && (
          <div className="mt-2 flex items-center gap-1.5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d4351c"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">
              Time-sensitive
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SERVICE_STEP_DATA — metadata for services referenced by [SERVICE:id] markers.
 * Used to render inline ServiceStepCards without needing an API call.
 */
export const SERVICE_STEP_DATA: Record<
  string,
  { name: string; dept: string; description: string; urgent?: boolean }
> = {
  "gro-register-death": {
    name: "Register the death",
    dept: "GRO",
    description:
      "Registering and getting official certificates. Should be done within 5 days at the register office.",
    urgent: true,
  },
  "dwp-tell-us-once": {
    name: "Tell Us Once",
    dept: "DWP",
    description:
      "Tell government departments in one go — so you don't have to repeat yourself to each one.",
  },
  "dwp-bereavement-support": {
    name: "Bereavement Support Payment",
    dept: "DWP",
    description:
      "Financial support you may be entitled to as a spouse — a lump sum and monthly payments.",
  },
  "gro-death-certificate": {
    name: "Death certificate",
    dept: "GRO",
    description: "Official certified copy, issued after registration. Needed for probate and banks.",
  },
  "hmcts-probate": {
    name: "Probate",
    dept: "HMCTS",
    description:
      "The legal process for managing the estate — accessing bank accounts, property, and settling affairs.",
  },
  "hmrc-iht400": {
    name: "Inheritance tax",
    dept: "HMRC",
    description: "Assess whether inheritance tax is due on the estate.",
  },
  // Baby life event
  "gro-register-birth": {
    name: "Register the birth",
    dept: "GRO",
    description: "Must be done within 42 days. Visit your local register office.",
    urgent: true,
  },
  "hmrc-child-benefit": {
    name: "Child Benefit",
    dept: "HMRC",
    description: "Regular payments to help with the cost of raising a child.",
  },
  "dwp-sure-start-grant": {
    name: "Sure Start Maternity Grant",
    dept: "DWP",
    description: "A one-off payment of £500 to help with the costs of a new baby.",
  },
  // Driving
  "dvla-provisional-licence": {
    name: "Apply for a provisional licence",
    dept: "DVLA",
    description: "Your first step to learning to drive.",
  },
  // Benefits
  "dwp-universal-credit": {
    name: "Universal Credit",
    dept: "DWP",
    description: "Financial support if you're on a low income or out of work.",
  },
};
