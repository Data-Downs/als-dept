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

function deriveInitials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Z]/.test(w));
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0][0];
  return words[0][0] + words[words.length - 1][0];
}

const FALLBACK_PERSONAS: Persona[] = [
  { id: "anna-cotton", name: "Anna & Tom Cotton", initials: "AC", color: "#1d70b8", desc: "Primary school teacher with young family, managing career and toddler care" },
  { id: "david-evans", name: "David Evans", initials: "DE", color: "#d4351c", desc: "Recently redundant warehouse worker, struggling with finances, moderate tech skills" },
  { id: "emma-parker", name: "Emma & Liam Parker", initials: "EP", color: "#1d70b8", desc: "Young expecting couple, first baby on the way" },
  { id: "helen-pitt", name: "Helen Pitt", initials: "HP", color: "#505a5f", desc: "Part-time university lecturer and single mother" },
  { id: "margaret-thompson", name: "Margaret Thompson", initials: "MT", color: "#912b88", desc: "Cautious retiree, widowed, managing health conditions, limited tech experience" },
  { id: "mary-summers", name: "Hugo & Mary Summers", initials: "MS", color: "#4c6272", desc: "Affluent couple approaching retirement with complex financial estate" },
  { id: "priya-sharma", name: "Priya Sharma", initials: "PS", color: "#f47738", desc: "Recently redundant software tester, applying for Universal Credit" },
  { id: "rajesh-patel", name: "Rajesh Patel", initials: "RP", color: "#00703c", desc: "Self-employed IT consultant, tech-savvy professional with complex finances" },
  { id: "rebecca-shortland", name: "Rebecca Shortland", initials: "RS", color: "#b58900", desc: "Recently redundant marketing manager, single mother navigating sudden unemployment" },
];

export function PersonaPicker() {
  const setPersona = useAppStore((s) => s.setPersona);
  const [personas, setPersonas] = useState<Persona[]>(FALLBACK_PERSONAS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((data) => {
        const fetched = (data.personas || []).map((p: Persona) => ({
          ...p,
          initials: p.initials || deriveInitials(p.name),
        }));
        if (fetched.length > 0) setPersonas(fetched);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-4 pt-14">
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-govuk-blue flex items-center justify-center shadow-lg shadow-govuk-blue/20">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="10" r="4" stroke="white" strokeWidth="1.5" />
            <path
              d="M7 22c0-3.87 3.13-7 7-7s7 3.13 7 7"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle
              cx="14"
              cy="14"
              r="12"
              stroke="white"
              strokeWidth="1.5"
              strokeOpacity="0.3"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-govuk-black">Citizen-03</h1>
        <p className="text-sm text-govuk-dark-grey mt-1">
          Agentic government services
        </p>
      </div>

      <div className="space-y-2.5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
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
          : personas.map((p, i) => (
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
                    {p.initials ||
                      p.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-govuk-black text-sm">
                      {p.name}
                    </div>
                    <div className="text-xs text-govuk-dark-grey mt-0.5">
                      {p.desc}
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    className="text-govuk-mid-grey shrink-0"
                  >
                    <path
                      d="M6 3l5 5-5 5"
                      stroke="currentColor"
                      fill="none"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>
            ))}
      </div>

      <div className="mt-6 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-[11px] text-govuk-dark-grey leading-relaxed">
          <strong className="text-govuk-blue">How it works:</strong> citizen-03
          uses a thin agent loop — the LLM reasons with tools and the platform
          validates. Watch the trace panel to see what the agent does in
          real-time.
        </p>
      </div>
    </main>
  );
}
