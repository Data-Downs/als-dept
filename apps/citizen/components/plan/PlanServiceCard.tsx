"use client";

import {
  CheckIcon,
  LockIcon,
  PlayIcon,
  SkipIcon,
  DelegateIcon,
  InfoIcon,
  TIMEFRAME_ICONS,
  ACTION_ICONS,
} from "./PlanIcons";

export type PlanServiceStatus =
  | "available"
  | "delegated"
  | "completed"
  | "in_progress"
  | "skipped"
  | "locked";

export interface PlanServiceCardProps {
  number: number;
  name: string;
  description: string;
  status: PlanServiceStatus;
  agentAction?: string;
  timeframe?: string;
  timeframeIcon?: string;
  actionIcon?: string;
  proactivity?: {
    mode: "suggest" | "warn" | "inform";
    framingPrefix: string;
    accentColor: string;
  };
  onDelegate?: () => void;
  onTap?: () => void;
  onDetails?: () => void;
  variant: "compact" | "preview" | "full";
  agentName?: string;
  children?: React.ReactNode;
}

function StatusCircle({
  number,
  status,
}: {
  number: number;
  status: PlanServiceStatus;
}) {
  switch (status) {
    case "completed":
    case "delegated":
      return (
        <span className="w-7 h-7 rounded-full bg-govuk-green text-white flex items-center justify-center shrink-0 mt-0.5">
          <CheckIcon />
        </span>
      );
    case "in_progress":
      return (
        <span className="w-7 h-7 rounded-full bg-govuk-blue text-white flex items-center justify-center shrink-0 mt-0.5 relative">
          <PlayIcon />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
        </span>
      );
    case "skipped":
      return (
        <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center shrink-0 mt-0.5">
          <SkipIcon />
        </span>
      );
    case "locked":
      return (
        <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center shrink-0 mt-0.5">
          <LockIcon />
        </span>
      );
    case "available":
    default:
      return (
        <span className="w-7 h-7 rounded-full bg-govuk-blue text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
          {number}
        </span>
      );
  }
}

export function PlanServiceCard({
  number,
  name,
  description,
  status,
  agentAction,
  timeframe,
  timeframeIcon,
  actionIcon,
  proactivity,
  onDelegate,
  onTap,
  onDetails,
  variant,
  agentName = "Dot",
  children,
}: PlanServiceCardProps) {
  const isLocked = status === "locked";
  const isSkipped = status === "skipped";
  const isDelegated = status === "delegated" || status === "completed";

  const cardBg = isDelegated
    ? "bg-blue-50/40"
    : isLocked
      ? "bg-white opacity-60"
      : "bg-white";

  const proactivityBorder =
    variant === "preview" && proactivity
      ? proactivity.mode === "warn"
        ? "border-l-4 border-l-govuk-red"
        : proactivity.mode === "suggest"
          ? "border-l-4 border-l-govuk-green"
          : "border-l-4 border-l-govuk-blue"
      : "";

  const clickable =
    !isLocked &&
    (variant === "preview" ? !!onTap : variant === "full" ? !!onTap : false);

  const Wrapper = clickable ? "button" : "div";
  const wrapperProps = clickable
    ? { onClick: onTap, className: `w-full text-left` }
    : {};

  return (
    <div
      className={`border-b border-gray-100 transition-colors duration-300 ${cardBg} ${proactivityBorder}`}
    >
      <Wrapper {...wrapperProps}>
        {/* Main content area */}
        <div className="px-4 pt-3.5 pb-2">
          <div className="flex items-start gap-3">
            <StatusCircle number={number} status={status} />

            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-bold leading-tight ${
                  isSkipped ? "text-gray-400 line-through" : "text-govuk-black"
                }`}
              >
                {name}
              </p>
              <p
                className={`text-sm font-medium mt-0.5 leading-snug ${
                  isSkipped ? "text-gray-400" : "text-govuk-dark-grey"
                }`}
              >
                {description}
              </p>

              {/* Agent action + timeframe rows — compact and full variants */}
              {(variant === "compact" || variant === "full") &&
                (agentAction || timeframe) &&
                !isLocked && (
                  <>
                    <div className="border-t border-gray-100 mt-2 mb-1.5" />
                    <div className="space-y-1">
                      {agentAction &&
                        (() => {
                          const ActionIconCmp = actionIcon
                            ? ACTION_ICONS[actionIcon]
                            : null;
                          return (
                            <div className="flex items-center gap-1.5 text-[11px] blue-ripple-text font-medium">
                              {ActionIconCmp && (
                                <span className="text-govuk-blue opacity-70">
                                  <ActionIconCmp />
                                </span>
                              )}
                              <span>
                                {agentName} can {agentAction.toLowerCase()}
                              </span>
                            </div>
                          );
                        })()}
                      {timeframe &&
                        (() => {
                          const TimeframeIconCmp = timeframeIcon
                            ? TIMEFRAME_ICONS[timeframeIcon]
                            : null;
                          return (
                            <div className="flex items-center gap-1.5 text-[11px] text-govuk-dark-grey">
                              {TimeframeIconCmp && (
                                <span className="text-govuk-blue opacity-70">
                                  <TimeframeIconCmp />
                                </span>
                              )}
                              <span>{timeframe}</span>
                            </div>
                          );
                        })()}
                    </div>
                  </>
                )}

              {/* Proactivity framing — preview variant */}
              {variant === "preview" && proactivity && (
                <span
                  className="block text-xs mt-1"
                  style={{ color: proactivity.accentColor }}
                >
                  {proactivity.mode === "warn"
                    ? "⚠ "
                    : proactivity.mode === "suggest"
                      ? "→ "
                      : ""}
                  {proactivity.framingPrefix} {name.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </Wrapper>

      {/* Action toolbar — compact variant */}
      {variant === "compact" && !isLocked && (
        <div className="flex items-center gap-1 px-4 pb-3 pl-14">
          {isDelegated ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-govuk-green">
              <svg
                width="10"
                height="10"
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
            <>
              {onDelegate && (
                <button
                  onClick={onDelegate}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-govuk-blue bg-blue-50 transition-all duration-200 touch-feedback"
                >
                  <DelegateIcon />
                  Delegate
                </button>
              )}
              {onDetails && (
                <button
                  onClick={onDetails}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-govuk-dark-grey transition-all duration-200 touch-feedback"
                >
                  <InfoIcon />
                  Details
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Expandable children — full variant */}
      {variant === "full" && children}
    </div>
  );
}
