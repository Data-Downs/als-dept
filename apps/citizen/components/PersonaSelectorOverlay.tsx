"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { BottomSheet } from "./ui/BottomSheet";
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

export function PersonaSelectorOverlay() {
  const persona = useAppStore((s) => s.persona);
  const agent = useAppStore((s) => s.agent);
  const serviceMode = useAppStore((s) => s.serviceMode);
  const setPersona = useAppStore((s) => s.setPersona);
  const setAgent = useAppStore((s) => s.setAgent);
  const setServiceMode = useAppStore((s) => s.setServiceMode);
  const setOpen = useAppStore((s) => s.setPersonaSelectorOpen);
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
    <BottomSheet
      open={true}
      onClose={() => setOpen(false)}
      title="Switch persona"
    >
      {/* Department filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1 no-scrollbar">
        <button
          onClick={() => setActiveDept(null)}
          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
            activeDept === null
              ? "bg-govuk-black text-white"
              : "bg-gray-100 text-govuk-dark-grey"
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
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
              activeDept === dept.code
                ? "text-white"
                : "bg-gray-100 text-govuk-dark-grey"
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

      {/* Persona cards */}
      <div className="space-y-3 mb-6">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setPersona(p.id);
              setOpen(false);
            }}
            className={`flex items-center gap-3 w-full p-4 rounded-2xl text-left transition-all ${
              persona === p.id
                ? "ring-2 ring-govuk-blue bg-blue-50 shadow-sm"
                : "bg-white shadow-sm hover:shadow-md"
            }`}
          >
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: p.color || "#505a5f" }}
            >
              {p.initials ||
                p.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
            </span>
            <div className="min-w-0">
              <strong className="block text-sm">{p.name}</strong>
              <span className="text-xs text-govuk-dark-grey">{p.desc}</span>
            </div>
            {persona === p.id && (
              <svg
                className="shrink-0 text-govuk-blue ml-auto"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Agent + mode selection */}
      <div className="border-t border-govuk-mid-grey pt-4">
        <h3 className="font-bold text-sm mb-3">AI Agent</h3>
        <div className="flex gap-2 mb-4">
          {(["dot", "max"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAgent(a)}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium ${
                agent === a
                  ? "border-govuk-blue bg-blue-50 text-govuk-blue"
                  : "border-govuk-mid-grey text-govuk-dark-grey"
              }`}
            >
              {a.toUpperCase()}
              <span className="block text-xs font-normal mt-0.5">
                {a === "dot" ? "Cautious" : "Confident"}
              </span>
            </button>
          ))}
        </div>

        <h3 className="font-bold text-sm mb-3">Service mode</h3>
        <div className="flex gap-2">
          {(["json", "mcp"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setServiceMode(m)}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium ${
                serviceMode === m
                  ? "border-govuk-blue bg-blue-50 text-govuk-blue"
                  : "border-govuk-mid-grey text-govuk-dark-grey"
              }`}
            >
              {m.toUpperCase()}
              <span className="block text-xs font-normal mt-0.5">
                {m === "json" ? "Stable" : "Experimental"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
