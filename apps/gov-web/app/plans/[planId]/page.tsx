import { mergeConsentFields, type ServiceConsentFields } from "@als/schemas";
import {
  getPlanTemplateStore,
  getServiceArtefactStore,
} from "@/lib/service-store-init";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const planStore = await getPlanTemplateStore();
  const plan = await planStore.getPlan(planId);
  if (!plan) {
    return (
      <div className="govuk-grid-row">
        <div className="govuk-grid-column-two-thirds">
          <h1 className="govuk-heading-xl">Plan not found</h1>
          <a className="govuk-link" href="/">
            Back to search
          </a>
        </div>
      </div>
    );
  }

  const memberIds = [
    ...new Set([
      ...plan.entryServiceIds,
      ...plan.edges.flatMap((e) => [e.from, e.to]),
      ...(plan.membership.serviceIds ?? []),
    ]),
  ];

  const serviceStore = await getServiceArtefactStore();
  const members = [];
  const consentInput: ServiceConsentFields[] = [];
  for (const id of memberIds) {
    const svc = await serviceStore.getService(id);
    if (!svc) continue;
    members.push({ id: svc.id, name: svc.name, department: svc.department });
    const dataShared = (svc.consent?.grants ?? []).flatMap(
      (g) => g.data_shared ?? [],
    );
    consentInput.push({ serviceId: svc.id, dataShared });
  }

  // The collapse: total raw field requests across services vs the canonical set.
  const rawCount = consentInput.reduce((n, s) => n + s.dataShared.length, 0);
  const merged = mergeConsentFields(consentInput);
  const sharedFields = merged.fields.filter((f) => f.neededBy.length > 1);

  // Order the task list: entry services first, then the rest.
  const entrySet = new Set(plan.entryServiceIds);
  const ordered = [
    ...members.filter((m) => entrySet.has(m.id)),
    ...members.filter((m) => !entrySet.has(m.id)),
  ];

  return (
    <div className="govuk-grid-row">
      <div className="govuk-grid-column-two-thirds">
        <span className="govuk-caption-xl">Life-event plan</span>
        <h1 className="govuk-heading-xl">
          {plan.icon ? `${plan.icon} ` : ""}
          {plan.name}
        </h1>
        <p className="govuk-body-l">{plan.description}</p>

        {rawCount > 0 && (
          <div className="govuk-inset-text">
            Separately, these {members.length} services would ask for{" "}
            <strong>{rawCount}</strong> pieces of information. As one plan, the
            shared details collapse to <strong>{merged.fields.length}</strong>{" "}
            — asked once and reused.
          </div>
        )}

        <h2 className="govuk-heading-l">What this plan covers</h2>
        <ul className="govuk-task-list">
          {ordered.map((m) => (
            <li key={m.id} className="govuk-task-list__item govuk-task-list__item--with-link">
              <div className="govuk-task-list__name-and-hint">
                <a
                  className="govuk-link govuk-task-list__link"
                  href={`/services/${encodeURIComponent(m.id)}`}
                >
                  {m.name}
                </a>
                <div className="govuk-task-list__hint">{m.department}</div>
              </div>
              <div className="govuk-task-list__status">
                {entrySet.has(m.id) ? "Start here" : "When ready"}
              </div>
            </li>
          ))}
        </ul>

        {sharedFields.length > 0 && (
          <>
            <h2 className="govuk-heading-l">Details you’ll be asked once</h2>
            <p className="govuk-body">
              Provided once and reused across the services that need them:
            </p>
            <dl className="govuk-summary-list">
              {sharedFields.map((f) => (
                <div className="govuk-summary-list__row" key={f.canonicalKey}>
                  <dt className="govuk-summary-list__key">{f.humanLabel}</dt>
                  <dd className="govuk-summary-list__value">
                    Used by {f.neededBy.length} services
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </div>
  );
}
