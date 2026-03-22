"use client";

import { useAppStore } from "@/lib/store";

/**
 * LifeEventProgressTracker — compact progress strip for multi-service
 * life event journeys, shown at the top of ChatView when lifeEventMode is active.
 *
 * Renders each service as a step dot with status colouring, matching the
 * visual language of StateProgressTracker but for cross-service journeys.
 */

type StepStatus = "completed" | "in_progress" | "available" | "locked" | "skipped";

function getStepStatus(
  serviceId: string,
  progress: Record<string, string>,
): StepStatus {
  const status = progress[serviceId];
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  if (status === "skipped") return "skipped";
  if (status === "available") return "available";
  return "locked";
}

function StepDot({ status, index }: { status: StepStatus; index: number }) {
  switch (status) {
    case "completed":
      return (
        <div className="w-6 h-6 rounded-full bg-govuk-green flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    case "in_progress":
      return (
        <div className="w-6 h-6 rounded-full bg-govuk-blue flex items-center justify-center shrink-0 ring-2 ring-blue-200 ring-offset-1">
          <span className="text-[9px] font-bold text-white">{index + 1}</span>
        </div>
      );
    case "available":
      return (
        <div className="w-6 h-6 rounded-full bg-govuk-blue flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-white">{index + 1}</span>
        </div>
      );
    case "skipped":
      return (
        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
      );
    default: // locked
      return (
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-gray-400">{index + 1}</span>
        </div>
      );
  }
}

function Connector({ completed }: { completed: boolean }) {
  return (
    <div
      className={`flex-1 h-0.5 min-w-2 ${completed ? "bg-govuk-green" : "bg-gray-200"}`}
    />
  );
}

export function LifeEventProgressTracker() {
  const activePlan = useAppStore((s) => s.activePlan);
  const lifeEventMode = useAppStore((s) => s.lifeEventMode);

  if (!lifeEventMode || !activePlan) return null;

  const progress = activePlan.serviceProgress;

  // Get services in plan order (by group depth, then position)
  const orderedServices: Array<{ id: string; name: string }> = [];
  if (activePlan.plan?.groups) {
    const sorted = [...activePlan.plan.groups].sort(
      (a, b) => (a.depth ?? 0) - (b.depth ?? 0),
    );
    for (const group of sorted) {
      for (const svcId of group.serviceIds) {
        const svc = activePlan.services.find((s) => s.id === svcId);
        if (svc && !orderedServices.some((o) => o.id === svc.id)) {
          orderedServices.push({ id: svc.id, name: svc.name });
        }
      }
    }
  }

  // Fallback: use services array if groups are empty
  if (orderedServices.length === 0) {
    for (const svc of activePlan.services) {
      orderedServices.push({ id: svc.id, name: svc.name });
    }
  }

  // Filter out skipped services for a cleaner display
  const visibleServices = orderedServices.filter(
    (s) => getStepStatus(s.id, progress) !== "skipped",
  );

  const completedCount = visibleServices.filter(
    (s) => getStepStatus(s.id, progress) === "completed",
  ).length;

  // Find current step (first non-completed, non-skipped)
  const currentStep = visibleServices.find((s) => {
    const status = getStepStatus(s.id, progress);
    return status === "in_progress" || status === "available";
  });

  return (
    <div className="bg-white shadow-sm border-b border-gray-100">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          {activePlan.lifeEventIcon && (
            <span className="text-sm">{activePlan.lifeEventIcon}</span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-govuk-dark-grey truncate">
            {activePlan.lifeEventName}
          </span>
        </div>
        <span className="text-[10px] font-medium text-govuk-blue shrink-0">
          {completedCount}/{visibleServices.length} done
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-0.5 px-4 pb-3">
        {visibleServices.map((svc, i) => {
          const status = getStepStatus(svc.id, progress);
          const isLast = i === visibleServices.length - 1;
          const prevCompleted =
            i > 0 &&
            getStepStatus(visibleServices[i - 1].id, progress) === "completed";

          return (
            <div key={svc.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <StepDot status={status} index={i} />
                <span
                  className={`text-[8px] leading-tight text-center max-w-12 truncate ${
                    status === "completed"
                      ? "text-govuk-green font-medium"
                      : status === "in_progress" || status === "available"
                        ? "text-govuk-blue font-medium"
                        : "text-gray-400"
                  }`}
                >
                  {svc.name.split(/\s+/).slice(0, 2).join(" ")}
                </span>
              </div>
              {!isLast && (
                <Connector
                  completed={status === "completed" && prevCompleted !== false}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step label */}
      {currentStep && (
        <div className="px-4 pb-2.5 -mt-0.5">
          <p className="text-[11px] text-govuk-dark-grey">
            Next: <span className="font-medium text-govuk-text">{currentStep.name}</span>
          </p>
        </div>
      )}
    </div>
  );
}
