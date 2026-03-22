"use client";

import { useAppStore } from "@/lib/store";
import { WalletCredentialCard } from "./wallet/WalletCredentialCard";
import { ConsentPreferenceCard } from "./wallet/ConsentPreferenceCard";

export function WalletView() {
  const walletCredentials = useAppStore((s) => s.walletCredentials);
  const earnedCredentials = useAppStore((s) => s.earnedCredentials);
  const consentPreferences = useAppStore((s) => s.consentPreferences);
  const personaData = useAppStore((s) => s.personaData);

  const personaName = personaData?.name ?? "";
  const totalCount = walletCredentials.length + earnedCredentials.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-govuk-text">Your wallet</h1>
        <p className="text-sm text-govuk-dark-grey mt-0.5">
          {totalCount} {totalCount === 1 ? "document" : "documents"}
          {consentPreferences.length > 0 &&
            ` · ${consentPreferences.length} ${consentPreferences.length === 1 ? "permission" : "permissions"}`}
        </p>
      </div>

      {/* Identity documents */}
      {walletCredentials.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wide text-govuk-dark-grey mb-3">
            Your documents
          </h2>
          <div className="space-y-3">
            {walletCredentials.map((cred, i) => (
              <WalletCredentialCard
                key={`wallet-${cred.type}-${i}`}
                credential={cred}
                personaName={personaName}
              />
            ))}
          </div>
        </section>
      )}

      {/* Earned credentials from completed services */}
      {earnedCredentials.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wide text-govuk-dark-grey mb-3">
            Issued to you
          </h2>
          <div className="space-y-3">
            {earnedCredentials.map((cred, i) => (
              <WalletCredentialCard
                key={`earned-${cred.type}-${i}`}
                credential={cred}
                personaName={personaName}
                isEarned
                department={cred.issuer}
              />
            ))}
          </div>
        </section>
      )}

      {/* Data permissions */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide text-govuk-dark-grey mb-3">
          Data permissions
        </h2>
        {consentPreferences.length > 0 ? (
          <div className="space-y-3">
            {consentPreferences.map((pref) => (
              <ConsentPreferenceCard key={pref.id} preference={pref} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-govuk-mid-grey bg-white px-5 py-6 text-center">
            <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#912b88"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p className="text-sm text-govuk-dark-grey">
              When you give departments standing permission to access your data,
              it will appear here.
            </p>
          </div>
        )}
      </section>

      {/* Empty state */}
      {totalCount === 0 && consentPreferences.length === 0 && (
        <div className="rounded-2xl bg-white shadow-sm px-5 py-8 text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-govuk-light-grey flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#505a5f"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <p className="text-sm font-medium text-govuk-text">
            No documents yet
          </p>
          <p className="text-xs text-govuk-dark-grey mt-1">
            Your verified credentials and service documents will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
