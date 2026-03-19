"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppStore, getTasks, saveTasks } from "@/lib/store";
import type {
  ServicePlanStatus,
  ServiceType,
  LifeEventService,
  StoredTask,
} from "@/lib/types";
import { computeServiceHints } from "@/lib/plan-hints";
import { DocumentUploadCard } from "@/components/cards/DocumentUploadCard";
import { PlanServiceCard } from "./plan/PlanServiceCard";
import type { PlanServiceStatus } from "./plan/PlanServiceCard";
import { agentActionForService } from "./plan/agentActions";

/** Determine whether a service can be handled by an AI agent on the citizen's behalf */
function isAgentLed(svc: LifeEventService): boolean {
  const agentTypes = new Set([
    "benefit",
    "entitlement",
    "grant",
    "application",
    "tax",
    "payment",
    "licence",
    "license",
  ]);
  return agentTypes.has(svc.serviceType) || svc.proactivity?.mode === "suggest";
}

/** Map ServicePlanStatus to PlanServiceCard status */
function toPlanCardStatus(status: ServicePlanStatus): PlanServiceStatus {
  return status as PlanServiceStatus;
}

export function PlanView() {
  const activePlan = useAppStore((s) => s.activePlan);
  const personaData = useAppStore((s) => s.personaData);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const loadConversation = useAppStore((s) => s.loadConversation);
  const startServiceFromPlan = useAppStore((s) => s.startServiceFromPlan);
  const markServiceSkipped = useAppStore((s) => s.markServiceSkipped);
  const completeServiceWithUpload = useAppStore(
    (s) => s.completeServiceWithUpload,
  );

  const agent = useAppStore((s) => s.agent);
  const persona = useAppStore((s) => s.persona);
  const agentName = agent === "max" ? "Max" : "Dot";

  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(
    null,
  );
  const [uploadingServiceId, setUploadingServiceId] = useState<string | null>(
    null,
  );
  const [delegated, setDelegated] = useState<Record<string, boolean>>({});

  const handleDelegate = useCallback(
    (svc: LifeEventService) => {
      if (!persona || delegated[svc.id]) return;
      setDelegated((prev) => ({ ...prev, [svc.id]: true }));
      const existing = getTasks(persona);
      if (existing.some((t) => t.id === `plan-${svc.id}`)) return;
      const now = new Date().toISOString();
      const task: StoredTask = {
        id: `plan-${svc.id}`,
        conversationId: "plan",
        service: svc.serviceType,
        description: svc.name,
        detail: svc.desc,
        type: "agent",
        status: "accepted",
        dueDate: null,
        dataNeeded: [],
        createdAt: now,
        updatedAt: now,
      };
      existing.unshift(task);
      saveTasks(persona, existing);
    },
    [persona, delegated],
  );

  if (!activePlan) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <p className="text-govuk-dark-grey">No active plan found.</p>
        <button
          onClick={() => navigateTo("dashboard")}
          className="mt-4 text-govuk-blue underline text-sm"
        >
          Return to dashboard
        </button>
      </div>
    );
  }

  const { plan, services, serviceProgress, skipReasons } = activePlan;
  const svcLookup = new Map(services.map((s) => [s.id, s]));

  const serviceHints = useMemo(
    () => computeServiceHints(services, personaData),
    [services, personaData],
  );

  // Compute progress
  const total = services.length;
  const completedCount = Object.values(serviceProgress).filter(
    (s) => s === "completed" || s === "skipped",
  ).length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // Track numbering across groups
  let globalIndex = 0;

  function handleServiceClick(serviceId: string, status: ServicePlanStatus) {
    const svc = svcLookup.get(serviceId);
    if (!svc) return;

    const autoSkipped = status === "skipped" && !!skipReasons?.[serviceId];
    if (status === "available" || autoSkipped) {
      setExpandedServiceId((prev) => (prev === serviceId ? null : serviceId));
      return;
    } else if (status === "in_progress") {
      const convId = activePlan?.serviceConversations[serviceId];
      if (convId) {
        loadConversation(convId);
        navigateTo("chat", svc.id as ServiceType, svc.name);
      }
    }
  }

  function handleStartService(serviceId: string) {
    const svc = svcLookup.get(serviceId);
    if (!svc) return;
    setExpandedServiceId(null);
    startServiceFromPlan(svc.id, svc.name);
  }

  function handleSkipService(serviceId: string) {
    setExpandedServiceId(null);
    markServiceSkipped(serviceId);
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Plan header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{activePlan.lifeEventIcon}</span>
          <div>
            <h2 className="text-2xl font-bold text-govuk-black">
              {activePlan.lifeEventName}
            </h2>
            <p className="text-sm text-govuk-dark-grey">
              {completedCount} of {total} service{total !== 1 ? "s" : ""}{" "}
              complete
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-govuk-green rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-govuk-dark-grey mt-1 text-right">{pct}%</p>
      </div>

      {/* Grouped services */}
      <div className="flex flex-col">
        {plan.groups.map((group, gi) => (
          <div key={gi}>
            {/* Connector arrow between groups */}
            {gi > 0 && (
              <div className="flex justify-center py-2">
                <svg
                  width="16"
                  height="24"
                  viewBox="0 0 16 24"
                  fill="none"
                  className="text-govuk-mid-grey"
                >
                  <path
                    d="M8 0v20M4 16l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}

            {/* Group label */}
            <div className="mb-3">
              <p
                className={`text-xs font-bold uppercase tracking-wide ${
                  group.depth === 0 ? "text-green-700" : "text-govuk-dark-grey"
                }`}
              >
                {group.depth === 0 ? "Start here" : group.label}
              </p>
            </div>

            {/* Service cards */}
            <div className="bg-white rounded-card shadow-sm overflow-hidden mb-2">
              {group.serviceIds.map((svcId) => {
                const svc = svcLookup.get(svcId);
                if (!svc) return null;
                globalIndex++;
                const status = serviceProgress[svcId] || "locked";
                const autoSkipped =
                  status === "skipped" && !!skipReasons?.[svcId];
                const clickable =
                  status === "available" ||
                  status === "in_progress" ||
                  autoSkipped;
                const agentLed = isAgentLed(svc);
                const isExpanded = expandedServiceId === svcId;

                return (
                  <PlanServiceCard
                    key={svcId}
                    number={globalIndex}
                    name={svc.name}
                    description={svc.desc}
                    status={toPlanCardStatus(status)}
                    agentAction={agentActionForService(svc)}
                    actionIcon={svc.proactivity?.iconHint}
                    timeframe={agentLed ? "Agent task" : undefined}
                    variant="full"
                    onTap={
                      clickable
                        ? () => handleServiceClick(svcId, status)
                        : undefined
                    }
                  >
                    {/* Auto-skipped reason panel */}
                    {isExpanded && autoSkipped && (
                      <div className="shadow-sm bg-amber-50/50 p-4 space-y-3">
                        <div className="flex items-start gap-2 p-3 bg-white border border-amber-200 rounded-lg">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#b45309"
                            strokeWidth="2"
                            className="shrink-0 mt-0.5"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                          </svg>
                          <span className="text-sm text-amber-800 leading-relaxed">
                            {skipReasons?.[svcId]}
                          </span>
                        </div>
                        <p className="text-xs text-govuk-dark-grey">
                          This was automatically skipped based on your personal
                          data. If this isn&apos;t right, you can still start
                          it.
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={() => handleStartService(svcId)}
                            className="flex-1 py-2.5 rounded-full bg-white border border-gray-300 text-govuk-black text-sm font-bold hover:bg-gray-50 transition-colors touch-feedback"
                          >
                            Start anyway
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline service brief */}
                    {isExpanded &&
                      status === "available" &&
                      (() => {
                        const hint = serviceHints[svcId];
                        return (
                          <div className="bg-blue-50/50 p-4 space-y-3">
                            {hint ? (
                              <>
                                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#1d70b8"
                                    strokeWidth="2"
                                    className="shrink-0 mt-0.5"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4M12 8h.01" />
                                  </svg>
                                  <span className="text-sm text-blue-800 leading-relaxed">
                                    {hint.message}
                                  </span>
                                </div>

                                {uploadingServiceId === svcId ? (
                                  <DocumentUploadCard
                                    definition={{
                                      cardType: "document-upload",
                                      title: hint.uploadLabel,
                                      description: `Upload your document for ${svc.name}`,
                                      fields: [],
                                      dataCategory: "documents",
                                    }}
                                    serviceId={svcId}
                                    stateId={`${svcId}-upload`}
                                    onSubmit={(fields) => {
                                      setUploadingServiceId(null);
                                      setExpandedServiceId(null);
                                      completeServiceWithUpload(svcId, fields);
                                    }}
                                  />
                                ) : (
                                  <div className="flex flex-col gap-2 pt-1">
                                    <button
                                      onClick={() =>
                                        setUploadingServiceId(svcId)
                                      }
                                      className="w-full py-2.5 rounded-full bg-govuk-green text-white text-sm font-bold hover:bg-govuk-green/90 transition-colors touch-feedback"
                                    >
                                      {hint.uploadLabel}
                                    </button>
                                    <button
                                      onClick={() => handleStartService(svcId)}
                                      className="w-full py-2.5 rounded-full bg-white border border-gray-300 text-govuk-black text-sm font-bold hover:bg-gray-50 transition-colors touch-feedback"
                                    >
                                      {hint.chatLabel}
                                    </button>
                                    <button
                                      onClick={() => handleSkipService(svcId)}
                                      className="text-sm text-govuk-dark-grey underline hover:text-govuk-black transition-colors mt-1"
                                    >
                                      Skip
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-govuk-black leading-relaxed">
                                  {svc.desc}
                                </p>

                                {svc.eligibility_summary && (
                                  <div className="bg-white rounded-lg p-3 border border-green-200">
                                    <p className="text-xs font-bold text-govuk-dark-grey uppercase tracking-wide mb-1">
                                      Eligibility
                                    </p>
                                    <p className="text-sm text-govuk-black">
                                      {svc.eligibility_summary}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 text-xs text-govuk-dark-grey">
                                  <span className="font-medium">
                                    {svc.dept}
                                  </span>
                                  <span>&middot;</span>
                                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                                    {svc.serviceType}
                                  </span>
                                </div>

                                {svc.govuk_url && (
                                  <a
                                    href={svc.govuk_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors no-underline"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      className="shrink-0"
                                    >
                                      <circle
                                        cx="12"
                                        cy="12"
                                        r="11"
                                        stroke="#1d70b8"
                                        strokeWidth="1.5"
                                      />
                                      <path
                                        d="M8 12l2.5 2.5L16 9"
                                        stroke="#1d70b8"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                    <span className="text-[11px] font-medium text-govuk-black">
                                      GOV.UK
                                    </span>
                                    <span className="text-[11px] text-govuk-dark-grey truncate max-w-[140px]">
                                      {svc.name.toLowerCase()}
                                    </span>
                                  </a>
                                )}

                                <div className="flex items-center gap-3 pt-1">
                                  {agentLed ? (
                                    delegated[svcId] ? (
                                      <span className="flex-1 py-2.5 rounded-full bg-govuk-green text-white text-sm font-bold text-center inline-flex items-center justify-center gap-1.5">
                                        <svg
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="3"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Delegated to {agentName}
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleDelegate(svc)}
                                        className="flex-1 py-2.5 rounded-full bg-govuk-blue text-white text-sm font-bold transition-colors touch-feedback"
                                      >
                                        Delegate to {agentName}
                                      </button>
                                    )
                                  ) : (
                                    <button
                                      onClick={() => handleStartService(svcId)}
                                      className="flex-1 py-2.5 rounded-full bg-govuk-green text-white text-sm font-bold hover:bg-govuk-green/90 transition-colors touch-feedback"
                                    >
                                      Start this service
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleSkipService(svcId)}
                                    className="text-sm text-govuk-dark-grey underline hover:text-govuk-black transition-colors"
                                  >
                                    Skip
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                  </PlanServiceCard>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Return to dashboard */}
      <div className="mt-8 mb-6">
        <button
          onClick={() => navigateTo("dashboard")}
          className="w-full py-3 rounded-full bg-gray-100 text-sm font-bold text-govuk-dark-grey hover:bg-gray-200 transition-colors touch-feedback"
        >
          Return to dashboard
        </button>
      </div>
    </div>
  );
}
