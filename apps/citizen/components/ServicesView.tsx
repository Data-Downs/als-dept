"use client";

import { useAppStore } from "@/lib/store";

export function ServicesView() {
  const lifeEvents = useAppStore((s) => s.lifeEvents);

  return (
    <div className="max-w-lg mx-auto pb-20">
      <h2 className="text-2xl font-bold text-govuk-black mb-2">Services</h2>
      <p className="text-sm text-govuk-dark-grey mb-5">
        Browse government services and visit GOV.UK directly.
      </p>

      {lifeEvents.length === 0 && (
        <div className="text-center py-8 text-govuk-dark-grey">
          <p className="text-sm">No services loaded yet.</p>
        </div>
      )}

      {lifeEvents.map((le) => (
        <div key={le.id} className="mb-5">
          <h3 className="text-base font-extrabold text-govuk-black mb-2">
            {le.icon} {le.name}
          </h3>
          <div className="bg-white rounded-card shadow-sm divide-y divide-gray-100 overflow-hidden">
            {le.services.map((svc) => (
              <a
                key={svc.id}
                href={svc.govuk_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-gray-50 transition-colors text-left no-underline"
              >
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-govuk-black leading-tight">
                    {svc.name}
                  </span>
                  <span className="text-xs text-govuk-dark-grey">
                    {svc.dept}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-medium text-govuk-blue flex items-center gap-1">
                  GOV.UK
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
