import {
  getServiceArtefactStore,
  getPlanTemplateStore,
} from "@/lib/service-store-init";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q || "").trim().toLowerCase();

  const [serviceStore, planStore] = await Promise.all([
    getServiceArtefactStore(),
    getPlanTemplateStore(),
  ]);
  const [allServices, plans] = await Promise.all([
    serviceStore.listServices(),
    planStore.listPlans({ published: true }),
  ]);

  const matchedPlans = query
    ? plans.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query),
      )
    : plans;

  // Without a query, show the curated (full-artefact) services rather than all 1,600+.
  const services = query
    ? allServices
        .filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            (s.description || "").toLowerCase().includes(query),
        )
        .slice(0, 50)
    : allServices.filter((s) => s.source === "full").slice(0, 12);

  return (
    <div className="govuk-grid-row">
      <div className="govuk-grid-column-two-thirds">
        <h1 className="govuk-heading-xl">Find a government service</h1>
        <p className="govuk-body-l">
          Search for a service, or describe a life event to find a plan that
          spans several services.
        </p>

        <form method="get" className="govuk-form-group">
          <label className="govuk-label" htmlFor="q">
            Search
          </label>
          <div className="govuk-input__wrapper">
            <input
              className="govuk-input"
              id="q"
              name="q"
              type="search"
              defaultValue={q || ""}
              placeholder="e.g. renew driving licence, or my husband died"
            />
          </div>
          <button className="govuk-button govuk-!-margin-top-2" type="submit">
            Search
          </button>
        </form>

        {matchedPlans.length > 0 && (
          <>
            <h2 className="govuk-heading-l">Life-event plans</h2>
            <p className="govuk-body">
              These weave several services together and ask for shared details
              once.
            </p>
            <ul className="govuk-list">
              {matchedPlans.map((p) => (
                <li key={p.id} className="govuk-!-margin-bottom-3">
                  <a className="govuk-link govuk-!-font-size-24" href={`/plans/${encodeURIComponent(p.id)}`}>
                    {p.icon ? `${p.icon} ` : ""}
                    {p.name}
                  </a>
                  <p className="govuk-body govuk-!-margin-bottom-0">
                    {p.description}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="govuk-heading-l">
          {query ? "Services" : "Featured services"}
        </h2>
        {services.length === 0 ? (
          <p className="govuk-body">No services found for “{q}”.</p>
        ) : (
          <ul className="govuk-list">
            {services.map((s) => (
              <li key={s.id} className="govuk-!-margin-bottom-3">
                <a className="govuk-link govuk-!-font-size-24" href={`/services/${encodeURIComponent(s.id)}`}>
                  {s.name}
                </a>
                <p className="govuk-body govuk-!-margin-bottom-0">
                  <span className="govuk-!-font-weight-bold">{s.department}</span>
                  {s.description ? ` — ${s.description}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
