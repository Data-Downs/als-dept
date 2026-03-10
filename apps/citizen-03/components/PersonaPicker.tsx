"use client";

import { useAppStore } from "@/lib/store";

const PERSONAS = [
  { id: "emma-parker", name: "Emma Parker", desc: "Young mum, expecting first baby", color: "#1d70b8" },
  { id: "margaret-thompson", name: "Margaret Thompson", desc: "Recently bereaved widow", color: "#912b88" },
  { id: "rajesh-patel", name: "Rajesh Patel", desc: "Self-employed, disability", color: "#00703c" },
  { id: "priya-sharma", name: "Priya Sharma", desc: "Recent graduate, job seeking", color: "#f47738" },
  { id: "david-evans", name: "David Evans", desc: "Near retirement, complex finances", color: "#d4351c" },
  { id: "mary-summers", name: "Mary Summers", desc: "Carer for elderly parent", color: "#505a5f" },
];

export function PersonaPicker() {
  const setPersona = useAppStore((s) => s.setPersona);

  return (
    <main className="flex-1 overflow-y-auto p-4 pt-14">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-govuk-blue flex items-center justify-center">
          <span className="text-white text-lg font-bold">C3</span>
        </div>
        <h1 className="text-xl font-bold text-govuk-black">Citizen-03</h1>
        <p className="text-sm text-govuk-dark-grey mt-1">
          Agentic government services
        </p>
      </div>

      <div className="space-y-3">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPersona(p.id)}
            className="w-full text-left p-4 bg-white rounded-card shadow-sm border border-gray-100 hover:shadow-md transition-shadow touch-feedback"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: p.color }}
              >
                {p.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div className="font-semibold text-govuk-black">{p.name}</div>
                <div className="text-xs text-govuk-dark-grey">{p.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs text-govuk-dark-grey leading-relaxed">
          <strong>citizen-03</strong> uses a thin agent loop: the LLM reasons with
          tools and the platform validates. Compare with citizen-02 where a
          15-step orchestrator drives the experience.
        </p>
      </div>
    </main>
  );
}
