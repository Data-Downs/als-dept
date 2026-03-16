"use client";

import { useState } from "react";
import type { PersonaData, TimelineItem } from "@/lib/types";

const DEMO_TODAY = new Date("2026-02-15");

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
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}

function getUrgency(days: number): TimelineItem["urgency"] {
  if (days < 0) return "urgent";
  if (days < 14) return "urgent";
  if (days < 30) return "warning";
  return "ok";
}

export function buildTimelineItems(personaData: PersonaData): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Vehicle dates
  if (personaData.vehicles) {
    for (const v of personaData.vehicles) {
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
        service: "parenting",
        source: "data",
        dueDate: personaData.pregnancy.dueDate,
      });
    }
  }

  items.sort((a, b) => a.daysUntil - b.daysUntil);
  return items;
}

const URGENCY_COLORS: Record<string, string> = {
  urgent: "bg-govuk-red",
  warning: "bg-govuk-orange",
  ok: "bg-govuk-green",
  info: "bg-govuk-blue",
};

interface UnifiedTimelineProps {
  personaData: PersonaData;
  dismissedItems: Set<string>;
  onDismiss: (itemId: string) => void;
  onSeeAll?: () => void;
}

export function UnifiedTimeline({
  personaData,
  dismissedItems,
  onDismiss,
  onSeeAll,
}: UnifiedTimelineProps) {
  const items = buildTimelineItems(personaData).filter(
    (item) => !dismissedItems.has(item.id),
  );

  if (items.length === 0) return null;

  const displayItems = items.slice(0, 6);

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-extrabold text-govuk-black">To do</h3>
        {items.length > 6 && onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm text-govuk-blue font-medium"
          >
            See all ({items.length})
          </button>
        )}
      </div>
      <div className="bg-white rounded-card shadow-sm divide-y divide-gray-100 overflow-hidden">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3.5 text-left hover:bg-gray-50 transition-colors"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${URGENCY_COLORS[item.urgency]}`}
            />
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-govuk-black truncate">
                {item.title}
              </span>
              <span className="text-xs text-govuk-dark-grey capitalize">
                {item.service}
              </span>
            </div>
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
            <button
              onClick={() => onDismiss(item.id)}
              className="text-govuk-mid-grey hover:text-govuk-dark-grey shrink-0"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
