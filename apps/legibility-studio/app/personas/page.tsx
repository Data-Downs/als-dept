"use client";

import { useState, useEffect, useMemo } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import KPICard from "@/components/ui/KPICard";
import PersonaCard from "@/components/personas/PersonaCard";
import { Plus } from "lucide-react";
import {
  DEPARTMENTS,
  PERSONA_DEPARTMENTS,
  type DepartmentCode,
} from "@als/personal-data";

interface PersonaSummary {
  id: string;
  name: string;
  personaName: string;
  description: string;
  age: number;
  address: { city: string; postcode: string };
  employment_status: string;
  credentialCount: number;
  income: number;
  savings: number;
}

export default function PersonasPage() {
  const [users, setUsers] = useState<PersonaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState<DepartmentCode | null>(null);

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!activeDept) return users;
    const deptPersonaIds = new Set(
      Object.entries(PERSONA_DEPARTMENTS)
        .filter(([, depts]) => depts.includes(activeDept))
        .map(([id]) => id),
    );
    return users.filter((u) => deptPersonaIds.has(u.id));
  }, [users, activeDept]);

  const totalCredentials = users.reduce((sum, u) => sum + u.credentialCount, 0);

  return (
    <>
      <Breadcrumbs items={[{ label: "Personas" }]} />
      <PageHeader
        title="Test Personas"
        subtitle="View and edit unified user identities used in citizen simulations."
        actions={
          <a
            href="/personas/new"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-studio-accent text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Add Persona
          </a>
        }
      />

      {loading ? (
        <p className="text-sm text-gray-400 mt-8">Loading personas...</p>
      ) : (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <KPICard
              label={activeDept ? `${activeDept} Personas` : "Total Personas"}
              value={filtered.length}
            />
            <KPICard label="All Personas" value={users.length} />
            <KPICard label="Total Credentials" value={totalCredentials} />
          </div>

          {/* Department filter tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => setActiveDept(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeDept === null
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All departments
            </button>
            {DEPARTMENTS.map((dept) => {
              const count = Object.entries(PERSONA_DEPARTMENTS).filter(([, depts]) =>
                depts.includes(dept.code),
              ).length;
              return (
                <button
                  key={dept.code}
                  onClick={() =>
                    setActiveDept(activeDept === dept.code ? null : dept.code)
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeDept === dept.code
                      ? "text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  style={
                    activeDept === dept.code
                      ? { backgroundColor: dept.color }
                      : undefined
                  }
                >
                  {dept.code}
                  <span className="ml-1.5 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Info banner */}
          <div className="border border-blue-200 rounded-lg bg-blue-50 px-4 py-3 mb-6">
            <p className="text-xs text-blue-800">
              {activeDept
                ? `Showing personas that interact with ${DEPARTMENTS.find((d) => d.code === activeDept)?.name ?? activeDept} services.`
                : "Changes to persona data require restarting the citizen-experience dev server to take effect in the chat UI."}
            </p>
          </div>

          {/* User cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((user) => (
              <PersonaCard key={user.id} user={user} />
            ))}
          </div>

          {filtered.length === 0 && activeDept && (
            <p className="text-sm text-gray-400 mt-8 text-center">
              No personas found for {activeDept}.
            </p>
          )}
        </>
      )}
    </>
  );
}
