"use client";

import { useState, useCallback, useRef } from "react";
import { useAppStore, getTasks, saveTasks } from "@/lib/store";
import type { StoredTask, LifeEventService } from "@/lib/types";
import { PlanServiceCard } from "./plan/PlanServiceCard";
import type { PlanServiceStatus } from "./plan/PlanServiceCard";
import { agentActionForService } from "./plan/agentActions";

function getAgentDisplayName(agent: string): string {
  return agent === "max" ? "Max" : "Dot";
}

export function PlanCardsInChat() {
  const agent = useAppStore((s) => s.agent);
  const persona = useAppStore((s) => s.persona);
  const lifeEvents = useAppStore((s) => s.lifeEvents);
  const agentName = getAgentDisplayName(agent);

  const [delegated, setDelegated] = useState<Record<string, boolean>>({});
  const [delegatingAll, setDelegatingAll] = useState(false);
  const [interstitial, setInterstitial] = useState<string | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Find the relevant life event — prefer "Having a Baby", fall back to first
  const lifeEvent =
    lifeEvents.find((le) => le.name === "Having a Baby") || lifeEvents[0];
  const services = lifeEvent?.services ?? [];

  // Sort by proactivity priority
  const sortedServices = [...services].sort(
    (a, b) => (a.proactivity?.priority ?? 50) - (b.proactivity?.priority ?? 50),
  );

  const isAllDelegated =
    sortedServices.length > 0 &&
    sortedServices.every((svc) => delegated[svc.id]);

  const createTaskForService = useCallback(
    (svc: LifeEventService) => {
      if (!persona) return;
      const existing = getTasks(persona);
      if (existing.some((t) => t.id === `plan-${svc.id}`)) return;
      const now = new Date().toISOString();
      const task: StoredTask = {
        id: `plan-${svc.id}`,
        conversationId: "demo",
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
    [persona],
  );

  const handleDelegate = useCallback(
    (svcId: string) => {
      if (delegated[svcId]) return;
      setDelegated((prev) => ({ ...prev, [svcId]: true }));
      const svc = sortedServices.find((s) => s.id === svcId);
      if (svc) createTaskForService(svc);
    },
    [delegated, sortedServices, createTaskForService],
  );

  const handleDelegateAll = useCallback(() => {
    if (delegatingAll || isAllDelegated) return;
    setDelegatingAll(true);

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    sortedServices.forEach((svc, idx) => {
      const t = setTimeout(() => {
        setDelegated((prev) => ({ ...prev, [svc.id]: true }));
        createTaskForService(svc);
      }, idx * 120);
      timeoutsRef.current.push(t);
    });

    const allDoneDelay = sortedServices.length * 120 + 200;
    const t1 = setTimeout(() => {
      setInterstitial("Creating task list...");
    }, allDoneDelay);
    timeoutsRef.current.push(t1);

    const t2 = setTimeout(() => {
      setInterstitial("Done");
    }, allDoneDelay + 1000);
    timeoutsRef.current.push(t2);

    const t3 = setTimeout(() => {
      setInterstitial(null);
      setDelegatingAll(false);
    }, allDoneDelay + 1500);
    timeoutsRef.current.push(t3);
  }, [delegatingAll, isAllDelegated, sortedServices, createTaskForService]);

  if (sortedServices.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="bg-white rounded-card shadow-sm overflow-hidden">
        {sortedServices.map((svc, idx) => {
          const isDelegated = !!delegated[svc.id];
          const status: PlanServiceStatus = isDelegated
            ? "delegated"
            : "available";

          return (
            <PlanServiceCard
              key={svc.id}
              number={idx + 1}
              name={svc.name}
              description={svc.desc}
              status={status}
              agentAction={agentActionForService(svc)}
              actionIcon={svc.proactivity?.iconHint}
              variant="compact"
              agentName={agentName}
              onDelegate={
                !isDelegated && !delegatingAll
                  ? () => handleDelegate(svc.id)
                  : undefined
              }
              onDetails={() => {}}
            />
          );
        })}

        {/* Delegate all */}
        {interstitial ? (
          <div className="bg-white py-4">
            <p className="text-sm font-bold text-govuk-blue animate-pulse text-center">
              {interstitial}
            </p>
          </div>
        ) : (
          <button
            onClick={handleDelegateAll}
            disabled={delegatingAll || isAllDelegated}
            className={`w-full py-3.5 text-sm font-bold transition-all duration-300 touch-feedback ${
              isAllDelegated
                ? "bg-govuk-green/10 text-govuk-green"
                : "bg-govuk-blue text-white"
            }`}
          >
            {isAllDelegated ? (
              <span className="inline-flex items-center gap-1.5">
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
                All delegated to {agentName}
              </span>
            ) : (
              `Delegate all to ${agentName}`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
