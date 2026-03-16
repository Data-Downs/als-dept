"use client";

import { useState } from "react";

export function RegisterBirthCard() {
  const [added, setAdded] = useState(false);

  const handleAddToCalendar = () => {
    setAdded(true);
  };

  return (
    <div className="mt-3">
      <div className="bg-white rounded-card shadow-sm overflow-hidden">
        <div className="px-4 pt-3.5 pb-2">
          <div className="flex items-start gap-3">
            {/* Blue number circle */}
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold transition-colors duration-300 ${
                added ? "bg-govuk-green text-white" : "bg-govuk-blue text-white"
              }`}
            >
              {added ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                "6"
              )}
            </span>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-govuk-black leading-tight">
                Register the birth
              </p>
              <p className="text-sm blue-ripple-text font-medium mt-0.5 leading-snug">
                Must be done within 42 days
              </p>

              {/* Divider */}
              <div className="border-t border-gray-100 mt-2 mb-1.5" />

              {/* Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-govuk-dark-grey">
                  <span className="text-govuk-blue opacity-70">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <span>Macclesfield Town Hall Register Office</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-govuk-dark-grey">
                  <span className="text-govuk-blue opacity-70">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <span>Due by 42 days after birth</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add to calendar button — the entire bottom row */}
        {added ? (
          <div className="bg-govuk-green/10 py-3 text-center">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-govuk-green">
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
              Added to calendar
            </span>
          </div>
        ) : (
          <button
            onClick={handleAddToCalendar}
            className="w-full py-3 text-sm font-bold text-white bg-govuk-blue transition-all duration-300 touch-feedback flex items-center justify-center gap-2"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="12" y1="14" x2="12" y2="18" />
              <line x1="10" y1="16" x2="14" y2="16" />
            </svg>
            Add to calendar
          </button>
        )}
      </div>
    </div>
  );
}
