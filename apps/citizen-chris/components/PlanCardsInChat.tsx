"use client";

import { useState, useCallback, useRef } from "react";
import { useAppStore, getTasks, saveTasks } from "@/lib/store";
import type { StoredTask } from "@/lib/types";

interface PlanItem {
  id: string;
  number: number;
  name: string;
  description: string;
  agentAction: string;
  timeframe: string;
  timeframeIcon: "calendar" | "clock" | "baby";
  actionIcon: "clipboard" | "search" | "send" | "map" | "heart";
  service: string;
}

const PLAN_ITEMS: PlanItem[] = [
  {
    id: "plan-maternity-allowance",
    number: 1,
    name: "Maternity Allowance",
    description: "Financial support during maternity leave",
    agentAction: "Research this with Wilmslow Primary School",
    timeframe: "Apply from 26 weeks pregnant",
    timeframeIcon: "calendar",
    actionIcon: "search",
    service: "benefits",
  },
  {
    id: "plan-sure-start-grant",
    number: 2,
    name: "Sure Start Maternity Grant",
    description: "A one-off £500 payment if eligible",
    agentAction: "Check your eligibility and apply",
    timeframe: "Apply from 29 weeks pregnant",
    timeframeIcon: "calendar",
    actionIcon: "clipboard",
    service: "benefits",
  },
  {
    id: "plan-child-benefit-new",
    number: 3,
    name: "Child Benefit",
    description: "Claim for your new baby (already receiving for Casper)",
    agentAction: "Submit the claim for you",
    timeframe: "Claim as soon as baby is born",
    timeframeIcon: "baby",
    actionIcon: "send",
    service: "benefits",
  },
  {
    id: "plan-free-prescriptions",
    number: 4,
    name: "Free prescriptions",
    description: "Automatic during pregnancy and 12 months after",
    agentAction: "Apply for your exemption certificate",
    timeframe: "Apply now — valid until 12 months after birth",
    timeframeIcon: "clock",
    actionIcon: "clipboard",
    service: "health",
  },
  {
    id: "plan-healthy-start",
    number: 5,
    name: "Healthy Start vouchers",
    description: "Help with milk, fruit and vitamins",
    agentAction: "Check eligibility and apply",
    timeframe: "Apply from 10 weeks pregnant",
    timeframeIcon: "calendar",
    actionIcon: "clipboard",
    service: "health",
  },
  {
    id: "plan-register-birth",
    number: 6,
    name: "Register the birth",
    description: "Must be done within 42 days",
    agentAction: "Find your nearest register office and book",
    timeframe: "Within 42 days of birth",
    timeframeIcon: "calendar",
    actionIcon: "map",
    service: "family",
  },
  {
    id: "plan-gp-registration",
    number: 7,
    name: "GP registration",
    description: "Register the baby with your GP",
    agentAction: "Register with your current GP surgery",
    timeframe: "As soon as possible after birth",
    timeframeIcon: "baby",
    actionIcon: "heart",
    service: "health",
  },
];

// ── Inline SVG icons ──

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function BabyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function DelegateIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

const TIMEFRAME_ICONS: Record<string, () => JSX.Element> = {
  calendar: CalendarIcon,
  clock: ClockIcon,
  baby: BabyIcon,
};

const ACTION_ICONS: Record<string, () => JSX.Element> = {
  clipboard: ClipboardIcon,
  search: SearchIcon,
  send: SendIcon,
  map: MapIcon,
  heart: HeartIcon,
};

function getAgentDisplayName(agent: string): string {
  return agent === "max" ? "Max" : "Dot";
}

export function PlanCardsInChat() {
  const agent = useAppStore((s) => s.agent);
  const persona = useAppStore((s) => s.persona);
  const agentName = getAgentDisplayName(agent);

  const [delegated, setDelegated] = useState<Record<string, boolean>>({});
  const [delegatingAll, setDelegatingAll] = useState(false);
  const [interstitial, setInterstitial] = useState<string | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const isAllDelegated = PLAN_ITEMS.every((item) => delegated[item.id]);

  const createTaskForItem = useCallback(
    (item: PlanItem) => {
      if (!persona) return;
      const existing = getTasks(persona);
      if (existing.some((t) => t.id === item.id)) return;
      const now = new Date().toISOString();
      const task: StoredTask = {
        id: item.id,
        conversationId: "demo",
        service: item.service,
        description: item.name,
        detail: item.description,
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
    (itemId: string) => {
      if (delegated[itemId]) return;
      setDelegated((prev) => ({ ...prev, [itemId]: true }));
      const item = PLAN_ITEMS.find((i) => i.id === itemId);
      if (item) createTaskForItem(item);
    },
    [delegated, createTaskForItem],
  );

  const handleDelegateAll = useCallback(() => {
    if (delegatingAll || isAllDelegated) return;
    setDelegatingAll(true);

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    PLAN_ITEMS.forEach((item, idx) => {
      const t = setTimeout(() => {
        setDelegated((prev) => ({ ...prev, [item.id]: true }));
        createTaskForItem(item);
      }, idx * 120);
      timeoutsRef.current.push(t);
    });

    const allDoneDelay = PLAN_ITEMS.length * 120 + 200;
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
  }, [delegatingAll, isAllDelegated, createTaskForItem]);

  return (
    <div className="mt-3">
      <div className="bg-white rounded-card shadow-sm overflow-hidden">
        {PLAN_ITEMS.map((item) => {
          const isDelegated = !!delegated[item.id];
          const TimeframeIconCmp = TIMEFRAME_ICONS[item.timeframeIcon];
          const ActionIconCmp = ACTION_ICONS[item.actionIcon];

          return (
            <div
              key={item.id}
              className={`border-b border-gray-100 transition-colors duration-300 ${
                isDelegated ? "bg-blue-50/40" : "bg-white"
              }`}
            >
              {/* Main content area */}
              <div className="px-4 pt-3.5 pb-2">
                <div className="flex items-start gap-3">
                  {/* Blue number circle */}
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold transition-colors duration-300 ${
                    isDelegated
                      ? "bg-govuk-green text-white"
                      : "bg-govuk-blue text-white"
                  }`}>
                    {isDelegated ? (
                      <CheckIcon />
                    ) : (
                      item.number
                    )}
                  </span>

                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-govuk-black leading-tight">
                      {item.name}
                    </p>
                    <p className="text-sm blue-ripple-text font-medium mt-0.5 leading-snug">
                      {item.description}
                    </p>

                    {/* Divider */}
                    <div className="border-t border-gray-100 mt-2 mb-1.5" />

                    {/* Agent action + timeframe — smaller type with icons */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-govuk-dark-grey">
                        <span className="text-govuk-blue opacity-70"><ActionIconCmp /></span>
                        <span>{agentName} can {item.agentAction.toLowerCase()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-govuk-dark-grey">
                        <span className="text-govuk-blue opacity-70"><TimeframeIconCmp /></span>
                        <span>{item.timeframe}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action toolbar */}
              <div className="flex items-center gap-1 px-4 pb-3 pl-14">
                {isDelegated ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-govuk-green">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Delegated to {agentName}
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => handleDelegate(item.id)}
                      disabled={delegatingAll}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-govuk-blue bg-blue-50 transition-all duration-200 touch-feedback"
                    >
                      <DelegateIcon />
                      Delegate
                    </button>
                    <button className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-govuk-dark-grey transition-all duration-200 touch-feedback">
                      <InfoIcon />
                      Details
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Delegate all — the entire row is the button */}
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
