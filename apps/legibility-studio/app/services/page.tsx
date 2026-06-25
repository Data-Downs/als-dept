"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import KPICard from "@/components/ui/KPICard";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

interface Service {
  id: string;
  name: string;
  department: string;
  description: string;
  hasPolicy: boolean;
  hasStateModel: boolean;
  hasConsent: boolean;
  promoted: boolean;
  completeness: number;
  gapCount: number;
  source?: "full" | "catalogue";
  serviceType?: string;
  govuk_url?: string;
  generatedAt?: string;
  interactionType?: string;
  priority?: "demo" | "transactional" | "reference";
  channels?: { online: boolean; phone: boolean; email: boolean; letter: boolean; inperson: boolean; form: boolean };
}

// ── Typology configuration ──

const TYPOLOGY_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
  }
> = {
  benefit: {
    label: "Benefit",
    color: "text-green-800",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: "£",
  },
  entitlement: {
    label: "Entitlement",
    color: "text-emerald-800",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: "✓",
  },
  obligation: {
    label: "Obligation",
    color: "text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: "!",
  },
  registration: {
    label: "Registration",
    color: "text-blue-800",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: "R",
  },
  application: {
    label: "Application",
    color: "text-indigo-800",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    icon: "A",
  },
  document: {
    label: "Document",
    color: "text-amber-800",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: "D",
  },
  legal_process: {
    label: "Legal Process",
    color: "text-purple-800",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: "§",
  },
  grant: {
    label: "Grant",
    color: "text-teal-800",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    icon: "G",
  },
};

interface TypologySummary {
  type: string;
  config: (typeof TYPOLOGY_CONFIG)[string];
  count: number;
  fullCount: number;
  withPolicy: number;
  withStateModel: number;
  withConsent: number;
}

function TypologyDashboard({
  services,
  onSelectType,
  activeType,
}: {
  services: Service[];
  onSelectType: (type: string) => void;
  activeType: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const summaries = useMemo(() => {
    const grouped: Record<string, Service[]> = {};
    for (const s of services) {
      const type = s.serviceType || "unknown";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(s);
    }

    const result: TypologySummary[] = [];
    for (const [type, config] of Object.entries(TYPOLOGY_CONFIG)) {
      const group = grouped[type] || [];
      result.push({
        type,
        config,
        count: group.length,
        fullCount: group.filter((s) => (s.source || "full") === "full").length,
        withPolicy: group.filter((s) => s.hasPolicy).length,
        withStateModel: group.filter((s) => s.hasStateModel).length,
        withConsent: group.filter((s) => s.hasConsent).length,
      });
    }

    const unknownGroup = services.filter(
      (s) => !s.serviceType || !TYPOLOGY_CONFIG[s.serviceType],
    );
    if (unknownGroup.length > 0) {
      result.push({
        type: "unknown",
        config: {
          label: "Uncategorised",
          color: "text-gray-800",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          icon: "?",
        },
        count: unknownGroup.length,
        fullCount: unknownGroup.filter((s) => (s.source || "full") === "full")
          .length,
        withPolicy: unknownGroup.filter((s) => s.hasPolicy).length,
        withStateModel: unknownGroup.filter((s) => s.hasStateModel).length,
        withConsent: unknownGroup.filter((s) => s.hasConsent).length,
      });
    }

    return result.sort((a, b) => b.count - a.count);
  }, [services]);

  const activeSummaries = summaries.filter((s) => s.count > 0);

  return (
    <div className="border border-studio-border rounded-xl bg-white mb-8">
      {/* Compact summary row — always visible */}
      <div className="px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900 shrink-0"
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          Service Typologies
        </button>
        <div className="flex flex-wrap gap-1.5">
          {activeSummaries.map((s) => (
            <button
              key={s.type}
              onClick={() => onSelectType(s.type)}
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                activeType === s.type
                  ? `${s.config.bgColor} ${s.config.borderColor} ${s.config.color} ring-1 ring-offset-1 ring-current`
                  : `${s.config.bgColor} ${s.config.borderColor} ${s.config.color} hover:shadow-sm`
              }`}
            >
              <span>{s.config.icon}</span>
              <span>{s.config.label}</span>
              <span className="font-bold">{s.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expanded detail grid */}
      {expanded && (
        <div className="border-t border-studio-border px-5 py-4">
          <p className="text-xs text-gray-500 mb-3">
            {services.length} services across {activeSummaries.length}{" "}
            typologies. Click a typology to filter.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeSummaries.map((s) => {
              const completeness =
                s.count > 0
                  ? Math.round(
                      ((s.withPolicy + s.withStateModel + s.withConsent) /
                        (s.count * 3)) *
                        100,
                    )
                  : 0;

              return (
                <button
                  key={s.type}
                  onClick={() => onSelectType(s.type)}
                  className={`${s.config.bgColor} ${s.config.borderColor} border rounded-xl p-4 text-left hover:shadow-md transition-shadow ${
                    activeType === s.type
                      ? "ring-2 ring-offset-1 ring-current"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-lg font-bold ${s.config.color}`}>
                      {s.config.icon}
                    </span>
                    <span className={`text-sm font-bold ${s.config.color}`}>
                      {s.config.label}
                    </span>
                  </div>
                  <div className="text-2xl font-light tracking-tight mb-1">
                    {s.count}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Full: {s.fullCount}</span>
                      <span>Catalogue: {s.count - s.fullCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-govuk-green rounded-full transition-all"
                          style={{ width: `${completeness}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium">
                        {completeness}%
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      artefact completeness
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface LifeEventFilter {
  id: string;
  name: string;
  icon: string;
  serviceIds: string[];
}

// ── Compact service table with expandable rows ──

function ServiceTable({
  services,
  generatingId,
  togglingId,
  onGenerate,
  onTogglePromote,
}: {
  services: Service[];
  generatingId: string | null;
  togglingId: string | null;
  onGenerate: (id: string) => void;
  onTogglePromote: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="border border-studio-border rounded-xl bg-white overflow-hidden">
      {/* Header — hidden on mobile */}
      <div className="hidden md:flex items-center border-b border-studio-border bg-gray-50 text-xs font-semibold text-gray-500">
        <div className="flex-1 py-2.5 px-4">Service</div>
        <div className="w-20 py-2.5 px-2 text-center">Source</div>
        <div className="w-14 py-2.5 px-1 text-center">P</div>
        <div className="w-14 py-2.5 px-1 text-center">S</div>
        <div className="w-14 py-2.5 px-1 text-center">C</div>
        <div className="w-20 py-2.5 px-2 text-right">Status</div>
      </div>

      <div className="divide-y divide-studio-border">
        {services.map((service) => {
          const isExpanded = expandedId === service.id;
          const isFull = (service.source || "full") === "full";
          const isCat = service.source === "catalogue";

          return (
            <div key={service.id}>
              {/* Row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : service.id)}
                className="flex items-center w-full text-left hover:bg-gray-50 transition-colors"
              >
                {/* Name + department (stacked on mobile) */}
                <div className="flex-1 py-2.5 px-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <svg
                      className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 truncate">{service.name}</span>
                    {service.priority === "demo" && (
                      <span className="shrink-0 text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-purple-100 text-purple-700">Demo</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 ml-5 truncate block">{service.department}</span>
                </div>

                {/* Source badge */}
                <div className="w-20 py-2.5 px-2 text-center shrink-0">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    isCat ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-800"
                  }`}>
                    {isCat ? "Cat" : "Full"}
                  </span>
                </div>

                {/* Artefact checks — hidden on mobile, shown in expanded instead */}
                <div className="hidden md:block w-14 py-2.5 px-1 text-center shrink-0">
                  {isCat ? <span className="text-gray-300">—</span>
                    : service.hasPolicy ? <span className="text-green-600">&#10003;</span>
                    : <span className="text-red-500">&#10007;</span>}
                </div>
                <div className="hidden md:block w-14 py-2.5 px-1 text-center shrink-0">
                  {isCat ? <span className="text-gray-300">—</span>
                    : service.hasStateModel ? <span className="text-green-600">&#10003;</span>
                    : <span className="text-red-500">&#10007;</span>}
                </div>
                <div className="hidden md:block w-14 py-2.5 px-1 text-center shrink-0">
                  {isCat ? <span className="text-gray-300">—</span>
                    : service.hasConsent ? <span className="text-green-600">&#10003;</span>
                    : <span className="text-red-500">&#10007;</span>}
                </div>

                {/* Status */}
                <div className="w-20 py-2.5 px-2 text-right shrink-0">
                  {isCat ? (
                    <span className="text-[11px] text-gray-400">—</span>
                  ) : service.completeness === 100 ? (
                    <span className="text-[11px] text-green-700 font-bold">100%</span>
                  ) : (
                    <span className="text-[11px] text-amber-700 font-bold">{service.completeness}%</span>
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="bg-gray-50 border-t border-studio-border px-4 md:px-6 py-4">
                  <p className="text-sm text-gray-700 mb-2">{service.description || "No description."}</p>

                  {/* Artefact badges — always visible in expanded (replaces hidden columns on mobile) */}
                  {isFull && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">Manifest</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${service.hasPolicy ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                        Policy{service.hasPolicy ? "" : " missing"}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${service.hasStateModel ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                        States{service.hasStateModel ? "" : " missing"}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${service.hasConsent ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                        Consent{service.hasConsent ? "" : " missing"}
                      </span>
                      {service.serviceType && TYPOLOGY_CONFIG[service.serviceType] && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPOLOGY_CONFIG[service.serviceType].bgColor} ${TYPOLOGY_CONFIG[service.serviceType].color}`}>
                          {TYPOLOGY_CONFIG[service.serviceType].icon} {TYPOLOGY_CONFIG[service.serviceType].label}
                        </span>
                      )}
                      {service.promoted && (
                        <span className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Promoted</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
                    {isFull ? (
                      <>
                        <a href={`/services/${encodeURIComponent(service.id)}`} className="text-xs font-semibold text-studio-accent hover:underline">Details</a>
                        <span className="text-gray-300">|</span>
                        <a href={`/services/${encodeURIComponent(service.id)}/edit`} className="text-xs font-semibold text-studio-accent hover:underline">Edit</a>
                        <span className="text-gray-300">|</span>
                        <a href={`/services/${encodeURIComponent(service.id)}/ledger`} className="text-xs font-semibold text-studio-accent hover:underline">Ledger</a>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => onTogglePromote(service.id)}
                          disabled={togglingId === service.id}
                          className="text-xs font-semibold text-studio-accent hover:underline disabled:opacity-50"
                        >
                          {service.promoted ? "Unpromote" : "Promote"}
                        </button>
                      </>
                    ) : (
                      <>
                        <a href={`/services/${encodeURIComponent(service.id)}`} className="text-xs font-semibold text-studio-accent hover:underline">Open</a>
                        <span className="text-gray-300">|</span>
                        <a href={`/services/${encodeURIComponent(service.id)}/edit`} className="text-xs font-semibold text-studio-accent hover:underline">Edit</a>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-500">No artefacts</span>
                        {service.govuk_url && (
                          <>
                            <span className="text-gray-300">|</span>
                            <a href={service.govuk_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-semibold text-studio-accent hover:underline">GOV.UK</a>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => onGenerate(service.id)}
                              disabled={generatingId === service.id}
                              className="text-xs font-semibold text-purple-600 hover:underline disabled:opacity-50"
                            >
                              {generatingId === service.id ? "Generating..." : "Generate"}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {services.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">No services match the current filters.</div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "full" | "catalogue"
  >("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [typologyFilter, setTypologyFilter] = useState<string>("all");
  const [lifeEventFilter, setLifeEventFilter] = useState<string>("all");
  const [lifeEvents, setLifeEvents] = useState<LifeEventFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((servicesData) => {
        setServices(servicesData.services || []);
        setLifeEvents(servicesData.lifeEvents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const departments = useMemo(() => {
    const depts = new Set(services.map((s) => s.department));
    return [...depts].sort();
  }, [services]);

  const filteredServices = useMemo(() => {
    let filtered = services;
    if (sourceFilter !== "all") {
      filtered = filtered.filter((s) => (s.source || "full") === sourceFilter);
    }
    if (deptFilter !== "all") {
      filtered = filtered.filter((s) => s.department === deptFilter);
    }
    if (typologyFilter !== "all") {
      if (typologyFilter === "unknown") {
        filtered = filtered.filter(
          (s) => !s.serviceType || !TYPOLOGY_CONFIG[s.serviceType],
        );
      } else {
        filtered = filtered.filter((s) => s.serviceType === typologyFilter);
      }
    }
    if (lifeEventFilter !== "all") {
      const le = lifeEvents.find((e) => e.id === lifeEventFilter);
      if (le) {
        const ids = new Set(le.serviceIds);
        filtered = filtered.filter((s) => ids.has(s.id));
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [
    services,
    sourceFilter,
    deptFilter,
    typologyFilter,
    lifeEventFilter,
    lifeEvents,
    searchQuery,
  ]);

  const agentServices = useMemo(
    () => filteredServices.filter((s) => s.department === "Agent"),
    [filteredServices],
  );
  const govServices = useMemo(
    () => filteredServices.filter((s) => s.department !== "Agent"),
    [filteredServices],
  );

  const fullCount = services.filter(
    (s) => (s.source || "full") === "full",
  ).length;
  const catalogueCount = services.filter(
    (s) => s.source === "catalogue",
  ).length;

  const togglePromote = useCallback(async (serviceId: string) => {
    setTogglingId(serviceId);
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId ? { ...s, promoted: !s.promoted } : s,
      ),
    );
    try {
      const res = await fetch(
        `/api/services/${encodeURIComponent(serviceId)}/promote`,
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === serviceId ? { ...s, promoted: !s.promoted } : s,
          ),
        );
      }
    } catch {
      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId ? { ...s, promoted: !s.promoted } : s,
        ),
      );
    } finally {
      setTogglingId(null);
    }
  }, []);

  const generateService = useCallback(async (serviceId: string) => {
    setGeneratingId(serviceId);
    try {
      const res = await fetch(
        `/api/services/${encodeURIComponent(serviceId)}/generate`,
        { method: "POST" },
      );
      if (res.ok) {
        const data = await res.json();
        setServices((prev) =>
          prev.map((s) =>
            s.id === serviceId
              ? {
                  ...s,
                  source: "full" as const,
                  hasPolicy: true,
                  hasStateModel: true,
                  hasConsent: true,
                  generatedAt: data.generatedAt,
                  interactionType: data.interactionType,
                }
              : s,
          ),
        );
      } else {
        const err = await res.json();
        alert(err.error || "Generation failed");
      }
    } catch {
      alert("Failed to generate artefacts");
    } finally {
      setGeneratingId(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading services...</div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/" }, { label: "Services" }]}
      />
      <PageHeader
        title="Services"
        subtitle={`${services.length} service(s) registered — ${fullCount} full, ${catalogueCount} catalogue.`}
        actions={
          <a
            href="/services/new"
            className="bg-govuk-green text-white px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90"
          >
            + Create new service
          </a>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Source filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Source:</span>
          {(["all", "full", "catalogue"] as const).map((f) => {
            const count =
              f === "all"
                ? services.length
                : f === "full"
                  ? fullCount
                  : catalogueCount;
            const label =
              f === "all"
                ? "All"
                : f === "full"
                  ? "Full"
                  : "Catalogue";
            return (
              <button
                key={f}
                onClick={() => setSourceFilter(f)}
                className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                  sourceFilter === f
                    ? f === "catalogue"
                      ? "bg-gray-700 text-white border-gray-700"
                      : "bg-govuk-blue text-white border-govuk-blue"
                    : "bg-white text-gray-600 border-gray-300 hover:border-govuk-blue"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* Typology filter */}
        <select
          value={typologyFilter}
          onChange={(e) => setTypologyFilter(e.target.value)}
          className={`text-sm border rounded-lg px-2.5 py-1 ${
            typologyFilter !== "all"
              ? "border-govuk-blue bg-blue-50 font-medium"
              : "border-gray-300"
          }`}
        >
          <option value="all">All typologies</option>
          {Object.entries(TYPOLOGY_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.icon} {cfg.label}
            </option>
          ))}
          <option value="unknown">? Uncategorised</option>
        </select>

        {/* Department filter */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-2.5 py-1"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Life event filter */}
        {lifeEvents.length > 0 && (
          <select
            value={lifeEventFilter}
            onChange={(e) => setLifeEventFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-1"
          >
            <option value="all">All life events</option>
            {lifeEvents.map((le) => (
              <option key={le.id} value={le.id}>
                {le.icon} {le.name} ({le.serviceIds.length})
              </option>
            ))}
          </select>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1 flex-1 min-w-[200px]"
        />

        {/* Active filter indicator */}
        {typologyFilter !== "all" && (
          <button
            onClick={() => setTypologyFilter("all")}
            className="text-xs text-govuk-blue hover:underline flex items-center gap-1"
          >
            ✕ Clear typology filter
          </button>
        )}
      </div>

      {/* Agent Services */}
      {agentServices.length > 0 && (
        <div className="mb-8">
          <div className="sticky top-0 z-10 bg-studio-body/95 backdrop-blur-sm py-3 -mx-1 px-1 mb-4">
            <h2 className="text-2xl font-bold">Agent Services</h2>
          </div>
          <div className="space-y-4">
            {agentServices.map((service) => (
              <div
                key={service.id}
                className="border border-indigo-200 rounded-xl bg-indigo-50/30 hover:shadow-sm transition-shadow"
              >
                <a
                  href={`/services/${encodeURIComponent(service.id)}`}
                  className="block p-5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold">{service.name}</h2>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          Agent
                        </span>
                      </div>
                      <p className="text-sm text-indigo-600 mt-0.5">
                        {service.department}
                      </p>
                      <p className="text-sm mt-2 text-gray-700">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </a>
                <div className="border-t border-indigo-200 px-5 py-3 flex items-center">
                  <a
                    href={`/services/${encodeURIComponent(service.id)}/ledger`}
                    className="text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    View ledger
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GOV Services */}
      {govServices.length > 0 && agentServices.length > 0 && (
        <div className="sticky top-0 z-10 bg-studio-body/95 backdrop-blur-sm py-3 -mx-1 px-1 mb-4">
          <h2 className="text-2xl font-bold">GOV Services</h2>
        </div>
      )}

      <ServiceTable
        services={govServices}
        generatingId={generatingId}
        togglingId={togglingId}
        onGenerate={generateService}
        onTogglePromote={togglePromote}
      />

      <p className="text-xs text-gray-400 mt-4">
        Showing {govServices.length} of {services.length} services.
      </p>
    </div>
  );
}
