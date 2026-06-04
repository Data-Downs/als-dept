import { serviceToMarkdown } from "@als/schemas";
import { getServiceArtefactStore } from "@/lib/service-store-init";
import { Markdown } from "@/components/Markdown";
import { resolveServiceCards } from "@/lib/cards";

export const dynamic = "force-dynamic";

export default async function ServicePage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const store = await getServiceArtefactStore();
  const service = await store.getService(serviceId);

  if (!service) {
    return (
      <div className="govuk-grid-row">
        <div className="govuk-grid-column-two-thirds">
          <h1 className="govuk-heading-xl">Service not found</h1>
          <a className="govuk-link" href="/">
            Back to search
          </a>
        </div>
      </div>
    );
  }

  const markdown = serviceToMarkdown({
    manifest: service.manifest,
    policy: service.policy,
    stateModel: service.stateModel,
    consent: service.consent,
  });
  const hasForm = resolveServiceCards(service).length > 0;

  return (
    <div className="govuk-grid-row">
      <div className="govuk-grid-column-two-thirds">
        <span className="govuk-caption-xl">{service.department}</span>
        <h1 className="govuk-heading-xl">{service.name}</h1>

        {hasForm && (
          <a
            href={`/services/${encodeURIComponent(serviceId)}/start?step=0`}
            role="button"
            draggable="false"
            className="govuk-button govuk-button--start govuk-!-margin-bottom-7"
            data-module="govuk-button"
          >
            Start now
            <svg
              className="govuk-button__start-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="17.5"
              height="19"
              viewBox="0 0 33 40"
              role="presentation"
              focusable="false"
            >
              <path fill="currentColor" d="M0 0h13l20 20-20 20H0l20-20z" />
            </svg>
          </a>
        )}

        <hr className="govuk-section-break govuk-section-break--visible govuk-section-break--l" />
        <Markdown>{markdown}</Markdown>
      </div>
    </div>
  );
}
