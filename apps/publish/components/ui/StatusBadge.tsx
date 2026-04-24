const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  review: "bg-yellow-50 text-yellow-700",
  published: "bg-green-50 text-green-700",
  archived: "bg-red-50 text-red-600",
  active: "bg-green-50 text-green-700",
  superseded: "bg-gray-100 text-gray-500",
  withdrawn: "bg-red-50 text-red-600",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}
