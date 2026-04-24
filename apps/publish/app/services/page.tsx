import { getServiceArtefactStore } from "@/lib/service-store-init";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const store = await getServiceArtefactStore();
  const services = await store.listServices();

  // Group by department
  const byDepartment = new Map<string, typeof services>();
  for (const s of services) {
    const dept = s.department || "Unknown";
    if (!byDepartment.has(dept)) byDepartment.set(dept, []);
    byDepartment.get(dept)!.push(s);
  }

  const departments = [...byDepartment.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle={`${services.length} services across ${departments.length} departments`}
        actions={
          <a
            href="/services/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-govuk-blue text-white text-sm font-medium rounded-lg hover:bg-govuk-dark-blue transition-colors"
          >
            New service
          </a>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-publish-border rounded-xl bg-white p-4">
          <div className="text-2xl font-light">
            {services.filter((s) => s.source === "full").length}
          </div>
          <div className="text-sm text-gray-500">fully described</div>
        </div>
        <div className="border border-publish-border rounded-xl bg-white p-4">
          <div className="text-2xl font-light">
            {services.filter((s) => s.source === "graph").length}
          </div>
          <div className="text-sm text-gray-500">from service graph</div>
        </div>
        <div className="border border-publish-border rounded-xl bg-white p-4">
          <div className="text-2xl font-light">
            {services.filter((s) => s.hasPolicy && s.hasStateModel).length}
          </div>
          <div className="text-sm text-gray-500">publish-ready</div>
        </div>
      </div>

      {/* Service list grouped by department */}
      <div className="space-y-6">
        {departments.map(([dept, deptServices]) => (
          <div
            key={dept}
            className="border border-publish-border rounded-xl bg-white overflow-hidden"
          >
            <div className="px-6 py-3 bg-gray-50 border-b border-publish-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">{dept}</h2>
              <span className="text-xs text-gray-500">
                {deptServices.length} service
                {deptServices.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {deptServices.map((s) => (
                <a
                  key={s.id}
                  href={`/services/${s.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {s.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {s.hasPolicy && (
                      <span className="w-2 h-2 rounded-full bg-govuk-green" title="Has policy" />
                    )}
                    {s.hasStateModel && (
                      <span className="w-2 h-2 rounded-full bg-govuk-blue" title="Has state model" />
                    )}
                    {s.hasConsent && (
                      <span className="w-2 h-2 rounded-full bg-purple-500" title="Has consent" />
                    )}
                    <StatusBadge status={s.source === "full" ? "published" : "draft"} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
