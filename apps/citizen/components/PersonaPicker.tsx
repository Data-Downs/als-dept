"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  DEPARTMENTS,
  PERSONA_DEPARTMENTS,
  type DepartmentCode,
} from "@als/personal-data";

interface PersonaItem {
  id: string;
  name: string;
  initials: string;
  color: string;
  desc: string;
}

export function PersonaPicker() {
  const setPersona = useAppStore((s) => s.setPersona);
  const openBottomSheet = useAppStore((s) => s.openBottomSheet);
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [activeDept, setActiveDept] = useState<DepartmentCode | null>(null);

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((data) => {
        if (data.personas?.length) setPersonas(data.personas);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!activeDept) return personas;
    const deptPersonaIds = new Set(
      Object.entries(PERSONA_DEPARTMENTS)
        .filter(([, depts]) => depts.includes(activeDept))
        .map(([id]) => id),
    );
    return personas.filter((p) => deptPersonaIds.has(p.id));
  }, [personas, activeDept]);

  return (
    <div className="max-w-md mx-auto pt-8">
      <div className="text-center mb-6">
        <svg
          className="mx-auto mb-4"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1d70b8"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h1 className="text-2xl font-bold mb-2">Who are you today?</h1>
        <p className="text-govuk-dark-grey">
          Choose a persona to explore government services from their
          perspective.
        </p>
      </div>

      {/* Department filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1 no-scrollbar">
        <button
          onClick={() => setActiveDept(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            activeDept === null
              ? "bg-govuk-black text-white"
              : "bg-gray-100 text-govuk-dark-grey hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept.code}
            onClick={() =>
              setActiveDept(activeDept === dept.code ? null : dept.code)
            }
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeDept === dept.code
                ? "text-white"
                : "bg-gray-100 text-govuk-dark-grey hover:bg-gray-200"
            }`}
            style={
              activeDept === dept.code
                ? { backgroundColor: dept.color }
                : undefined
            }
          >
            {dept.code}
          </button>
        ))}
      </div>

      {/* Persona count */}
      {activeDept && (
        <p className="text-xs text-govuk-dark-grey mb-3">
          {filtered.length} persona{filtered.length !== 1 ? "s" : ""} for{" "}
          {DEPARTMENTS.find((d) => d.code === activeDept)?.name}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((p) => {
          const depts = PERSONA_DEPARTMENTS[p.id] ?? [];
          return (
            <button
              key={p.id}
              onClick={() => setPersona(p.id)}
              className="flex items-center gap-4 w-full p-4 bg-white rounded-card shadow-sm hover:shadow-md transition-all text-left touch-feedback"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: p.color }}
              >
                {p.initials}
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block text-govuk-black">{p.name}</strong>
                <span className="text-sm text-govuk-dark-grey line-clamp-1">
                  {p.desc}
                </span>
                {depts.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {depts.map((d) => {
                      const info = DEPARTMENTS.find((x) => x.code === d);
                      return (
                        <span
                          key={d}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${info?.color ?? "#505a5f"}18`,
                            color: info?.color ?? "#505a5f",
                          }}
                        >
                          {d}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <svg
                className="shrink-0 text-govuk-blue"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Agent selection link */}
      <div className="text-center mt-6">
        <button
          onClick={() => openBottomSheet("agent-selection")}
          className="text-sm text-govuk-blue underline"
        >
          Choose your agent style
        </button>
      </div>

      <p className="text-center text-xs text-govuk-dark-grey mt-6">
        This is a proof-of-concept simulator. Responses are generated by AI for
        demonstration purposes.
      </p>
    </div>
  );
}
