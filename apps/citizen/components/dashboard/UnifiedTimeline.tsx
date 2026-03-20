"use client";

import { useState } from "react";
import type { PersonaData, TimelineItem, StoredTask } from "@/lib/types";
import { DEMO_TODAY } from "@/lib/types";
import { getTasks, getDismissedItems, useAppStore } from "@/lib/store";
import { UrgencyDot } from "../ui/UrgencyDot";
import { SwipeToDelete } from "../ui/SwipeToDelete";
import { formatWithPlates } from "../ui/RegPlate";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const diff = target.getTime() - DEMO_TODAY.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDueLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `${days} days`;
  const w = Math.floor(days / 7);
  if (days < 30) return `${w} week${w !== 1 ? "s" : ""}`;
  const m = Math.floor(days / 30);
  return `${m} month${m !== 1 ? "s" : ""}`;
}

function getUrgency(days: number): TimelineItem["urgency"] {
  if (days < 0) return "urgent";
  if (days < 14) return "urgent";
  if (days < 30) return "warning";
  return "ok";
}

// ── Grouping ──

interface ItemGroup {
  key: string;
  label: string;
  items: TimelineItem[];
  earliestDue: number;
  mostUrgent: TimelineItem["urgency"];
  dueLabel: string;
}

function groupTimelineItems(
  items: TimelineItem[],
  personaData: PersonaData,
): ItemGroup[] {
  const vehicles = (personaData.vehicles || []).map((v) => ({
    key: `${v.make}-${v.model}`.toLowerCase().replace(/\s+/g, "-"),
    label: `${v.make} ${v.model}`,
    reg: v.registrationNumber,
  }));

  const groupMap = new Map<string, TimelineItem[]>();
  const groupLabels = new Map<string, string>();

  for (const item of items) {
    const text = `${item.title} ${item.detail || ""} ${item.subtitle || ""}`;
    let matched = false;

    for (const v of vehicles) {
      if (
        text.toLowerCase().includes(v.label.toLowerCase()) ||
        text.includes(v.reg)
      ) {
        if (!groupMap.has(v.key)) {
          groupMap.set(v.key, []);
          groupLabels.set(v.key, v.label);
        }
        groupMap.get(v.key)!.push(item);
        matched = true;
        break;
      }
    }

    if (!matched) {
      groupMap.set(item.id, [item]);
      groupLabels.set(item.id, item.title);
    }
  }

  const groups: ItemGroup[] = [];
  for (const [key, groupItems] of groupMap) {
    groupItems.sort((a, b) => a.daysUntil - b.daysUntil);
    const earliest = groupItems[0];
    groups.push({
      key,
      label: groupLabels.get(key)!,
      items: groupItems,
      earliestDue: earliest.daysUntil,
      mostUrgent: earliest.urgency,
      dueLabel: earliest.dueLabel,
    });
  }

  groups.sort((a, b) => a.earliestDue - b.earliestDue);
  return groups;
}

// ── Build timeline items with deduplication ──

export function buildTimelineItems(
  personaData: PersonaData,
  persona: string | null,
  filterService?: string,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Collect stored tasks first (to deduplicate vehicle data items)
  const storedTasks: StoredTask[] = persona ? getTasks(persona) : [];
  const activeTaskTexts = storedTasks
    .filter((t) => t.status !== "dismissed" && t.status !== "completed")
    .map((t) => `${t.description} ${t.detail}`.toLowerCase());

  // Vehicle dates — skip if a stored task already covers this vehicle
  if (personaData.vehicles) {
    for (const v of personaData.vehicles) {
      const vehicleName = `${v.make} ${v.model}`.toLowerCase();
      const hasCoveringTask = activeTaskTexts.some(
        (text) =>
          text.includes(vehicleName) || text.includes(v.registrationNumber),
      );

      if (!hasCoveringTask) {
        if (v.motExpiry) {
          const days = daysUntil(v.motExpiry);
          if (days > -30 && days < 180) {
            items.push({
              id: `mot-${v.registrationNumber}`,
              title: `MOT due — ${v.make} ${v.model}`,
              subtitle: v.registrationNumber,
              daysUntil: days,
              dueLabel: formatDueLabel(days),
              urgency: getUrgency(days),
              service: "driving",
              source: "data",
              dueDate: v.motExpiry,
            });
          }
        }
        if (v.taxExpiry) {
          const days = daysUntil(v.taxExpiry);
          if (days > -30 && days < 180) {
            items.push({
              id: `tax-${v.registrationNumber}`,
              title: `Road tax due — ${v.make} ${v.model}`,
              daysUntil: days,
              dueLabel: formatDueLabel(days),
              urgency: getUrgency(days),
              service: "driving",
              source: "data",
              dueDate: v.taxExpiry,
            });
          }
        }
      }
    }
  }

  // Pregnancy
  if (personaData.pregnancy?.dueDate) {
    const days = daysUntil(personaData.pregnancy.dueDate);
    if (days > 0) {
      items.push({
        id: "baby-due",
        title: "Baby due date",
        subtitle: personaData.pregnancy.hospital,
        daysUntil: days,
        dueLabel: formatDueLabel(days),
        urgency: days < 60 ? "warning" : "ok",
        service: "family",
        source: "data",
        dueDate: personaData.pregnancy.dueDate,
      });
    }
  }

  // Agent/user tasks from localStorage
  for (const task of storedTasks) {
    if (task.status === "dismissed" || task.status === "completed") continue;
    const days = task.dueDate ? daysUntil(task.dueDate) : 999;
    items.push({
      id: `task-${task.id}`,
      title: task.description,
      detail: task.detail,
      daysUntil: days,
      dueLabel: task.dueDate ? formatDueLabel(days) : "",
      urgency: task.dueDate ? getUrgency(days) : "info",
      service: task.service,
      source: task.type === "agent" ? "agent" : "user",
      taskStatus: task.status,
      taskType: task.type,
      dueDate: task.dueDate || undefined,
    });
  }

  // Sort by urgency (most urgent first)
  items.sort((a, b) => a.daysUntil - b.daysUntil);

  // Filter by service if provided
  if (filterService) {
    return items.filter((item) => item.service === filterService);
  }

  return items;
}

// ── Component ──

interface UnifiedTimelineProps {
  personaData: PersonaData;
  persona: string | null;
  maxItems?: number;
  filterService?: string;
  onItemTap?: (item: TimelineItem) => void;
  onDismiss?: (itemId: string) => void;
  onSeeAll?: () => void;
}

export function UnifiedTimeline({
  personaData,
  persona,
  maxItems = 4,
  filterService,
  onItemTap,
  onDismiss,
  onSeeAll,
}: UnifiedTimelineProps) {
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Subscribe to taskVersion so we re-render when tasks are saved (e.g. delegation)
  useAppStore((s) => s.taskVersion);
  // In manual mode, treat all items as the user's own
  // NOTE: this hook must be called before any early returns to avoid
  // React "fewer hooks" errors when item count changes between renders.
  const isManualMode = useAppStore((s) => s.agent) === "none";
  const dismissed = persona
    ? new Set([...getDismissedItems(persona), ...localDismissed])
    : localDismissed;
  const items = buildTimelineItems(personaData, persona, filterService).filter(
    (item) => !dismissed.has(item.id),
  );

  if (items.length === 0) return null;

  const handleDismiss = (itemId: string) => {
    setLocalDismissed((prev) => new Set([...prev, itemId]));
    onDismiss?.(itemId);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Split into user/data vs agent items
  const yourItems = isManualMode
    ? items
    : items.filter(
        (item) => item.source !== "agent" && item.taskType !== "agent",
      );
  const agentItems = isManualMode
    ? []
    : items.filter(
        (item) => item.source === "agent" || item.taskType === "agent",
      );

  // Group items by object (e.g. vehicle)
  const yourGroups = groupTimelineItems(yourItems, personaData);
  const agentGroups = groupTimelineItems(agentItems, personaData);

  // Limit display
  const displayYourGroups = yourGroups.slice(0, maxItems);
  const displayAgentGroups = agentGroups.slice(0, maxItems);

  const renderGroupedItem = (item: TimelineItem) => (
    <button
      key={item.id}
      onClick={() => onItemTap?.(item)}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors hover:bg-gray-50 touch-feedback"
    >
      <UrgencyDot urgency={item.urgency} size="sm" />
      <span className="flex-1 text-sm text-govuk-black truncate">
        {formatWithPlates(item.title)}
      </span>
      {item.dueLabel && (
        <span
          className={`text-xs font-bold shrink-0 ${
            item.urgency === "urgent"
              ? "text-govuk-red"
              : item.urgency === "warning"
                ? "text-govuk-orange"
                : "text-govuk-dark-grey"
          }`}
        >
          {item.dueLabel}
        </span>
      )}
    </button>
  );

  const renderGroup = (group: ItemGroup) => {
    const isMulti = group.items.length > 1;
    const isExpanded = expandedGroups.has(group.key);

    if (!isMulti) {
      // Single item — render directly
      const item = group.items[0];
      return (
        <SwipeToDelete
          key={group.key}
          onDelete={() => handleDismiss(item.id)}
          label={item.taskType === "agent" ? "Stop" : "Delete"}
        >
          <button
            onClick={() => onItemTap?.(item)}
            className="flex items-center gap-2.5 w-full px-3 py-3.5 text-left transition-colors bg-white hover:bg-gray-50 touch-feedback"
          >
            <UrgencyDot urgency={item.urgency} size="md" />
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-govuk-black truncate leading-tight">
                {formatWithPlates(item.title)}
              </span>
            </div>
            {item.dueLabel && (
              <span
                className={`text-xs font-bold shrink-0 ${
                  item.urgency === "urgent"
                    ? "text-govuk-red"
                    : item.urgency === "warning"
                      ? "text-govuk-orange"
                      : "text-govuk-dark-grey"
                }`}
              >
                {item.dueLabel}
              </span>
            )}
            <svg
              className="shrink-0 text-govuk-mid-grey"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </SwipeToDelete>
      );
    }

    // Multi-item group — accordion
    const dueSummary = buildDueSummary(group.items);

    return (
      <div key={group.key}>
        <button
          onClick={() => toggleGroup(group.key)}
          className="flex items-center gap-2.5 w-full px-3 py-3.5 text-left transition-colors bg-white hover:bg-gray-50 touch-feedback"
        >
          <UrgencyDot urgency={group.mostUrgent} size="md" />
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-govuk-black leading-tight">
              {group.label}
            </span>
            <span className="text-[11px] text-govuk-dark-grey">
              {group.items.length} task{group.items.length !== 1 ? "s" : ""}
              {dueSummary ? ` · ${dueSummary}` : ""}
            </span>
          </div>
          <span
            className={`text-xs font-bold shrink-0 ${
              group.mostUrgent === "urgent"
                ? "text-govuk-red"
                : group.mostUrgent === "warning"
                  ? "text-govuk-orange"
                  : "text-govuk-dark-grey"
            }`}
          >
            {group.dueLabel}
          </span>
          <svg
            className={`shrink-0 text-govuk-mid-grey transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        {isExpanded && (
          <div className="bg-gray-50 border-t border-gray-100">
            {group.items.map(renderGroupedItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-5">
      {/* Your to-dos */}
      {displayYourGroups.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-extrabold text-govuk-black">
              Your to-dos
            </h3>
            {yourGroups.length > maxItems && onSeeAll && (
              <button
                onClick={onSeeAll}
                className="text-sm text-govuk-blue font-medium"
              >
                See all ({yourItems.length})
              </button>
            )}
          </div>
          <div className="bg-white rounded-card shadow-sm divide-y divide-gray-100 overflow-hidden mb-4">
            {displayYourGroups.map(renderGroup)}
          </div>
        </>
      )}

      {/* Agent to-dos */}
      {displayAgentGroups.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-extrabold blue-ripple-text">
              Agent to-dos
            </h3>
            {agentGroups.length > maxItems && onSeeAll && (
              <button
                onClick={onSeeAll}
                className="text-sm text-govuk-blue font-medium"
              >
                See all ({agentItems.length})
              </button>
            )}
          </div>
          <div className="bg-white rounded-card shadow-sm divide-y divide-gray-100 overflow-hidden mb-4">
            {displayAgentGroups.map(renderGroup)}
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers ──

function buildDueSummary(items: TimelineItem[]): string {
  const withDue = items.filter((i) => i.dueLabel);
  if (withDue.length === 0) return "";
  if (withDue.length === 1) return `due in ${withDue[0].dueLabel}`;

  // Group by rough time bucket
  const soon = withDue.filter((i) => i.daysUntil < 30);
  const later = withDue.filter((i) => i.daysUntil >= 30);

  const parts: string[] = [];
  if (soon.length > 0) {
    parts.push(`${soon.length} due soon`);
  }
  if (later.length > 0) {
    const latest = later[later.length - 1];
    parts.push(`${later.length} in ${latest.dueLabel}`);
  }
  return parts.join(", ");
}
