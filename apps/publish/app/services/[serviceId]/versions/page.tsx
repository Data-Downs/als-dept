import PageHeader from "@/components/ui/PageHeader";

export default function VersionsPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  return (
    <div>
      <PageHeader
        title="Version history"
        subtitle="Immutable snapshots of this service's artefacts."
      />

      <div className="border border-publish-border rounded-xl bg-white p-12 text-center">
        <p className="text-gray-400 text-sm">
          Version history will appear here once the versioning system is active.
        </p>
        <p className="text-gray-300 text-xs mt-2">
          Each publish creates an immutable version. Versions are never edited,
          only superseded.
        </p>
      </div>
    </div>
  );
}
