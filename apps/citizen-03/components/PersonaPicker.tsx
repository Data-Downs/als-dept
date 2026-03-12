"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";

interface Persona {
  id: string;
  name: string;
  initials: string;
  color: string;
  desc: string;
}

export function PersonaPicker() {
  const setPersona = useAppStore((s) => s.setPersona);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((data) => setPersonas(data.personas || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-4 pt-14">
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-govuk-blue flex items-center justify-center shadow-lg shadow-govuk-blue/20">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="10" r="4" stroke="white" strokeWidth="1.5"/>
            <path d="M7 22c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="14" cy="14" r="12" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-govuk-black">Citizen-03</h1>
        <p className="text-sm text-govuk-dark-grey mt-1">
          Agentic government services
        </p>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-full p-3.5 bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))
        ) : (
          personas.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPersona(p.id)}
              className="w-full text-left p-3.5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 active:scale-[0.98]"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                  style={{ backgroundColor: p.color || "#505a5f" }}
                >
                  {p.initials || p.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-govuk-black text-sm">{p.name}</div>
                  <div className="text-xs text-govuk-dark-grey mt-0.5">{p.desc}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" className="text-govuk-mid-grey shrink-0">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-6 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-[11px] text-govuk-dark-grey leading-relaxed">
          <strong className="text-govuk-blue">How it works:</strong> citizen-03 uses a thin agent loop —
          the LLM reasons with tools and the platform validates. Watch the
          trace panel to see what the agent does in real-time.
        </p>
      </div>
    </main>
  );
}
