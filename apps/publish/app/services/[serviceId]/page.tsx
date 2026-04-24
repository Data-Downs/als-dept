import { getServiceArtefactStore } from "@/lib/service-store-init";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import ChannelBadge from "@/components/ui/ChannelBadge";
import { CHANNELS } from "@/lib/channels";

export const dynamic = "force-dynamic";

function ArtefactStatus({
  label,
  present,
  colour,
}: {
  label: string;
  present: boolean;
  colour: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${present ? colour : "bg-gray-200"}`}
      />
      <span className={`text-sm ${present ? "text-gray-900" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const store = await getServiceArtefactStore();
  const service = await store.getService(serviceId);

  if (!service) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-2">Service not found</h1>
        <p className="text-gray-500">{serviceId}</p>
      </div>
    );
  }

  const manifest = service.manifest || null;
  const hasPolicy = !!service.policy;
  const hasStateModel = !!service.stateModel;
  const hasConsent = !!service.consent;
  const hasCards = !!service.cardDefinitions;
  const gaps = store.analyzeGaps(service);
  const gapCount = gaps.filter((g) => g.status !== "present").length;

  return (
    <div>
      <PageHeader
        title={service.name || serviceId}
        subtitle={`${service.department || "Unknown department"} — ${serviceId}`}
        actions={
          <div className="flex gap-2">
            <a
              href={`/services/${serviceId}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-publish-border text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit artefacts
            </a>
            <a
              href={`/services/${serviceId}/publish`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-govuk-blue text-white text-sm font-medium rounded-lg hover:bg-govuk-dark-blue transition-colors"
            >
              Publish
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Artefact completeness */}
        <div className="border border-publish-border rounded-xl bg-white p-6">
          <h2 className="text-sm font-semibold mb-4">Artefact completeness</h2>
          <div className="space-y-3">
            <ArtefactStatus
              label="Manifest"
              present={!!manifest}
              colour="bg-govuk-blue"
            />
            <ArtefactStatus
              label="Policy ruleset"
              present={hasPolicy}
              colour="bg-govuk-green"
            />
            <ArtefactStatus
              label="State model"
              present={hasStateModel}
              colour="bg-purple-500"
            />
            <ArtefactStatus
              label="Consent model"
              present={hasConsent}
              colour="bg-orange-500"
            />
            <ArtefactStatus
              label="Card definitions"
              present={hasCards}
              colour="bg-gray-900"
            />
          </div>
          {gapCount > 0 && (
            <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
              {gapCount} gap{gapCount !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>

        {/* Channel readiness */}
        <div className="border border-publish-border rounded-xl bg-white p-6">
          <h2 className="text-sm font-semibold mb-4">Channel readiness</h2>
          <div className="space-y-3">
            {CHANNELS.map((ch) => {
              const ready = ch.artefactsUsed.every((a) => {
                if (a === "manifest") return !!manifest;
                if (a === "policy") return hasPolicy;
                if (a === "state-model") return hasStateModel;
                if (a === "consent") return hasConsent;
                if (a === "card-definitions") return hasCards;
                return false;
              });
              return (
                <div key={ch.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${ready ? "bg-govuk-green" : "bg-gray-200"}`}
                    />
                    <span className="text-sm">{ch.name}</span>
                  </div>
                  {ready ? (
                    <a
                      href={`/services/${serviceId}/preview/${ch.id}`}
                      className="text-xs text-govuk-blue hover:underline"
                    >
                      Preview
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">
                      Missing artefacts
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Service metadata */}
        <div className="border border-publish-border rounded-xl bg-white p-6">
          <h2 className="text-sm font-semibold mb-4">Metadata</h2>
          <dl className="space-y-3 text-sm">
            {manifest?.serviceType && (
              <div>
                <dt className="text-gray-500">Service type</dt>
                <dd className="font-medium">{manifest.serviceType}</dd>
              </div>
            )}
            {manifest?.jurisdiction && (
              <div>
                <dt className="text-gray-500">Jurisdiction</dt>
                <dd className="font-medium">{manifest.jurisdiction}</dd>
              </div>
            )}
            {service.interactionType && (
              <div>
                <dt className="text-gray-500">Interaction type</dt>
                <dd className="font-medium">{service.interactionType}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Source</dt>
              <dd>
                <StatusBadge status={service.source || "unknown"} />
              </dd>
            </div>
            {manifest?.govuk_url && (
              <div>
                <dt className="text-gray-500">GOV.UK page</dt>
                <dd>
                  <a
                    href={manifest.govuk_url}
                    className="text-govuk-blue hover:underline break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {manifest.govuk_url}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Gap analysis */}
      {gapCount > 0 && (
        <div className="mt-6 border border-publish-border rounded-xl bg-white p-6">
          <h2 className="text-sm font-semibold mb-4">Gap analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {gaps
              .filter((g) => g.status !== "present")
              .map((g) => (
                <div
                  key={`${g.artefact}-${g.field}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${g.status === "missing" ? "bg-govuk-red" : "bg-yellow-400"}`}
                  />
                  <span className="text-gray-600">
                    {g.artefact}: {g.field}
                  </span>
                  <StatusBadge status={g.status} />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
