import { getServiceArtefactStore } from "@/lib/service-store-init";
import PageHeader from "@/components/ui/PageHeader";
import KPICard from "@/components/ui/KPICard";
import StatusBadge from "@/components/ui/StatusBadge";
import ChannelBadge from "@/components/ui/ChannelBadge";
import { CHANNELS } from "@/lib/channels";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const store = await getServiceArtefactStore();
  const services = await store.listServices();

  const fullServices = services.filter((s) => s.source === "full");
  const withPolicy = services.filter((s) => s.hasPolicy);
  const withStateModel = services.filter((s) => s.hasStateModel);
  const promoted = services.filter((s) => s.promoted);

  return (
    <div>
      <PageHeader
        title="Publish once"
        subtitle="Describe government services once, publish to every channel automatically."
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          value={services.length}
          label="Total services"
          sub="across all departments"
        />
        <KPICard
          value={fullServices.length}
          label="Fully described"
          sub="with policy + state model"
        />
        <KPICard
          value={CHANNELS.filter((c) => c.status === "operational").length}
          label="Active channels"
          sub={`of ${CHANNELS.length} total`}
        />
        <KPICard
          value={promoted.length}
          label="Promoted"
          sub="surfaced to citizens"
        />
      </div>

      {/* Two-column: channels + recent services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channels overview */}
        <div className="border border-publish-border rounded-xl bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Channels</h2>
          <div className="space-y-3">
            {CHANNELS.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium">{ch.name}</div>
                  <div className="text-xs text-gray-500">{ch.description}</div>
                </div>
                <StatusBadge status={ch.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent full services */}
        <div className="border border-publish-border rounded-xl bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recently described</h2>
            <a
              href="/services"
              className="text-sm text-govuk-blue hover:underline"
            >
              View all
            </a>
          </div>
          <div className="space-y-3">
            {fullServices.slice(0, 8).map((s) => (
              <a
                key={s.id}
                href={`/services/${s.id}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.department}</div>
                </div>
                <div className="flex items-center gap-2">
                  {s.hasPolicy && <ChannelBadge channel="mcp" />}
                </div>
              </a>
            ))}
            {fullServices.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">
                No fully described services yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
