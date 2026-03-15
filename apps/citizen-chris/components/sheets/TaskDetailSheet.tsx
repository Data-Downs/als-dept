"use client";

import { useState } from "react";
import { useAppStore, getTasks, saveTasks } from "@/lib/store";
import type { StoredTask, TimelineItem } from "@/lib/types";
import { UrgencyDot } from "../ui/UrgencyDot";
import { DEMO_TODAY } from "@/lib/types";

function generateCalendarFile(item: { title?: string; description?: string; dueDate?: string; detail?: string; dueLabel?: string; id?: string; daysUntil?: number }) {
  const dateStr = item.dueDate || item.dueLabel;
  if (!dateStr) return;

  let dtstart: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    dtstart = dateStr.replace(/-/g, "") + "T090000";
  } else {
    const d = new Date(DEMO_TODAY);
    d.setDate(d.getDate() + (item.daysUntil || 0));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dtstart = `${y}${m}${day}T090000`;
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GOV.UK//Citizen Agent//EN",
    "BEGIN:VEVENT",
    `DTSTART:${dtstart}`,
    `SUMMARY:${(item.title || item.description || "").replace(/[,;\\]/g, " ")}`,
    `DESCRIPTION:${(item.detail || "").replace(/[,;\\]/g, " ")}`,
    `UID:${item.id || "item"}@citizen-02`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reminder.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const diff = target.getTime() - DEMO_TODAY.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Generate a commissioning brief based on task data */
function generateBrief(
  task: StoredTask | null,
  item: (TimelineItem & Partial<StoredTask>) | null,
  agentName: string,
): {
  objective: string;
  steps: string[];
  dataUsed: string[];
  dataNeeded: string[];
  checksWithYou: boolean;
  estimatedDue: string | null;
} {
  const description = task?.description || item?.title || "";
  const detail = task?.detail || item?.detail || "";
  const service = task?.service || item?.service || "";
  const dueDate = task?.dueDate || item?.dueDate || null;

  // Infer steps from the task context
  const steps: string[] = [];
  const dataUsed: string[] = [];
  const dataNeeded: string[] = [];
  const lower = `${description} ${detail}`.toLowerCase();

  if (lower.includes("mot") || lower.includes("vehicle") || lower.includes("road tax")) {
    steps.push("Check current MOT/tax status via DVLA records");
    steps.push("Find available dates and nearby testing centres");
    steps.push("Present options for you to confirm");
    dataUsed.push("Vehicle registration number", "Current MOT expiry date");
    dataNeeded.push("Preferred location or postcode");
  } else if (lower.includes("child benefit") || lower.includes("benefit")) {
    steps.push("Review your current benefit entitlements");
    steps.push("Check eligibility for additional claims based on family data");
    steps.push("Prepare a summary of what you could receive");
    dataUsed.push("Current benefit records", "Family composition");
    if (lower.includes("claim") || lower.includes("apply")) {
      steps.push("Draft the application for your approval before submitting");
      dataNeeded.push("Confirmation of child's details");
    }
  } else if (lower.includes("tax-free childcare") || lower.includes("childcare")) {
    steps.push("Verify income eligibility with HMRC records");
    steps.push("Check childcare provider registration");
    steps.push("Calculate your estimated top-up amount");
    dataUsed.push("Employment income", "Child's date of birth");
  } else if (lower.includes("council tax")) {
    steps.push("Look up your property's current council tax band");
    steps.push("Compare with similar properties in your area");
    steps.push("Report back with findings and any action needed");
    dataUsed.push("Property address", "Current council tax band");
  } else if (lower.includes("pension")) {
    steps.push("Check your current pension contribution rate");
    steps.push("Verify it matches the correct tier for your salary");
    steps.push("Flag any discrepancies for your review");
    dataUsed.push("Employment details", "Salary information");
  } else {
    steps.push(`Research the details of: ${description}`);
    steps.push("Gather relevant information from government records");
    steps.push("Present findings for your review");
    dataUsed.push("Your personal data relevant to this service");
  }

  // Dot always checks, Max only checks for high-stakes actions
  const checksWithYou = agentName === "Dot" ? true : lower.includes("apply") || lower.includes("submit") || lower.includes("pay");

  let estimatedDue: string | null = null;
  if (dueDate) {
    const d = new Date(dueDate);
    d.setDate(d.getDate() - 3);
    estimatedDue = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  if (task?.dataNeeded && task.dataNeeded.length > 0) {
    for (const d of task.dataNeeded) {
      const label = d.replace(/_/g, " ");
      if (!dataNeeded.includes(label)) dataNeeded.push(label);
    }
  }

  return {
    objective: detail || description,
    steps,
    dataUsed,
    dataNeeded,
    checksWithYou,
    estimatedDue,
  };
}

interface TaskDetailSheetProps {
  data: unknown;
}

export function TaskDetailSheet({ data }: TaskDetailSheetProps) {
  const persona = useAppStore((s) => s.persona);
  const agent = useAppStore((s) => s.agent);
  const closeBottomSheet = useAppStore((s) => s.closeBottomSheet);
  const showToast = useAppStore((s) => s.showToast);
  const [showBrief, setShowBrief] = useState(false);

  const agentName = agent === "max" ? "Max" : "Dot";

  // Data can be a TimelineItem (from dashboard) or a StoredTask (from tasks view)
  const item = data as (TimelineItem & Partial<StoredTask>) | null;
  if (!item) return null;

  // Try to find the stored task if we have a persona
  const storedTask = persona
    ? getTasks(persona).find((t) => `task-${t.id}` === item.id || t.id === item.id)
    : null;

  const handleAccept = () => {
    if (!persona || !storedTask) return;
    const tasks = getTasks(persona);
    const task = tasks.find((t) => t.id === storedTask.id);
    if (task) {
      task.status = "accepted";
      task.updatedAt = new Date().toISOString();
      saveTasks(persona, tasks);
      showToast("Task accepted");
      closeBottomSheet();
    }
  };

  const handleDismiss = () => {
    if (!persona || !storedTask) return;
    const tasks = getTasks(persona);
    const task = tasks.find((t) => t.id === storedTask.id);
    if (task) {
      task.status = "dismissed";
      task.updatedAt = new Date().toISOString();
      saveTasks(persona, tasks);
      showToast("Task dismissed");
      closeBottomSheet();
    }
  };

  const handleDelegate = () => {
    if (!persona || !storedTask) return;
    const tasks = getTasks(persona);
    const task = tasks.find((t) => t.id === storedTask.id);
    if (task) {
      task.type = "agent";
      task.status = "accepted";
      task.updatedAt = new Date().toISOString();
      saveTasks(persona, tasks);
      showToast(`Delegated to ${agentName}`);
      closeBottomSheet();
    }
  };

  const days = item.dueDate ? daysUntil(item.dueDate) : null;
  const brief = generateBrief(storedTask, item, agentName);

  // ── Agent commissioning brief view ──
  if (showBrief) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
            agent === "max" ? "bg-amber-500" : "bg-govuk-blue"
          }`}>
            {agent === "max" ? "M" : "D"}
          </div>
          <div>
            <h3 className="text-lg font-bold text-govuk-black">
              Agent brief for {agentName}
            </h3>
            <p className="text-xs text-govuk-dark-grey">
              Review what the agent will do before confirming
            </p>
          </div>
        </div>

        {/* Objective */}
        <div>
          <p className="text-sm font-medium blue-ripple-text mb-2">Objective</p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-govuk-black leading-relaxed">{brief.objective}</p>
          </div>
        </div>

        {/* Steps — stitched cards with continuous vertical timeline */}
        <div>
          <p className="text-sm font-medium blue-ripple-text mb-2">What {agentName} will do</p>
          <div className="rounded-lg overflow-hidden relative bg-gray-50">
            {/* Single continuous vertical line behind all circles */}
            {brief.steps.length > 1 && (
              <div
                className="absolute left-[19px] bg-blue-200"
                style={{
                  width: "2px",
                  top: "calc(14px + 12px)",
                  bottom: "calc(14px + 12px)",
                }}
              />
            )}
            {brief.steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-center relative ${
                  i < brief.steps.length - 1 ? "border-b border-gray-200" : ""
                }`}
              >
                {/* Number circle — sits on top of the line */}
                <div className="w-10 shrink-0 flex justify-center py-3.5">
                  <span className="w-6 h-6 rounded-full bg-govuk-blue text-white text-[11px] font-bold flex items-center justify-center relative z-10">
                    {i + 1}
                  </span>
                </div>
                {/* Step text */}
                <div className="flex-1 py-3.5 pr-4">
                  <span className="text-sm text-govuk-black leading-snug">{step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data the agent will access */}
        {brief.dataUsed.length > 0 && (
          <div>
            <p className="text-sm font-medium blue-ripple-text mb-2">Data the agent will access</p>
            <div className="rounded-lg overflow-hidden bg-gray-50">
              {brief.dataUsed.map((d, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < brief.dataUsed.length - 1 ? "border-b border-gray-200" : ""
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d70b8" strokeWidth="2" className="shrink-0">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="text-sm text-govuk-black">{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information needed from you — yellow warning, editable feel */}
        {brief.dataNeeded.length > 0 && (
          <div>
            <p className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a16207" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Information needed from you
            </p>
            <div className="rounded-lg overflow-hidden border-2 border-yellow-400 bg-yellow-50">
              {brief.dataNeeded.map((d, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < brief.dataNeeded.length - 1 ? "border-b border-yellow-300" : ""
                  }`}
                >
                  {/* Editable pencil icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#854d0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span className="flex-1 text-sm text-yellow-900 font-medium">{d}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a16207" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Autonomy & checking + target date */}
        <div className="flex gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium blue-ripple-text mb-2">{agentName} will check</p>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-govuk-black font-medium">
                {brief.checksWithYou ? "Yes — before any action" : "Only for high-stakes steps"}
              </p>
            </div>
          </div>
          {brief.estimatedDue && (
            <div className="flex-1">
              <p className="text-sm font-medium blue-ripple-text mb-2">Target date</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-govuk-black font-medium">{brief.estimatedDue}</p>
              </div>
            </div>
          )}
        </div>

        {/* Confirm / Cancel */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleDelegate}
            className="w-full py-3 rounded-full bg-govuk-blue text-white font-bold text-sm transition-colors touch-feedback"
          >
            Confirm — delegate to {agentName}
          </button>
          <button
            onClick={() => setShowBrief(false)}
            className="w-full py-3 rounded-full bg-gray-100 text-govuk-dark-grey font-bold text-sm transition-colors touch-feedback"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Default task detail view ──
  return (
    <div className="space-y-4">
      {/* Title and urgency */}
      <div className="flex items-start gap-3">
        {item.urgency && item.urgency !== "info" && (
          <UrgencyDot urgency={item.urgency as "urgent" | "warning" | "ok"} size="md" />
        )}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-govuk-black">
            {item.title || (storedTask?.description)}
          </h3>
          {item.subtitle && (
            <p className="text-sm text-govuk-dark-grey mt-0.5">{item.subtitle}</p>
          )}
        </div>
      </div>

      {/* Metadata badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-govuk-dark-grey capitalize">
          {item.service}
        </span>
        {(item.source === "agent" || storedTask?.type === "agent") && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Agent task
          </span>
        )}
        {(item.source || storedTask?.type) && item.source !== "agent" && storedTask?.type !== "agent" && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
            item.source === "data"
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}>
            {item.source === "data" ? "data" : storedTask?.type || item.source}
          </span>
        )}
        {(item.taskStatus || storedTask?.status) && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
            (item.taskStatus === "accepted" || storedTask?.status === "accepted")
              ? "bg-green-50 text-green-700"
              : (item.taskStatus === "completed" || storedTask?.status === "completed")
                ? "bg-green-100 text-green-800"
                : "bg-yellow-50 text-yellow-700"
          }`}>
            {storedTask?.status || item.taskStatus}
          </span>
        )}
      </div>

      {/* Due date */}
      {item.dueDate && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-bold text-govuk-dark-grey uppercase tracking-wide mb-1">Due date</p>
          <p className="text-sm text-govuk-black font-medium">{formatDate(item.dueDate)}</p>
          {days !== null && (
            <p className={`text-xs font-bold mt-0.5 ${
              days < 0 ? "text-govuk-red" :
              days < 14 ? "text-govuk-red" :
              days < 30 ? "text-govuk-orange" :
              "text-govuk-dark-grey"
            }`}>
              {item.dueLabel}
            </p>
          )}
        </div>
      )}

      {/* Detail/description */}
      {(item.detail || storedTask?.detail) && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-bold text-govuk-dark-grey uppercase tracking-wide mb-1">What the agent will do</p>
          <p className="text-sm text-govuk-black leading-relaxed">
            {item.detail || storedTask?.detail}
          </p>
        </div>
      )}

      {/* Data needed */}
      {storedTask?.dataNeeded && storedTask.dataNeeded.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-bold text-govuk-dark-grey uppercase tracking-wide mb-2">Data needed</p>
          <ul className="space-y-1">
            {storedTask.dataNeeded.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-govuk-black">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-govuk-mid-grey shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                {d.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-2">
        {item.dueDate && (
          <button
            onClick={() => generateCalendarFile({
              title: item.title,
              description: storedTask?.description,
              dueDate: item.dueDate,
              detail: item.detail || storedTask?.detail,
              dueLabel: item.dueLabel,
              id: item.id,
              daysUntil: days ?? undefined,
            })}
            className="w-full py-3 rounded-full border-2 border-govuk-blue text-govuk-blue font-bold text-sm transition-colors touch-feedback flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Add to calendar
          </button>
        )}

        {/* Delegate to agent — shows commissioning brief */}
        <button
          onClick={() => setShowBrief(true)}
          className="w-full py-3 rounded-full bg-govuk-blue text-white font-bold text-sm transition-colors touch-feedback"
        >
          Delegate task to {agentName}
        </button>

        {storedTask && storedTask.status === "suggested" && (
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 py-2.5 rounded-full bg-govuk-green text-white font-bold text-sm transition-colors touch-feedback"
            >
              Accept task
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 rounded-full bg-gray-100 text-govuk-dark-grey font-bold text-sm transition-colors touch-feedback"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
