"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";

export default function EditServicePage() {
  const params = useParams();
  const serviceId = params.serviceId as string;
  const [service, setService] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState("manifest");

  useEffect(() => {
    fetch(`/api/services/${serviceId}`)
      .then((r) => r.json())
      .then(setService);
  }, [serviceId]);

  if (!service) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const tabs = [
    { id: "manifest", label: "Manifest" },
    { id: "policy", label: "Policy" },
    { id: "state-model", label: "State model" },
    { id: "consent", label: "Consent" },
    { id: "cards", label: "Card definitions" },
  ];

  const artefactMap: Record<string, unknown> = {
    manifest: service.manifest || null,
    policy: service.policy || null,
    "state-model": service.stateModel || null,
    consent: service.consent || null,
    cards: service.cardDefinitions || null,
  };

  const currentArtefact = artefactMap[activeTab];

  return (
    <div>
      <PageHeader
        title={`Edit: ${(service.name as string) || serviceId}`}
        subtitle="Modify service artefacts. Changes create a new draft version."
        actions={
          <a
            href={`/services/${serviceId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-publish-border text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to service
          </a>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-publish-border">
        {tabs.map((tab) => {
          const hasData = !!artefactMap[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-govuk-blue text-govuk-blue"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${hasData ? "bg-govuk-green" : "bg-gray-200"}`}
                />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Artefact content */}
      <div className="border border-publish-border rounded-xl bg-white overflow-hidden">
        {currentArtefact ? (
          <pre className="p-6 text-sm font-mono text-gray-700 overflow-x-auto">
            {JSON.stringify(currentArtefact, null, 2)}
          </pre>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">
              No {activeTab} artefact defined yet.
            </p>
            <p className="text-gray-300 text-xs mt-2">
              This artefact can be generated from GOV.UK content or authored
              manually.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
