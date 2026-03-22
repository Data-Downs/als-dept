"use client";

import { useState, useCallback } from "react";
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

/** Copy-to-clipboard button with clipboard icon */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-auto shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
      aria-label={copied ? "Copied" : `Copy ${text}`}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00703c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

/** Official HMRC circular crest SVG (from hmrc-frontend) */
function HmrcCrest({ colour }: { colour: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 45.35 45.35"
      fill={colour}
      className="shrink-0"
      aria-hidden="true"
    >
      <path d="m28.5,16.6c.82-.34,1.22-1.29.88-2.12-.34-.83-1.3-1.24-2.12-.9-.84.34-1.23,1.31-.89,2.14.34.83,1.3,1.23,2.14.88Z"/>
      <path d="m22.06,19.36c-.84.34-1.23,1.31-.89,2.14.34.83,1.3,1.23,2.14.88.82-.34,1.22-1.29.88-2.12-.34-.83-1.3-1.24-2.12-.9Z"/>
      <path d="m32.86,19.2c.82-.34,1.22-1.29.88-2.12-.34-.83-1.3-1.24-2.12-.9-.84.34-1.23,1.31-.89,2.14.34.83,1.3,1.23,2.14.88Z"/>
      <path d="m33.62,22.63c.34.83,1.3,1.23,2.14.88.82-.34,1.22-1.29.88-2.12-.34-.83-1.3-1.24-2.12-.9-.84.34-1.23,1.31-.89,2.14Z"/>
      <path d="m21.81,11.4c.06.08.13.15.21.21l-1.19,3.58s0,0,0,.01h0s0,0,0,0c-.06.18-.09.37-.09.56,0,.97.71,1.77,1.64,1.9.01,0,.03,0,.04,0,.08.01.16.02.24.02h0c.08,0,.16,0,.24-.02.01,0,.03,0,.04,0,.93-.14,1.64-.94,1.64-1.9,0-.2-.03-.39-.08-.56h0s0,0,0,0c0,0,0,0,0-.01l-1.19-3.58c.08-.06.15-.13.21-.21h0s2.06,1.08,2.06,1.08v-3.04l-2.06.65h0c-.06-.08-.12-.15-.2-.21h0s.83-2.62.83-2.62h-1.49s-1.49,0-1.49,0l.83,2.61h0c-.08.06-.14.13-.2.21h0s-2.06-.65-2.06-.65v3.04l2.06-1.08h0Z"/>
      <path d="m16.83,16.6c.84.35,1.79-.05,2.14-.88.34-.83-.05-1.79-.89-2.14-.82-.34-1.78.07-2.12.9-.34.83.05,1.78.88,2.12Z"/>
      <path d="m12.46,19.2c.84.35,1.79-.05,2.14-.88.34-.83-.05-1.79-.89-2.14-.82-.34-1.78.07-2.12.9-.34.83.05,1.78.88,2.12Z"/>
      <path d="m9.57,23.51c.84.35,1.79-.05,2.14-.88.34-.83-.05-1.79-.89-2.14-.82-.34-1.78.07-2.12.9-.34.83.05,1.78.88,2.12Z"/>
      <path d="m34.61,25.35c.22,1.12.26,1.65,0,2.37-.37-.36-.71-1.01-.98-2.02l-1.07,3.57c.65-.45,1.16-.74,1.73-.75-1.02,2.2-2.3,2.77-3.12,2.61-1.01-.19-1.47-1.09-1.32-1.85.23-1.08,1.34-1.36,1.86-.11.99-2.02-.69-2.65-1.77-2.05,1.66-1.66,1.85-3.13.51-4.92-1.87,1.43-1.89,2.84-1.05,4.84-1.09-1.25-2.79-.58-2.18,1.44.79-1.22,1.83-.45,1.67.71-.14,1.01-1.47,1.82-3.13,1.68-2.38-.22-2.52-1.86-2.58-3.21.58-.11,1.64.43,2.53,1.69l.33-3.79c-.98,1.02-1.86,1.21-2.85,1.24.33-1.02,1.84-2.7,1.84-2.7h-4.73s1.51,1.68,1.84,2.7c-.99-.03-1.87-.22-2.85-1.24l.33,3.79c.9-1.26,1.95-1.8,2.53-1.69-.06,1.36-.2,3-2.58,3.21-1.66.14-2.99-.67-3.13-1.68-.16-1.16.88-1.92,1.67-.71.61-2.02-1.09-2.69-2.18-1.44.84-1.99.82-3.41-1.05-4.84-1.34,1.78-1.15,3.26.51,4.92-1.08-.6-2.76.03-1.77,2.05.52-1.26,1.63-.98,1.86.11.16.76-.31,1.66-1.32,1.85-.83.15-2.1-.41-3.12-2.61.58.01,1.08.3,1.73.75l-1.07-3.57c-.27,1-.62,1.66-.98,2.02-.25-.72-.21-1.25,0-2.37l-2.21.79c1.18,1.6,2.31,3.86,3.25,7.79,3.29-.47,6.99-.74,10.9-.74s7.61.26,10.9.74c.94-3.93,2.07-6.19,3.25-7.79l-2.21-.79Z"/>
      <path d="m22.68.57C10.47.57.57,10.47.57,22.68s9.9,22.11,22.11,22.11,22.11-9.9,22.11-22.11S34.89.57,22.68.57Zm0,41.69c-10.81,0-19.58-8.77-19.58-19.58S11.86,3.1,22.68,3.1s19.58,8.77,19.58,19.58-8.77,19.58-19.58,19.58Z"/>
    </svg>
  );
}

/** Official GOV.UK Tudor Crown SVG (from govuk-frontend) */
function TudorCrown({ colour }: { colour: string }) {
  return (
    <svg
      width="18"
      height="16"
      viewBox="0 0 64 60"
      fill={colour}
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="20" cy="17.6" r="3.7"/>
      <circle cx="10.2" cy="23.5" r="3.7"/>
      <circle cx="3.7" cy="33.2" r="3.7"/>
      <circle cx="31.7" cy="30.6" r="3.7"/>
      <circle cx="43.3" cy="17.6" r="3.7"/>
      <circle cx="53.2" cy="23.5" r="3.7"/>
      <circle cx="59.7" cy="33.2" r="3.7"/>
      <path d="M33.1,9.8c.2-.1.3-.3.5-.5l4.6,2.4v-6.8l-4.6,1.5c-.1-.2-.3-.3-.5-.5l1.9-5.9h-6.7l1.9,5.9c-.2.1-.3.3-.5.5l-4.6-1.5v6.8l4.6-2.4c.1.2.3.3.5.5l-2.6,8c-.9,2.8,1.2,5.7,4.1,5.7h0c3,0,5.1-2.9,4.1-5.7l-2.6-8ZM37,37.9s-3.4,3.8-4.1,6.1c2.2,0,4.2-.5,6.4-2.8l-.7,8.5c-2-2.8-4.4-4.1-5.7-3.8.1,3.1.5,6.7,5.8,7.2,3.7.3,6.7-1.5,7-3.8.4-2.6-2-4.3-3.7-1.6-1.4-4.5,2.4-6.1,4.9-3.2-1.9-4.5-1.8-7.7,2.4-10.9,3,4,2.6,7.3-1.2,11.1,2.4-1.3,6.2,0,4,4.6-1.2-2.8-3.7-2.2-4.2.2-.3,1.7.7,3.7,3,4.2,1.9.3,4.7-.9,7-5.9-1.3,0-2.4.7-3.9,1.7l2.4-8c.6,2.3,1.4,3.7,2.2,4.5.6-1.6.5-2.8,0-5.3l5,1.8c-2.6,3.6-5.2,8.7-7.3,17.5-7.4-1.1-15.7-1.7-24.5-1.7h0c-8.8,0-17.1.6-24.5,1.7-2.1-8.9-4.7-13.9-7.3-17.5l5-1.8c-.5,2.5-.6,3.7,0,5.3.8-.8,1.6-2.3,2.2-4.5l2.4,8c-1.5-1-2.6-1.7-3.9-1.7,2.3,5,5.2,6.2,7,5.9,2.3-.4,3.3-2.4,3-4.2-.5-2.4-3-3.1-4.2-.2-2.2-4.6,1.6-6,4-4.6-3.7-3.7-4.2-7.1-1.2-11.1,4.2,3.2,4.3,6.4,2.4,10.9,2.5-2.8,6.3-1.3,4.9,3.2-1.8-2.7-4.1-1-3.7,1.6.3,2.3,3.3,4.1,7,3.8,5.4-.5,5.7-4.2,5.8-7.2-1.3-.2-3.7,1-5.7,3.8l-.7-8.5c2.2,2.3,4.2,2.7,6.4,2.8-.7-2.3-4.1-6.1-4.1-6.1h10.6,0Z"/>
    </svg>
  );
}

/** Department logo — HMRC gets its own crest, others get the Tudor Crown */
function DepartmentCrest({ department, colour }: { department: string; colour: string }) {
  if (department === "HM Revenue & Customs") {
    return <HmrcCrest colour={colour} />;
  }
  return <TudorCrown colour={colour} />;
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
      className="my-4 opacity-0 animate-outcome-arrive motion-reduce:opacity-100 motion-reduce:animate-none"
      style={{ animationDelay: "0.15s" }}
    >
      <div
        className="rounded-2xl bg-white shadow-md overflow-hidden border border-gray-100"
      >
        {/* Department logo — official GOV.UK organisation logo style */}
        <div className="px-5 pt-6 pb-5">
          <div
            className="flex items-center gap-2.5 pl-3"
            style={{ borderLeft: `2px solid ${accentColour}` }}
          >
            <DepartmentCrest department={outcome.department} colour="#0b0c0c" />
            <span className="text-base font-normal text-govuk-black leading-tight">
              {outcome.department}
            </span>
          </div>
        </div>

        <div className="px-5 pb-5">
          {/* Title */}
          <h3 className="text-base font-bold text-govuk-black leading-snug mb-3">
            {outcome.title}
          </h3>

          {/* Reference bar — full width with copy */}
          <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-gray-50 border border-gray-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Ref
            </span>
            <span className="text-sm font-mono font-bold text-govuk-black">
              {outcome.reference}
            </span>
            <CopyButton text={outcome.reference} />
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

              // Credential number — monospaced with copy
              if (detail.type === "credential-number") {
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs text-govuk-dark-grey">
                      {detail.label}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-sm font-mono font-semibold text-govuk-black tracking-widest">
                        {detail.value}
                      </span>
                      <CopyButton text={detail.value} />
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
