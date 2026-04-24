import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { CHANNELS } from "@/lib/channels";

export default function ChannelsPage() {
  return (
    <div>
      <PageHeader
        title="Channels"
        subtitle="Output targets for published service descriptions."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CHANNELS.map((ch) => (
          <div
            key={ch.id}
            className="border border-publish-border rounded-xl bg-white p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{ch.name}</h2>
              <StatusBadge status={ch.status} />
            </div>
            <p className="text-sm text-gray-600 mb-4">{ch.description}</p>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Artefacts used
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {ch.artefactsUsed.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
