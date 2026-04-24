import PageHeader from "@/components/ui/PageHeader";

export default function ActivityPage() {
  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle="Change log and audit trail for all service publications."
      />

      <div className="border border-publish-border rounded-xl bg-white p-12 text-center">
        <p className="text-gray-400 text-sm">
          Activity logging will appear here once services are published.
        </p>
        <p className="text-gray-300 text-xs mt-2">
          Every create, edit, publish, and withdrawal will be recorded.
        </p>
      </div>
    </div>
  );
}
