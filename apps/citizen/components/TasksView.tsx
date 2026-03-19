"use client";

import { useState } from "react";
import { useAppStore, getTasks, saveTasks } from "@/lib/store";
import type { StoredTask, PersonaData } from "@/lib/types";
import { UrgencyDot } from "./ui/UrgencyDot";
import { SwipeToAction } from "./ui/SwipeToAction";
import { formatWithPlates } from "./ui/RegPlate";
import { DEMO_TODAY } from "@/lib/types";

type FilterTab = "all" | "driving" | "benefits" | "family";

const FILTERS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "driving", label: "Driving" },
  { id: "benefits", label: "Benefits" },
  { id: "family", label: "Family" },
];

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

function getUrgency(days: number): "urgent" | "warning" | "ok" {
  if (days < 14) return "urgent";
  if (days < 30) return "warning";
  return "ok";
}

// ── Task grouping ──

interface TaskGroup {
  key: string;
  label: string;
  tasks: StoredTask[];
  earliestDue: number;
  mostUrgent: "urgent" | "warning" | "ok" | "info";
  dueLabel: string;
}

function groupTasks(
  tasks: StoredTask[],
  personaData: PersonaData | null,
): TaskGroup[] {
  const vehicles = (personaData?.vehicles || []).map((v) => ({
    key: `${v.make}-${v.model}`.toLowerCase().replace(/\s+/g, "-"),
    label: `${v.make} ${v.model}`,
    reg: v.registrationNumber,
  }));

  const groupMap = new Map<string, StoredTask[]>();
  const groupLabels = new Map<string, string>();

  for (const task of tasks) {
    const text =
      `${formatWithPlates(task.description)} ${task.detail}`.toLowerCase();
    let matched = false;

    for (const v of vehicles) {
      if (
        text.includes(v.label.toLowerCase()) ||
        text.includes(v.reg.toLowerCase())
      ) {
        if (!groupMap.has(v.key)) {
          groupMap.set(v.key, []);
          groupLabels.set(v.key, v.label);
        }
        groupMap.get(v.key)!.push(task);
        matched = true;
        break;
      }
    }

    if (!matched) {
      groupMap.set(task.id, [task]);
      groupLabels.set(task.id, task.description);
    }
  }

  const groups: TaskGroup[] = [];
  for (const [key, groupTasks] of groupMap) {
    groupTasks.sort((a, b) => {
      const aDays = a.dueDate ? daysUntil(a.dueDate) : 999;
      const bDays = b.dueDate ? daysUntil(b.dueDate) : 999;
      return aDays - bDays;
    });
    const earliest = groupTasks[0];
    const days = earliest.dueDate ? daysUntil(earliest.dueDate) : null;
    groups.push({
      key,
      label: groupLabels.get(key)!,
      tasks: groupTasks,
      earliestDue: days ?? 999,
      mostUrgent: days !== null ? getUrgency(days) : "info",
      dueLabel: days !== null ? formatDueLabel(days) : "",
    });
  }

  groups.sort((a, b) => a.earliestDue - b.earliestDue);
  return groups;
}

export function TasksView() {
  const persona = useAppStore((s) => s.persona);
  const personaData = useAppStore((s) => s.personaData);
  const openBottomSheet = useAppStore((s) => s.openBottomSheet);
  const showToast = useAppStore((s) => s.showToast);
  const agent = useAppStore((s) => s.agent);
  const taskVersion = useAppStore((s) => s.taskVersion);
  const isManualMode = agent === "none";
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);

  if (!persona) return null;

  // Re-read tasks whenever taskVersion changes (bumped by saveTasks)
  void taskVersion;
  const allTasks = getTasks(persona);
  const activeTasks = allTasks.filter(
    (t) => t.status !== "completed" && t.status !== "dismissed",
  );
  const completedTasks = allTasks.filter(
    (t) => t.status === "completed" || t.status === "dismissed",
  );

  const filterTasks = (tasks: StoredTask[]) =>
    activeFilter === "all"
      ? tasks
      : tasks.filter((t) => t.service === activeFilter);

  // Split active tasks into user and agent, then group
  const yourTasks = filterTasks(activeTasks.filter((t) => t.type !== "agent"));
  const agentTasks = filterTasks(activeTasks.filter((t) => t.type === "agent"));
  const filteredCompleted = filterTasks(completedTasks);

  const yourGroups = groupTasks(yourTasks, personaData);
  const agentGroups = groupTasks(agentTasks, personaData);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDismiss = (taskId: string) => {
    const tasks = getTasks(persona);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = "dismissed";
      task.updatedAt = new Date().toISOString();
      saveTasks(persona, tasks);
      showToast("Task dismissed");
      forceUpdate((n) => n + 1);
    }
  };

  const handleDelegate = (taskId: string) => {
    const tasks = getTasks(persona);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.type = "agent";
      task.updatedAt = new Date().toISOString();
      saveTasks(persona, tasks);
      showToast("Delegated to agent");
      forceUpdate((n) => n + 1);
    }
  };

  const handleAccept = (taskId: string) => {
    const tasks = getTasks(persona);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = "accepted";
      task.updatedAt = new Date().toISOString();
      saveTasks(persona, tasks);
      showToast("Task accepted");
      forceUpdate((n) => n + 1);
    }
  };

  const renderTaskRow = (task: StoredTask, allowDelegate: boolean) => {
    const days = task.dueDate ? daysUntil(task.dueDate) : null;
    const isAgent = task.type === "agent";

    const swipeActions = {
      ...(allowDelegate && !isAgent
        ? {
            leftAction: {
              label: "Delegate",
              color: "#1d70b8",
              onAction: () => handleDelegate(task.id),
              direction: "right" as const,
            },
          }
        : {}),
      rightAction: {
        label: isAgent ? "Stop" : "Delete",
        color: "#d4351c",
        onAction: () => handleDismiss(task.id),
        direction: "left" as const,
      },
    };

    return (
      <SwipeToAction key={task.id} {...swipeActions}>
        <div className="px-3 py-3.5 bg-white">
          <button
            onClick={() => openBottomSheet("task-detail", task)}
            className="flex items-center gap-2.5 w-full text-left touch-feedback"
          >
            {days !== null && (
              <UrgencyDot urgency={getUrgency(days)} size="md" />
            )}
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-govuk-black leading-tight">
                {formatWithPlates(task.description)}
              </span>
              {task.status === "suggested" && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-50 text-yellow-700 mt-0.5">
                  {task.status}
                </span>
              )}
            </div>
            {days !== null && (
              <span
                className={`text-xs font-bold shrink-0 ${
                  days < 0
                    ? "text-govuk-red"
                    : days < 14
                      ? "text-govuk-red"
                      : days < 30
                        ? "text-govuk-orange"
                        : "text-govuk-dark-grey"
                }`}
              >
                {formatDueLabel(days)}
              </span>
            )}
          </button>

          {/* Action buttons for suggested tasks */}
          {task.status === "suggested" && (
            <div className="flex items-center gap-2 mt-1.5 ml-7">
              <button
                onClick={() => handleAccept(task.id)}
                className="px-3 py-1 rounded-full bg-govuk-green text-white text-xs font-bold hover:bg-govuk-green/90 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => handleDismiss(task.id)}
                className="px-3 py-1 rounded-full bg-gray-100 text-govuk-dark-grey text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </SwipeToAction>
    );
  };

  const renderGroup = (group: TaskGroup, allowDelegate: boolean) => {
    const isMulti = group.tasks.length > 1;
    const isExpanded = expandedGroups.has(group.key);

    if (!isMulti) {
      return renderTaskRow(group.tasks[0], allowDelegate);
    }

    // Multi-task group — accordion
    const dueParts: string[] = [];
    const soon = group.tasks.filter(
      (t) => t.dueDate && daysUntil(t.dueDate) < 30,
    );
    const later = group.tasks.filter(
      (t) => t.dueDate && daysUntil(t.dueDate) >= 30,
    );
    if (soon.length > 0) dueParts.push(`${soon.length} due soon`);
    if (later.length > 0) {
      const latest = later[later.length - 1];
      dueParts.push(
        `${later.length} in ${formatDueLabel(daysUntil(latest.dueDate!))}`,
      );
    }

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
              {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
              {dueParts.length > 0 ? ` · ${dueParts.join(", ")}` : ""}
            </span>
          </div>
          {group.dueLabel && (
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
          )}
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
          <div className="bg-gray-50 border-t border-gray-100 divide-y divide-gray-100">
            {group.tasks.map((task) => {
              const days = task.dueDate ? daysUntil(task.dueDate) : null;
              return (
                <button
                  key={task.id}
                  onClick={() => openBottomSheet("task-detail", task)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors hover:bg-gray-100 touch-feedback"
                >
                  {days !== null && (
                    <UrgencyDot urgency={getUrgency(days)} size="sm" />
                  )}
                  <span className="flex-1 text-sm text-govuk-black truncate">
                    {formatWithPlates(task.description)}
                  </span>
                  {days !== null && (
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        days < 14
                          ? "text-govuk-red"
                          : days < 30
                            ? "text-govuk-orange"
                            : "text-govuk-dark-grey"
                      }`}
                    >
                      {formatDueLabel(days)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const hasNoTasks =
    yourGroups.length === 0 && (isManualMode || agentGroups.length === 0);

  return (
    <div className="max-w-lg mx-auto pb-20">
      <h2 className="text-2xl font-bold text-govuk-black mb-4">To do</h2>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors touch-feedback ${
              activeFilter === f.id
                ? "bg-govuk-blue text-white"
                : "bg-white text-govuk-dark-grey shadow-sm hover:shadow-md"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {hasNoTasks && (
        <div className="text-center py-8 text-govuk-dark-grey">
          <svg
            className="mx-auto mb-3 opacity-40"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <p className="text-sm">No active tasks</p>
        </div>
      )}

      {/* Your to-dos */}
      {yourGroups.length > 0 && (
        <div className="mb-5">
          <h3 className="text-base font-extrabold text-govuk-black mb-2">
            Your to-dos ({yourTasks.length})
          </h3>
          {!isManualMode && (
            <p className="text-xs text-govuk-dark-grey mb-2">
              Swipe right to delegate to agent
            </p>
          )}
          <div className="bg-white rounded-card shadow-sm divide-y divide-gray-100 overflow-hidden">
            {yourGroups.map((g) => renderGroup(g, !isManualMode))}
          </div>
        </div>
      )}

      {/* Agent to-dos — hidden in manual mode */}
      {!isManualMode && agentGroups.length > 0 && (
        <div className="mb-5">
          <h3 className="text-base font-extrabold blue-ripple-text mb-2">
            Agent to-dos ({agentTasks.length})
          </h3>
          <div className="bg-white rounded-card shadow-sm divide-y divide-gray-100 overflow-hidden">
            {agentGroups.map((g) => renderGroup(g, false))}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {filteredCompleted.length > 0 && (
        <div>
          <h3 className="text-base font-extrabold text-govuk-black mb-2">
            Completed ({filteredCompleted.length})
          </h3>
          <div className="bg-white rounded-card shadow-sm divide-y divide-gray-100 opacity-60">
            {filteredCompleted.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 px-3 py-3.5"
              >
                <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm text-govuk-dark-grey line-through leading-tight">
                    {formatWithPlates(task.description)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
