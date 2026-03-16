"use client";

import { useAppStore } from "@/lib/store";
import type { ServicePlanStatus } from "@/lib/types";

const STATUS_STYLES: Record<
  ServicePlanStatus,
  { bg: string; text: string; label: string }
> = {
  locked: { bg: "bg-gray-100", text: "text-gray-400", label: "Locked" },
  available: { bg: "bg-blue-50", text: "text-govuk-blue", label: "Available" },
  in_progress: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    label: "In progress",
  },
  completed: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
  skipped: { bg: "bg-gray-50", text: "text-gray-500", label: "Skipped" },
};

export function PlanView() {
  const activePlans = useAppStore((s) => s.activePlans);
  const currentPlanId = useAppStore((s) => s.currentPlanId);
  const navigateBack = useAppStore((s) => s.navigateBack);
  const markServiceStatus = useAppStore((s) => s.markServiceStatus);
  const startNewConversation = useAppStore((s) => s.startNewConversation);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const plan = activePlans.find((p) => p.id === currentPlanId);

  if (!plan) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-govuk-blue text-white px-4 py-3 pt-14 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={navigateBack}
              className="p-1 -ml-1 rounded hover:bg-white/10 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M12 4l-6 6 6 6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h1 className="text-sm font-semibold">Plan</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <p className="text-govuk-mid-grey text-sm">No plan selected.</p>
        </main>
      </div>
    );
  }

  const completedCount = Object.values(plan.serviceProgress).filter(
    (s) => s === "completed",
  ).length;
  const totalCount = plan.services.length;

  return (
    <div className="flex flex-col h-full">
      <header className="bg-govuk-blue text-white px-4 py-3 pt-14 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={navigateBack}
            className="p-1 -ml-1 rounded hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12 4l-6 6 6 6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-semibold">
              {plan.lifeEventIcon} {plan.lifeEventName}
            </h1>
            <p className="text-[10px] text-blue-200">
              {completedCount}/{totalCount} services completed
            </p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{
              width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 pb-20 space-y-3">
        {plan.groups.length > 0 ? (
          plan.groups.map((group, gi) => (
            <div key={gi}>
              <h3 className="text-xs font-semibold text-govuk-dark-grey uppercase tracking-wider mb-2">
                {group.label}
              </h3>
              <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                {group.serviceIds.map((svcId) => {
                  const svc = plan.services.find((s) => s.id === svcId);
                  if (!svc) return null;
                  const status = plan.serviceProgress[svcId] || "available";
                  const style = STATUS_STYLES[status];

                  return (
                    <div key={svcId} className={`p-3.5 ${style.bg}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-govuk-black">
                            {svc.name}
                          </span>
                          <span className="text-xs text-govuk-dark-grey">
                            {svc.dept}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${style.text} ${style.bg} border border-current/20`}
                        >
                          {style.label}
                        </span>
                      </div>
                      {status === "available" && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              markServiceStatus(plan.id, svcId, "in_progress");
                              startNewConversation(svcId, svc.name);
                              navigateTo("chat", svcId, svc.name);
                            }}
                            className="text-xs font-bold text-white px-3 py-1.5 rounded-full bg-govuk-blue"
                          >
                            Start
                          </button>
                          <button
                            onClick={() =>
                              markServiceStatus(plan.id, svcId, "skipped")
                            }
                            className="text-xs font-medium text-govuk-dark-grey px-3 py-1.5 rounded-full border border-gray-300"
                          >
                            Skip
                          </button>
                        </div>
                      )}
                      {status === "in_progress" && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() =>
                              markServiceStatus(plan.id, svcId, "completed")
                            }
                            className="text-xs font-bold text-white px-3 py-1.5 rounded-full bg-green-600"
                          >
                            Mark complete
                          </button>
                          <button
                            onClick={() => {
                              startNewConversation(svcId, svc.name);
                              navigateTo("chat", svcId, svc.name);
                            }}
                            className="text-xs font-medium text-govuk-blue px-3 py-1.5 rounded-full border border-govuk-blue"
                          >
                            Continue
                          </button>
                        </div>
                      )}
                      {status === "skipped" && (
                        <button
                          onClick={() =>
                            markServiceStatus(plan.id, svcId, "available")
                          }
                          className="text-xs text-govuk-blue underline mt-1"
                        >
                          Undo skip
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          /* Flat list when no groups */
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
            {plan.services.map((svc) => {
              const status = plan.serviceProgress[svc.id] || "available";
              const style = STATUS_STYLES[status];

              return (
                <div key={svc.id} className={`p-3.5 ${style.bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-govuk-black">
                        {svc.name}
                      </span>
                      <span className="text-xs text-govuk-dark-grey">
                        {svc.dept}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${style.text}`}
                    >
                      {style.label}
                    </span>
                  </div>
                  {status === "available" && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          markServiceStatus(plan.id, svc.id, "in_progress");
                          startNewConversation(svc.id, svc.name);
                          navigateTo("chat", svc.id, svc.name);
                        }}
                        className="text-xs font-bold text-white px-3 py-1.5 rounded-full bg-govuk-blue"
                      >
                        Start
                      </button>
                      <button
                        onClick={() =>
                          markServiceStatus(plan.id, svc.id, "skipped")
                        }
                        className="text-xs font-medium text-govuk-dark-grey px-3 py-1.5 rounded-full border border-gray-300"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                  {status === "in_progress" && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() =>
                          markServiceStatus(plan.id, svc.id, "completed")
                        }
                        className="text-xs font-bold text-white px-3 py-1.5 rounded-full bg-green-600"
                      >
                        Mark complete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
