"use client";

import type { WalletCredential } from "@als/identity/src/credential-types";
import { useAppStore } from "@/lib/store";

/** Department → accent colour mapping */
const CREDENTIAL_COLOURS: Record<string, { accent: string; bg: string }> = {
  "driving-licence": { accent: "#c8366b", bg: "#fdf2f6" },
  "national-insurance": { accent: "#008770", bg: "#f0faf8" },
  "proof-of-address": { accent: "#505a5f", bg: "#f8f8f8" },
  passport: { accent: "#1d3557", bg: "#f0f3f7" },
};

const ISSUER_LABELS: Record<string, string> = {
  DVLA: "Driver & Vehicle Licensing Agency",
  HMRC: "HM Revenue & Customs",
  "Royal Mail": "Royal Mail",
  "GOV.UK One Login": "GOV.UK One Login",
  "HM Passport Office": "HM Passport Office",
};

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

function StatusChip({ status }: { status: WalletCredential["status"] }) {
  const styles = {
    valid: "bg-emerald-100 text-emerald-800",
    expired: "bg-amber-100 text-amber-800",
    revoked: "bg-red-100 text-red-800",
    suspended: "bg-orange-100 text-orange-800",
  };

  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function formatExpiry(expires?: string): string | null {
  if (!expires) return null;
  const exp = new Date(expires);
  const now = new Date();
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Expired";
  if (diffDays < 30) return `Expires in ${diffDays} days`;
  const diffMonths = Math.ceil(diffDays / 30);
  if (diffMonths < 12) return `Expires in ${diffMonths} months`;
  const diffYears = Math.floor(diffDays / 365);
  return `Expires in ${diffYears} ${diffYears === 1 ? "year" : "years"}`;
}

interface WalletCredentialCardProps {
  credential: WalletCredential;
  personaName?: string;
  isEarned?: boolean;
  department?: string;
}

export function WalletCredentialCard({
  credential,
  personaName,
  isEarned,
  department,
}: WalletCredentialCardProps) {
  const openBottomSheet = useAppStore((s) => s.openBottomSheet);
  const currentService = useAppStore((s) => s.currentService);

  const colours = CREDENTIAL_COLOURS[credential.type] || {
    accent: "#1d70b8",
    bg: "#f0f5fa",
  };

  const expiryLabel = formatExpiry(credential.expires);
  const isExpired = credential.status === "expired";

  // Check if this credential is currently being renewed
  const isRenewing =
    currentService &&
    typeof currentService === "string" &&
    currentService.includes("renew") &&
    currentService.includes(
      credential.type.replace("-", "").replace("licence", "licen"),
    );

  return (
    <button
      type="button"
      onClick={() =>
        openBottomSheet("wallet-credential", {
          credential,
          personaName,
          isEarned,
          department,
        })
      }
      className="w-full text-left"
    >
      <div
        className="rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md"
        style={{ backgroundColor: colours.bg }}
      >
        {/* Coloured accent top bar */}
        <div className="h-1.5" style={{ backgroundColor: colours.accent }} />

        <div className="px-4 py-3">
          {/* Top row: type + status */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <CredentialIcon type={credential.type} colour={colours.accent} />
              <span className="text-xs font-bold uppercase tracking-wide text-govuk-dark-grey">
                {getTypeLabel(credential.type)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isRenewing && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Renewing
                </span>
              )}
              <StatusChip status={credential.status} />
            </div>
          </div>

          {/* Credential number */}
          {credential.number && (
            <p
              className="text-base font-mono font-semibold tracking-wider mt-1"
              style={{ color: colours.accent }}
            >
              {credential.number}
            </p>
          )}

          {/* Bottom row: issuer + expiry */}
          <div className="flex items-center justify-between mt-2 text-[11px] text-govuk-dark-grey">
            <span>
              {ISSUER_LABELS[credential.issuer] || credential.issuer}
            </span>
            {expiryLabel && (
              <span className={isExpired ? "text-amber-700 font-medium" : ""}>
                {expiryLabel}
              </span>
            )}
          </div>

          {/* Earned badge */}
          {isEarned && department && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-govuk-blue font-medium">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Issued by {department}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function CredentialIcon({
  type,
  colour,
}: {
  type: string;
  colour: string;
}) {
  switch (type) {
    case "driving-licence":
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colour}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="1" y="3" width="22" height="18" rx="3" />
          <circle cx="8" cy="11" r="3" />
          <path d="M15 9h4M15 13h4" />
        </svg>
      );
    case "national-insurance":
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colour}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "passport":
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colour}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <circle cx="12" cy="10" r="3" />
          <path d="M8 18h8" />
        </svg>
      );
    default:
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colour}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
  }
}
