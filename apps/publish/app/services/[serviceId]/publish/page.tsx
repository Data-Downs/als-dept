"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import ChannelBadge from "@/components/ui/ChannelBadge";

const CHANNELS = [
  { id: "mcp", name: "AI agent (MCP)", status: "operational" },
  { id: "forms", name: "Web form (GOV.UK Forms)", status: "in-development" },
  { id: "openapi", name: "API (OpenAPI 3.0)", status: "in-development" },
  { id: "catalogue", name: "Service catalogue", status: "in-development" },
  { id: "notify", name: "Notifications", status: "planned" },
  { id: "html", name: "Accessible summary", status: "planned" },
];

export default function PublishPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.serviceId as string;
  const [selected, setSelected] = useState<Set<string>>(new Set(["mcp"]));
  const [publishing, setPublishing] = useState(false);
  const [service, setService] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    fetch(`/api/services/${serviceId}`)
      .then((r) => r.json())
      .then(setService);
  }, [serviceId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        channels: [...selected],
      }),
    });

    if (res.ok) {
      router.push(`/services/${serviceId}`);
    } else {
      setPublishing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={`Publish: ${service?.name || serviceId}`}
        subtitle="Select output channels and publish this service version."
      />

      <div className="max-w-2xl space-y-6">
        {/* Channel selection */}
        <div className="space-y-3">
          {CHANNELS.map((ch) => {
            const enabled = ch.status === "operational" || ch.status === "in-development";
            return (
              <label
                key={ch.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                  selected.has(ch.id)
                    ? "border-govuk-blue bg-blue-50"
                    : "border-publish-border bg-white"
                } ${!enabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(ch.id)}
                  onChange={() => enabled && toggle(ch.id)}
                  disabled={!enabled}
                  className="w-4 h-4 rounded border-gray-300 text-govuk-blue focus:ring-govuk-blue"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{ch.name}</div>
                </div>
                <ChannelBadge channel={ch.id} />
                {selected.has(ch.id) && enabled && (
                  <a
                    href={`/services/${serviceId}/preview/${ch.id}`}
                    className="text-xs text-govuk-blue hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Preview
                  </a>
                )}
              </label>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={selected.size === 0 || publishing}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-govuk-blue text-white text-sm font-medium rounded-lg hover:bg-govuk-dark-blue transition-colors disabled:opacity-50"
          >
            {publishing
              ? "Publishing..."
              : `Publish to ${selected.size} channel${selected.size !== 1 ? "s" : ""}`}
          </button>
          <a
            href={`/services/${serviceId}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-publish-border text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
