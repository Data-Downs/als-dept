"use client";

import { useAppStore } from "@/lib/store";
import { useState } from "react";

const SENSITIVE_FIELDS = [
  "nationalInsuranceNumber",
  "national_insurance_number",
  "accountNumber",
  "sortCode",
];

function maskValue(value: string): string {
  if (value.length <= 4) return "••••";
  return "••••" + value.slice(-4);
}

function FieldRow({
  label,
  value,
  sensitive,
}: {
  label: string;
  value: string;
  sensitive?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-govuk-dark-grey">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-govuk-black">
          {sensitive && !revealed ? maskValue(value) : value}
        </span>
        {sensitive && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="text-[9px] text-govuk-blue underline"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </div>
  );
}

function DataSection({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border ${color} overflow-hidden`}>
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white/60">
        {icon}
        <h3 className="text-xs font-semibold text-govuk-black">{title}</h3>
      </div>
      <div className="px-3.5 pb-3">{children}</div>
    </div>
  );
}

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function renderFields(
  obj: Record<string, unknown>,
  prefix = "",
): React.ReactNode[] {
  const rows: React.ReactNode[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const isSensitive = SENSITIVE_FIELDS.includes(key);

    if (typeof value === "object" && !Array.isArray(value)) {
      rows.push(
        <div key={fullKey} className="mt-2 first:mt-0">
          <span className="text-[10px] font-semibold text-govuk-dark-grey uppercase tracking-wider">
            {formatFieldName(key)}
          </span>
          {renderFields(value as Record<string, unknown>, fullKey)}
        </div>,
      );
    } else if (Array.isArray(value)) {
      rows.push(
        <FieldRow
          key={fullKey}
          label={formatFieldName(key)}
          value={value
            .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
            .join(", ")}
        />,
      );
    } else {
      rows.push(
        <FieldRow
          key={fullKey}
          label={formatFieldName(key)}
          value={String(value)}
          sensitive={isSensitive}
        />,
      );
    }
  }
  return rows;
}

export function PersonalDataPanel({ onClose }: { onClose: () => void }) {
  const personaData = useAppStore((s) => s.personaData);
  const lastToolUseLog = useAppStore((s) => s.lastToolUseLog);
  const [activeTab, setActiveTab] = useState<"data" | "access">("data");

  if (!personaData) return null;

  const name =
    personaData.name ||
    (personaData.primaryContact
      ? `${personaData.primaryContact.firstName} ${personaData.primaryContact.lastName}`
      : "User");

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Build verified data
  const verified: Record<string, unknown> = {};
  if (personaData.primaryContact) {
    const pc = personaData.primaryContact;
    if (pc.firstName) verified["Full name"] = `${pc.firstName} ${pc.lastName}`;
    if (pc.dateOfBirth) verified["Date of birth"] = pc.dateOfBirth;
    if (pc.nationalInsuranceNumber)
      verified["NI number"] = pc.nationalInsuranceNumber;
    if (pc.email) verified["Email"] = pc.email;
    if (pc.phone) verified["Phone"] = pc.phone;
  }

  // Build submitted data
  const submitted: Record<string, unknown> = {};
  if (personaData.address) submitted["Address"] = personaData.address;
  if (personaData.employment) submitted["Employment"] = personaData.employment;
  if (personaData.financials) submitted["Financials"] = personaData.financials;

  // Credentials
  const credentials = personaData.credentials || [];

  // Tool access log
  const toolsAccessed = lastToolUseLog.filter(
    (t) => t.tool === "get_citizen_context" || t.tool === "check_eligibility",
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-govuk-page-bg h-full overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="bg-govuk-blue text-white px-4 py-4 pt-14">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5l10 10"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span className="text-xs text-blue-200">Personal data</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
              {initials}
            </div>
            <div>
              <h2 className="font-bold text-base">{name}</h2>
              {personaData.description && (
                <p className="text-xs text-blue-200 mt-0.5">
                  {personaData.description}
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setActiveTab("data")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "data"
                  ? "bg-white text-govuk-blue"
                  : "text-blue-200 hover:bg-white/10"
              }`}
            >
              Your data
            </button>
            <button
              onClick={() => setActiveTab("access")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "access"
                  ? "bg-white text-govuk-blue"
                  : "text-blue-200 hover:bg-white/10"
              }`}
            >
              Agent access
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {activeTab === "data" && (
            <>
              {/* Verified credentials */}
              <DataSection
                title="Verified credentials"
                icon={
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9l-3 1.5.5-3.5L2 4.5 5.5 4 7 1z"
                      stroke="#00703c"
                      strokeWidth="1.2"
                      fill="#00703c"
                      fillOpacity="0.1"
                    />
                  </svg>
                }
                color="border-green-200 bg-green-50/50"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                    Tier 1 — Verified
                  </span>
                </div>
                {Object.entries(verified).map(([key, value]) => (
                  <FieldRow
                    key={key}
                    label={key}
                    value={String(value)}
                    sensitive={key === "NI number"}
                  />
                ))}
              </DataSection>

              {/* Credentials */}
              {credentials.length > 0 && (
                <DataSection
                  title="Credentials"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect
                        x="2"
                        y="4"
                        width="10"
                        height="7"
                        rx="1.5"
                        stroke="#1d70b8"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M5 4V3a2 2 0 014 0v1"
                        stroke="#1d70b8"
                        strokeWidth="1.2"
                      />
                    </svg>
                  }
                  color="border-blue-200 bg-blue-50/50"
                >
                  {credentials.map((cred, i) => (
                    <div
                      key={i}
                      className="py-1.5 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-govuk-black">
                          {formatFieldName(cred.type)}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            cred.status === "valid"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {cred.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-govuk-dark-grey mt-0.5">
                        {cred.issuer} · {maskValue(cred.number)}
                        {cred.expires && ` · Expires ${cred.expires}`}
                      </div>
                    </div>
                  ))}
                </DataSection>
              )}

              {/* Submitted data */}
              <DataSection
                title="Submitted data"
                icon={
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M8.5 2H4.5a1.5 1.5 0 00-1.5 1.5v7a1.5 1.5 0 001.5 1.5h5a1.5 1.5 0 001.5-1.5V4.5L8.5 2z"
                      stroke="#505a5f"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M8.5 2v2.5H11"
                      stroke="#505a5f"
                      strokeWidth="1.2"
                    />
                  </svg>
                }
                color="border-gray-200 bg-gray-50/50"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Tier 2 — Self-reported
                  </span>
                </div>
                {Object.entries(submitted).map(([key, value]) => (
                  <div key={key}>
                    {typeof value === "object" && value !== null ? (
                      renderFields(value as Record<string, unknown>, key)
                    ) : (
                      <FieldRow label={key} value={String(value)} />
                    )}
                  </div>
                ))}
              </DataSection>
            </>
          )}

          {activeTab === "access" && (
            <>
              {/* Agent access log */}
              <DataSection
                title="What the agent accessed"
                icon={
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle
                      cx="7"
                      cy="7"
                      r="5"
                      stroke="#912b88"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M7 4v3l2 1"
                      stroke="#912b88"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                }
                color="border-purple-200 bg-purple-50/50"
              >
                {toolsAccessed.length === 0 ? (
                  <p className="text-xs text-govuk-mid-grey py-2">
                    The agent hasn&apos;t accessed your personal data in this
                    conversation yet.
                  </p>
                ) : (
                  toolsAccessed.map((record, i) => (
                    <div
                      key={i}
                      className="py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-govuk-black">
                          {record.tool === "get_citizen_context"
                            ? "Viewed your profile"
                            : "Checked eligibility"}
                        </span>
                        <span className="text-[10px] text-govuk-mid-grey">
                          {record.durationMs}ms
                        </span>
                      </div>
                      {record.output && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(record.output).map(([key, val]) => (
                            <span
                              key={key}
                              className="inline-flex text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700"
                            >
                              {key}:{" "}
                              {typeof val === "object"
                                ? JSON.stringify(val)
                                : String(val)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </DataSection>

              {/* Data sharing notice */}
              <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 px-3.5 py-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-yellow-300 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-yellow-800">
                      !
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-govuk-black">
                      Your data stays here
                    </h3>
                    <p className="text-[10px] text-govuk-dark-grey mt-0.5 leading-relaxed">
                      The agent only accesses data needed for your request. Your
                      personal information is not shared with services unless
                      you explicitly consent.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
