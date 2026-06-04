import { getServiceArtefactStore } from "@/lib/service-store-init";
import { resolveServiceCards } from "@/lib/cards";
import { GovukField } from "@/components/GovukField";

export const dynamic = "force-dynamic";

export default async function ServiceStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { serviceId } = await params;
  const { step } = await searchParams;
  const store = await getServiceArtefactStore();
  const service = await store.getService(serviceId);
  if (!service) {
    return (
      <div className="govuk-grid-row">
        <div className="govuk-grid-column-two-thirds">
          <h1 className="govuk-heading-xl">Service not found</h1>
        </div>
      </div>
    );
  }

  const cards = resolveServiceCards(service);
  const stepIndex = Math.max(0, Math.min(Number(step ?? 0) || 0, cards.length));
  const base = `/services/${encodeURIComponent(serviceId)}`;

  // Confirmation page (past the last card)
  if (cards.length === 0 || stepIndex >= cards.length) {
    return (
      <div className="govuk-grid-row">
        <div className="govuk-grid-column-two-thirds">
          <div className="govuk-panel govuk-panel--confirmation">
            <h1 className="govuk-panel__title">Application complete</h1>
            <div className="govuk-panel__body">{service.name}</div>
          </div>
          <p className="govuk-body">
            In the live service this is where the deterministic policy engine
            evaluates eligibility and issues a receipt.
          </p>
          <a className="govuk-link" href={base}>
            Back to the service
          </a>
        </div>
      </div>
    );
  }

  const card = cards[stepIndex];
  const next = stepIndex + 1;

  return (
    <div className="govuk-grid-row">
      <div className="govuk-grid-column-two-thirds">
        <a
          href={stepIndex === 0 ? base : `${base}/start?step=${stepIndex - 1}`}
          className="govuk-back-link"
        >
          Back
        </a>

        <form method="get" action={`${base}/start`}>
          <input type="hidden" name="step" value={next} />
          <span className="govuk-caption-l">{service.name}</span>
          <h1 className="govuk-heading-l">{card.title}</h1>
          {card.description && <p className="govuk-body">{card.description}</p>}

          {card.fields.map((field) => (
            <GovukField key={field.key} field={field} />
          ))}

          <button className="govuk-button" type="submit" data-module="govuk-button">
            {card.submitLabel || "Continue"}
          </button>
        </form>

        <p className="govuk-body-s govuk-!-margin-top-4">
          Step {stepIndex + 1} of {cards.length}
        </p>
      </div>
    </div>
  );
}
