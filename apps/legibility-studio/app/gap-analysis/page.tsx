"use client";

import { useState, useEffect, useMemo } from "react";
import KPICard from "@/components/ui/KPICard";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHeader from "@/components/ui/PageHeader";

interface Service {
  id: string;
  name: string;
  department: string;
  departmentKey?: string;
  completeness: number;
  gapCount: number;
  hasPolicy: boolean;
  hasStateModel: boolean;
  hasConsent: boolean;
  source?: "full" | "catalogue";
  priority?: "demo" | "transactional" | "reference";
  govuk_url?: string;
}

interface DeptSummary {
  key: string;
  department: string;
  total: number;
  full: number;
  catalogue: number;
  coverage: number;
  demoCount: number;
  transactionalCount: number;
}

const DEPT_COLORS: Record<string, string> = {
  HMRC: "#00703c",
  DWP: "#1d70b8",
  "Home Office": "#d4351c",
  DVLA: "#4c6272",
  DVSA: "#4c6272",
  HMCTS: "#912b88",
  "Ministry of Justice": "#912b88",
  DfE: "#f47738",
  NHS: "#005eb8",
};

function getDeptColor(dept: string): string {
  for (const [key, color] of Object.entries(DEPT_COLORS)) {
    if (dept.includes(key) || dept.toLowerCase().includes(key.toLowerCase()))
      return color;
  }
  return "#505a5f";
}

export default function GapAnalysisPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => {
        setServices(data.services || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Department summaries — group by departmentKey so "HMRC" and "HM Revenue & Customs" merge
  const deptSummaries = useMemo(() => {
    const groups: Record<string, Service[]> = {};
    const displayNames: Record<string, string> = {};
    for (const s of services) {
      const key = s.departmentKey || s.department || "unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
      // Use the longest department name as the display name (catalogue has full names)
      if (
        !displayNames[key] ||
        s.department.length > displayNames[key].length
      ) {
        displayNames[key] = s.department;
      }
    }

    return Object.entries(groups)
      .map(([key, svcs]): DeptSummary => {
        const full = svcs.filter(
          (s) => (s.source || "full") === "full",
        ).length;
        const catalogue = svcs.filter(
          (s) => s.source === "catalogue",
        ).length;
        return {
          key,
          department: displayNames[key] || key,
          total: svcs.length,
          full,
          catalogue,
          coverage:
            svcs.length > 0 ? Math.round((full / svcs.length) * 100) : 0,
          demoCount: svcs.filter((s) => s.priority === "demo").length,
          transactionalCount: svcs.filter(
            (s) => s.priority === "transactional",
          ).length,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [services]);

  // Filtered services for the table
  const tableServices = useMemo(() => {
    let filtered = services;
    if (activeDept) {
      filtered = filtered.filter(
        (s) => (s.departmentKey || s.department) === activeDept,
      );
    }
    if (!showReference) {
      filtered = filtered.filter((s) => s.priority !== "reference");
    }
    // Sort: demo first, then transactional, then reference. Within each: full > graph > catalogue
    return filtered.sort((a, b) => {
      const priorityOrder = { demo: 0, transactional: 1, reference: 2 };
      const sourceOrder = { full: 0, catalogue: 1 };
      const pa = priorityOrder[a.priority || "reference"] ?? 2;
      const pb = priorityOrder[b.priority || "reference"] ?? 2;
      if (pa !== pb) return pa - pb;
      const sa = sourceOrder[(a.source || "full") as keyof typeof sourceOrder] ?? 2;
      const sb = sourceOrder[(b.source || "full") as keyof typeof sourceOrder] ?? 2;
      return sa - sb;
    });
  }, [services, activeDept, showReference]);

  // KPIs
  const totalServices = services.length;
  const fullServices = services.filter(
    (s) => (s.source || "full") === "full",
  ).length;
  const catalogueServices = services.filter(
    (s) => s.source === "catalogue",
  ).length;
  const coverage =
    totalServices > 0 ? Math.round((fullServices / totalServices) * 100) : 0;
  const needsWork = totalServices - fullServices;

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Analysing gaps...</div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/" }, { label: "Gap Analysis" }]}
      />
      <PageHeader
        title="Gap Analysis"
        subtitle="Department-level coverage of service artefacts. Shows what's done, what's catalogued, and what still needs work."
      />

      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard label="Total Services" value={totalServices} />
        <KPICard label="With Full Artefacts" value={fullServices} />
        <KPICard label="Coverage" value={`${coverage}%`} />
        <KPICard label="Need Artefacts" value={needsWork} />
      </div>

      {/* Department summary cards */}
      <h3 className="text-sm font-bold text-gray-900 mb-3">
        Coverage by Department
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {deptSummaries.slice(0, showReference ? undefined : 12).map((dept) => (
          <button
            key={dept.key}
            onClick={() =>
              setActiveDept(
                activeDept === dept.key ? null : dept.key,
              )
            }
            className={`text-left p-4 rounded-xl border transition-all ${
              activeDept === dept.key
                ? "border-govuk-blue bg-blue-50 shadow-sm"
                : "border-studio-border bg-white hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">
                {dept.department}
              </span>
              <span className="text-xs font-bold text-gray-400">
                {dept.total} services
              </span>
            </div>

            {/* Coverage bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${dept.coverage}%`,
                  backgroundColor: getDeptColor(dept.department),
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                <span
                  className="font-bold"
                  style={{ color: getDeptColor(dept.department) }}
                >
                  {dept.full}
                </span>{" "}
                full
                {dept.catalogue > 0 && (
                  <>
                    {" / "}
                    <span className="font-bold text-gray-400">
                      {dept.catalogue}
                    </span>{" "}
                    catalogue
                  </>
                )}
              </span>
              <span className="font-bold">{dept.coverage}%</span>
            </div>

            {dept.demoCount > 0 && (
              <div className="mt-1.5 text-[10px] text-purple-600 font-semibold">
                {dept.demoCount} demo-critical service
                {dept.demoCount !== 1 ? "s" : ""}
              </div>
            )}
          </button>
        ))}
      </div>

      {deptSummaries.length > 12 && !showReference && (
        <button
          onClick={() => setShowReference(true)}
          className="text-sm text-studio-accent hover:underline mb-6 block"
        >
          Show all {deptSummaries.length} departments
        </button>
      )}

      {/* Active department detail */}
      {activeDept && (
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-sm font-bold text-gray-900">
            Showing: {activeDept}
          </h3>
          <button
            onClick={() => setActiveDept(null)}
            className="text-xs text-studio-accent hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Toggle reference services */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showReference}
            onChange={(e) => setShowReference(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show guides and reference material ({
            services.filter((s) => s.priority === "reference").length
          })
        </label>
      </div>

      {/* Service table */}
      <div className="border border-studio-border rounded-xl bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-studio-border bg-gray-50">
              <th className="text-left py-3 px-4 text-sm font-semibold">
                Service
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold">
                Dept
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold">
                Source
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold">
                Policy
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold">
                States
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold">
                Consent
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-studio-border">
            {tableServices.map((service) => (
              <tr
                key={service.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {service.source === "catalogue" && service.govuk_url ? (
                      <a
                        href={service.govuk_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-studio-accent font-medium hover:underline"
                      >
                        {service.name}
                      </a>
                    ) : (
                      <a
                        href={`/services/${encodeURIComponent(service.id)}`}
                        className="text-studio-accent font-medium hover:underline"
                      >
                        {service.name}
                      </a>
                    )}
                    {service.priority === "demo" && (
                      <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-purple-100 text-purple-700">
                        Demo
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {service.department}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      service.source === "catalogue"
                        ? "bg-gray-100 text-gray-500"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {service.source === "catalogue"
                      ? "Cat"
                      : "Full"}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {service.source === "catalogue" ? (
                    <span className="text-gray-300">—</span>
                  ) : service.hasPolicy ? (
                    <span className="text-green-600">&#10003;</span>
                  ) : (
                    <span className="text-red-600">&#10007;</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {service.source === "catalogue" ? (
                    <span className="text-gray-300">—</span>
                  ) : service.hasStateModel ? (
                    <span className="text-green-600">&#10003;</span>
                  ) : (
                    <span className="text-red-600">&#10007;</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {service.source === "catalogue" ? (
                    <span className="text-gray-300">—</span>
                  ) : service.hasConsent ? (
                    <span className="text-green-600">&#10003;</span>
                  ) : (
                    <span className="text-red-600">&#10007;</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {service.source === "catalogue" ? (
                    <span className="text-xs text-gray-400 font-medium">
                      Not started
                    </span>
                  ) : service.completeness === 100 ? (
                    <span className="text-xs text-green-700 font-bold">
                      Complete
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700 font-bold">
                      {service.completeness}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tableServices.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No services match the current filters.
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        {tableServices.length} of {services.length} services shown.
        {!showReference &&
          ` ${services.filter((s) => s.priority === "reference").length} reference/guide services hidden.`}
      </p>
    </div>
  );
}
