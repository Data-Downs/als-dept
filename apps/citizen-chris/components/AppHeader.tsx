"use client";

import { useAppStore } from "@/lib/store";
import {
  PERSONA_COLORS,
  PERSONA_INITIALS,
} from "@/lib/types";

export function AppHeader() {
  const persona = useAppStore((s) => s.persona);
  const currentView = useAppStore((s) => s.currentView);
  const navigateBack = useAppStore((s) => s.navigateBack);
  const setSettingsPaneOpen = useAppStore((s) => s.setSettingsPaneOpen);
  const setPersonaSelectorOpen = useAppStore((s) => s.setPersonaSelectorOpen);

  const showBack =
    currentView === "detail" ||
    currentView === "chat" ||
    currentView === "tasks" ||
    currentView === "plan";

  return (
    <header
      className="bg-govuk-blue sticky top-0 z-40"
      role="banner"
      style={{ paddingTop: "var(--safe-area-top)" }}
    >
      {/* Original-height blue bar with GOV.UK wordmark centred at bottom */}
      <div className="max-w-[960px] mx-auto px-4 pt-[60px] pb-4 flex items-center">
        {/* Left: back chevron on sub-pages */}
        <div className="w-10 shrink-0 flex items-center">
          {showBack && (
            <button
              onClick={navigateBack}
              className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors touch-feedback"
              aria-label="Go back"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1d70b8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Centre: GOV.UK wordmark — sits at the bottom of the blue bar */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => {
              if (persona && currentView !== "persona-picker") {
                setPersonaSelectorOpen(true);
              }
            }}
            className="flex items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/govuk-wordmark.png"
              alt="GOV.UK"
              className="h-[0.9375rem] w-auto"
            />
          </button>
        </div>

        {/* Right: persona avatar — aligned with wordmark */}
        <div className="w-10 shrink-0 flex justify-end">
          {persona && currentView !== "persona-picker" && (
            <button
              onClick={() => setSettingsPaneOpen(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white/20 hover:ring-white/50 transition-all touch-feedback"
              style={{ backgroundColor: PERSONA_COLORS[persona] }}
              aria-label="Open personal data dashboard"
            >
              {PERSONA_INITIALS[persona]}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
