"use client";

import type { WalletCredential } from "@als/identity/src/credential-types";

const TYPE_LABELS: Record<string, string> = {
  "driving-licence": "Driving Licence",
  "national-insurance": "National Insurance Number",
  "proof-of-address": "Proof of Address",
  passport: "Passport",
  licence: "Licence",
};

function getTypeLabel(type: string): string {
  return (
    TYPE_LABELS[type] ||
    type
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function StatusBadge({ status }: { status: WalletCredential["status"] }) {
  const config = {
    valid: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      dot: "bg-emerald-500",
      label: "Valid",
    },
    expired: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      dot: "bg-amber-500",
      label: "Expired",
    },
    revoked: {
      bg: "bg-red-50",
      text: "text-red-800",
      dot: "bg-red-500",
      label: "Revoked",
    },
    suspended: {
      bg: "bg-orange-50",
      text: "text-orange-800",
      dot: "bg-orange-500",
      label: "Suspended",
    },
  };
  const c = config[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${c.bg}`}
    >
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span className={`text-xs font-bold ${c.text}`}>{c.label}</span>
    </div>
  );
}

interface WalletCredentialSheetProps {
  data: {
    credential: WalletCredential;
    personaName?: string;
    isEarned?: boolean;
    department?: string;
  };
}

export function WalletCredentialSheet({ data }: WalletCredentialSheetProps) {
  const { credential, personaName, isEarned, department } = data;

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-govuk-text">
          {getTypeLabel(credential.type)}
        </h3>
        <StatusBadge status={credential.status} />
      </div>

      {/* Credential number */}
      {credential.number && (
        <div className="bg-govuk-light-grey rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-govuk-dark-grey mb-1">
            {credential.type === "national-insurance"
              ? "NI Number"
              : "Reference"}
          </p>
          <p className="text-lg font-mono font-semibold text-govuk-text tracking-wider">
            {credential.number}
          </p>
        </div>
      )}

      {/* Details */}
      <div className="space-y-3">
        {personaName && (
          <DetailRow label="Holder" value={personaName} />
        )}
        <DetailRow label="Issued by" value={credential.issuer} />
        {credential.issued && (
          <DetailRow label="Issued" value={formatDate(credential.issued)} />
        )}
        {credential.expires && (
          <DetailRow label="Expires" value={formatDate(credential.expires)} />
        )}
      </div>

      {/* Claims */}
      {credential.claims && Object.keys(credential.claims).length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-govuk-dark-grey mb-2">
            Verified claims
          </p>
          <div className="bg-govuk-light-grey rounded-xl px-4 py-3 space-y-2">
            {Object.entries(credential.claims).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-govuk-dark-grey capitalize">
                  {key.replace(/_/g, " ")}
                </span>
                <span className="text-govuk-text font-medium">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earned credential info */}
      {isEarned && department && (
        <div className="flex items-center gap-2 text-xs text-govuk-blue bg-blue-50 rounded-xl px-4 py-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>
            Issued by <strong>{department}</strong> on completion of your
            service
          </span>
        </div>
      )}

      {/* Expired credential hint */}
      {credential.status === "expired" && (
        <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 rounded-xl px-4 py-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            This credential has expired. You may need to renew it to use
            services that require it.
          </span>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-govuk-dark-grey">{label}</span>
      <span className="text-sm font-medium text-govuk-text">{value}</span>
    </div>
  );
}
