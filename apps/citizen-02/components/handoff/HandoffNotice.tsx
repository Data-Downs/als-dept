"use client";

import { resolveEscalationConfig } from "@als/schemas";

interface HandoffNoticeProps {
  urgency: "routine" | "priority" | "urgent" | "safeguarding";
  reason: string;
  department: string;
  phone?: string;
  hours?: string;
  onDismiss?: () => void;
  interactionType?: string;
}

const urgencyStyles: Record<string, { bg: string; border: string; label: string }> = {
  routine: { bg: "bg-blue-50", border: "border-blue-400", label: "Handoff to human agent" },
  priority: { bg: "bg-yellow-50", border: "border-yellow-400", label: "Priority handoff" },
  urgent: { bg: "bg-orange-50", border: "border-orange-400", label: "Urgent handoff" },
  safeguarding: { bg: "bg-red-50", border: "border-red-400", label: "Immediate support needed" },
};

export default function HandoffNotice({
  urgency,
  reason,
  department,
  phone,
  hours,
  onDismiss,
  interactionType,
}: HandoffNoticeProps) {
  const escalation = resolveEscalationConfig(interactionType);
  const style = urgencyStyles[urgency] || urgencyStyles.routine;
  // Use type-specific label for routine handoffs; keep urgency labels for priority/safeguarding
  const label = urgency === "routine" ? escalation.noticeLabel : style.label;

  return (
    <div className={`${style.bg} border-l-4 ${style.border} rounded p-4`}>
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-sm">{label}</h4>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
            &#10005;
          </button>
        )}
      </div>

      <p className="text-sm mt-2">{reason}</p>

      <div className="mt-3 bg-white rounded p-3 border border-gray-200">
        <div className="text-sm">
          <strong>{department}</strong>
        </div>
        {phone && (
          <div className="text-sm mt-1">
            Phone: <strong>{phone}</strong>
          </div>
        )}
        {hours && (
          <div className="text-xs text-gray-500 mt-1">{hours}</div>
        )}
      </div>

      {/* Type-specific citizen guidance */}
      <p className="text-xs text-gray-500 mt-3">
        {escalation.citizenGuidance}
      </p>

      {/* Type-specific resources (Proposal D) */}
      {escalation.resources.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-bold text-gray-600">Useful contacts:</p>
          {escalation.resources.map((r) => (
            <div key={r.label} className="text-xs text-gray-500">
              <strong>{r.label}</strong> — {r.detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
