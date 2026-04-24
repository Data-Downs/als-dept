import { getServiceArtefactStore } from "@/lib/service-store-init";
import PageHeader from "@/components/ui/PageHeader";
import ChannelBadge from "@/components/ui/ChannelBadge";

export const dynamic = "force-dynamic";

export default async function ChannelPreviewPage({
  params,
}: {
  params: Promise<{ serviceId: string; channel: string }>;
}) {
  const { serviceId, channel } = await params;
  const store = await getServiceArtefactStore();
  const service = await store.getService(serviceId);

  if (!service) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-2">Service not found</h1>
      </div>
    );
  }

  // For now, show the raw artefact data that would feed the generator
  let previewContent: string;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3107"}/api/preview/${channel}?serviceId=${serviceId}`
    );
    if (res.ok) {
      previewContent = await res.text();
    } else {
      previewContent = `Generator for "${channel}" channel not yet implemented.`;
    }
  } catch {
    previewContent = `Preview unavailable — generator for "${channel}" not yet connected.`;
  }

  return (
    <div>
      <PageHeader
        title={`Preview: ${service.name || serviceId}`}
        subtitle={`Output for the ${channel} channel`}
        actions={
          <div className="flex items-center gap-3">
            <ChannelBadge channel={channel} />
            <a
              href={`/services/${serviceId}`}
              className="text-sm text-govuk-blue hover:underline"
            >
              Back to service
            </a>
          </div>
        }
      />

      <div className="border border-publish-border rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-publish-border flex items-center justify-between">
          <span className="text-sm font-medium">Generated output</span>
          <ChannelBadge channel={channel} />
        </div>
        <pre className="p-6 text-sm font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
          {previewContent}
        </pre>
      </div>
    </div>
  );
}
