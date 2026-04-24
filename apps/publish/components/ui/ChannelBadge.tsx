const channelStyles: Record<string, { bg: string; text: string; label: string }> = {
  mcp: { bg: "bg-blue-50", text: "text-blue-700", label: "MCP" },
  forms: { bg: "bg-purple-50", text: "text-purple-700", label: "Forms" },
  openapi: { bg: "bg-orange-50", text: "text-orange-700", label: "OpenAPI" },
  catalogue: { bg: "bg-teal-50", text: "text-teal-700", label: "Catalogue" },
  notify: { bg: "bg-pink-50", text: "text-pink-700", label: "Notify" },
  html: { bg: "bg-gray-100", text: "text-gray-700", label: "HTML" },
};

export default function ChannelBadge({ channel }: { channel: string }) {
  const style = channelStyles[channel] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: channel,
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
