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
}

export function ServiceStepCard({
  serviceId,
  name,
  dept,
  description,
  status = "upcoming",
  urgent,
}: ServiceStepCardProps) {
  const accentColour = getDeptColour(dept);

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
      "Must be done within 5 days. You'll need to visit the register office in person with the medical certificate.",
    urgent: true,
  },
  "dwp-tell-us-once": {
    name: "Tell Us Once",
    dept: "DWP",
    description:
      "Notifies HMRC, DWP, DVLA, the Passport Office, and your local council — all at once.",
  },
  "dwp-bereavement-support": {
    name: "Bereavement Support Payment",
    dept: "DWP",
    description:
      "Financial support for the surviving spouse — a lump sum and monthly payments.",
  },
  "gro-death-certificate": {
    name: "Death certificate",
    dept: "GRO",
    description: "Certified copy issued after death registration. Needed for probate.",
  },
  "hmcts-probate": {
    name: "Apply for probate",
    dept: "HMCTS",
    description:
      "Legal authority to manage the estate — access bank accounts, sell property.",
  },
  "hmrc-iht400": {
    name: "Inheritance tax return",
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
