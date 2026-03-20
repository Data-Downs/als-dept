"use client";

import type { JourneyOutcome } from "@/lib/outcome-types";

/** Department → accent colour mapping (official departmental colours) */
const DEPT_COLOURS: Record<string, string> = {
  "Department for Work and Pensions": "#00857e",
  "HM Revenue & Customs": "#008770",
  "General Register Office": "#4c6272",
  "HM Courts & Tribunals Service": "#902082",
  "Home Office": "#9b1a47",
  "Driver and Vehicle Licensing Agency": "#006c56",
  "Department for Education": "#003a69",
  "Ministry of Justice": "#902082",
};

function getDeptColour(department: string): string {
  return DEPT_COLOURS[department] || "#1d70b8";
}

/** Small HM Government crown SVG */
function CrownIcon({ colour }: { colour: string }) {
  return (
    <svg
      width="14"
      height="12"
      viewBox="0 0 132 97"
      fill={colour}
      className="shrink-0 opacity-90"
    >
      <path d="M25 97h82v-7H25v7zm-.5-16h83L113 24l-21.5 25-25-49-25 49L20 24l5.5 57zM66 0C60.5 0 56 4.5 56 10s4.5 10 10 10 10-4.5 10-10S71.5 0 66 0zM0 14c0 5.5 4.5 10 10 10s10-4.5 10-10S15.5 4 10 4 0 8.5 0 14zm112 0c0 5.5 4.5 10 10 10s10-4.5 10-10-4.5-10-10-10-10 4.5-10 10z" />
    </svg>
  );
}

function formatIssuedDate(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Status badge shown at the bottom of the card */
function StatusBadge({ type }: { type: JourneyOutcome["type"] }) {
  const config: Record<
    string,
    { label: string; icon: string }
  > = {
    payment: {
      label: "Payment scheduled to your bank account",
      icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
    },
    credential: {
      label: "Added to your documents",
      icon: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z",
    },
    document: {
      label: "Added to your documents",
      icon: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z",
    },
    registration: {
      label: "Registration confirmed",
      icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
    },
    notification: {
      label: "All departments notified",
      icon: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
    },
  };

  const c = config[type] || config.registration;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="#00703c"
        className="shrink-0"
      >
        <path d={c.icon} />
      </svg>
      <span className="text-xs font-semibold text-emerald-800">
        {c.label}
      </span>
    </div>
  );
}

export default function OutcomeCard({
  outcome,
}: {
  outcome: JourneyOutcome;
}) {
  const accentColour = getDeptColour(outcome.department);
  const isNotification = outcome.type === "notification";
  const isPayment = outcome.type === "payment";

  return (
    <div
      className="my-4 opacity-0 animate-outcome-arrive"
      style={{ animationDelay: "0.15s" }}
    >
      <div
        className="rounded-2xl bg-white shadow-md overflow-hidden border border-gray-100"
        style={{ borderTopWidth: "4px", borderTopColor: accentColour }}
      >
        {/* Department header */}
        <div
          className="flex items-center gap-2 px-5 pt-4 pb-2"
        >
          <CrownIcon colour={accentColour} />
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: accentColour }}
          >
            {outcome.department}
          </span>
        </div>

        <div className="px-5 pb-5">
          {/* Title */}
          <h3 className="text-base font-bold text-govuk-black leading-snug mb-3">
            {outcome.title}
          </h3>

          {/* Reference pill */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 rounded-md bg-gray-50 border border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Ref
            </span>
            <span className="text-xs font-mono font-bold text-govuk-black">
              {outcome.reference}
            </span>
          </div>

          {/* Detail rows */}
          <div className="space-y-0.5 mb-4">
            {outcome.details.map((detail, i) => {
              // Notification type: render as checkmark list
              if (isNotification && detail.value === "Notified") {
                return (
                  <div key={i} className="flex items-center gap-2.5 py-1.5">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="#00703c"
                      className="shrink-0"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <span className="text-sm text-govuk-black">
                      {detail.label}
                    </span>
                  </div>
                );
              }

              // Highlighted currency (e.g. lump sum amount)
              if (detail.highlight && detail.type === "currency") {
                return (
                  <div key={i} className="py-2">
                    <p className="text-xs text-govuk-dark-grey mb-0.5">
                      {detail.label}
                    </p>
                    <p className="text-2xl font-bold text-emerald-700 tracking-tight">
                      {detail.value}
                    </p>
                  </div>
                );
              }

              // Highlighted non-currency (e.g. "Nil — estate below threshold")
              if (detail.highlight) {
                return (
                  <div key={i} className="py-2">
                    <p className="text-xs text-govuk-dark-grey mb-0.5">
                      {detail.label}
                    </p>
                    <p className="text-base font-bold text-govuk-black">
                      {detail.value}
                    </p>
                  </div>
                );
              }

              // Credential number — monospaced
              if (detail.type === "credential-number") {
                return (
                  <div
                    key={i}
                    className="flex items-baseline justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs text-govuk-dark-grey">
                      {detail.label}
                    </span>
                    <span className="text-sm font-mono font-semibold text-govuk-black">
                      {detail.value}
                    </span>
                  </div>
                );
              }

              // Standard detail row
              return (
                <div
                  key={i}
                  className="flex items-baseline justify-between py-1.5 border-b border-gray-50 last:border-0"
                >
                  <span className="text-xs text-govuk-dark-grey">
                    {detail.label}
                  </span>
                  <span className="text-sm font-semibold text-govuk-black text-right">
                    {detail.value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Status badge */}
          <StatusBadge type={outcome.type} />

          {/* Timestamp */}
          <p className="text-[11px] text-govuk-mid-grey mt-3">
            Issued {formatIssuedDate(outcome.issuedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
