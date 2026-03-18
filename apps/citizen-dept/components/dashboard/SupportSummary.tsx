"use client";

import { useAppStore } from "@/lib/store";
import { ANNA_SUPPORT } from "@/lib/demo-data";
import type { SupportItem } from "@/lib/demo-data";

function StatusBadge({ status }: { status: SupportItem["status"] }) {
  switch (status) {
    case "receiving":
      return (
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
          Receiving
        </span>
      );
    case "eligible":
      return (
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
          Eligible
        </span>
      );
    case "check":
      return (
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
          Check
        </span>
      );
  }
}

export function SupportSummary() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const startNewConversation = useAppStore((s) => s.startNewConversation);

  const receiving = ANNA_SUPPORT.filter((s) => s.status === "receiving");
  const eligible = ANNA_SUPPORT.filter(
    (s) => s.status === "eligible" || s.status === "check",
  );

  const handleAsk = (item: SupportItem) => {
    startNewConversation("benefits", item.name);
    navigateTo("chat", "benefits", item.name);
    // The scripted chat will pick up the topic
    setTimeout(() => {
      useAppStore.getState().sendMessage(`Tell me about ${item.name}`);
    }, 100);
  };

  return (
    <div className="mb-5">
      <h3 className="text-base font-extrabold text-govuk-black mb-2">
        Your support
      </h3>
      <p className="text-xs text-govuk-dark-grey mb-3">
        Based on your data, here's what you receive and what you may be eligible
        for.
      </p>

      <div className="bg-white rounded-card shadow-sm overflow-hidden divide-y divide-gray-100">
        {/* Currently receiving */}
        {receiving.map((item) => (
          <div key={item.id} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <strong className="text-sm text-govuk-black flex-1">
                {item.name}
              </strong>
              <StatusBadge status={item.status} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-govuk-green">
                {item.amount}
              </span>
              <span className="text-xs text-govuk-dark-grey">
                {item.frequency}
              </span>
            </div>
            <p className="text-xs text-govuk-dark-grey mt-0.5">
              {item.description}
            </p>
          </div>
        ))}

        {/* Divider */}
        {receiving.length > 0 && eligible.length > 0 && (
          <div className="px-4 py-2 bg-blue-50/50">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              You may also be eligible for
            </p>
          </div>
        )}

        {/* Eligible */}
        {eligible.map((item) => (
          <button
            key={item.id}
            onClick={() => handleAsk(item)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors touch-feedback"
          >
            <div className="flex items-center gap-2 mb-1">
              <strong className="text-sm text-govuk-black flex-1">
                {item.name}
              </strong>
              <StatusBadge status={item.status} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-govuk-blue">
                {item.amount}
              </span>
              <span className="text-xs text-govuk-dark-grey">
                {item.frequency}
              </span>
            </div>
            <p className="text-xs text-govuk-dark-grey mt-0.5">
              {item.description}
            </p>
            <span className="text-xs text-govuk-blue font-medium mt-1 inline-block">
              Find out more →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
