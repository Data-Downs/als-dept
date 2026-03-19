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
  source?: "full" | "graph" | "catalogue";
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
  graphCount: number;
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
        graphCount: group.filter((s) => s.source === "graph").length,
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
        graphCount: unknownGroup.filter((s) => s.source === "graph").length,
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
                      <span>Graph: {s.graphCount}</span>
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

// AllServicesDashboard removed — operational metrics belong on the evidence page

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "full" | "graph" | "catalogue"
  >("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [typologyFilter, setTypologyFilter] = useState<string>("all");
  const [lifeEventFilter, setLifeEventFilter] = useState<string>("all");
  const [lifeEvents, setLifeEvents] = useState<LifeEventFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    succeeded: number;
    failed: number;
  } | null>(null);

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
  const graphCount = services.filter((s) => s.source === "graph").length;
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

  const handleBatchGenerate = useCallback(async () => {
    if (
      !window.confirm(
        "Generate artefacts for up to 10 graph-only services? This uses the LLM API and may take a few minutes.",
      )
    )
      return;
    setBatchGenerating(true);
    setBatchResult(null);
    try {
      const res = await fetch("/api/v1/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });
      if (res.ok) {
        const data = await res.json();
        setBatchResult({ succeeded: data.succeeded, failed: data.failed });
        // Refresh service list
        const refreshed = await fetch("/api/services").then((r) => r.json());
        setServices(refreshed.services || []);
      } else {
        alert("Batch generation failed");
      }
    } catch {
      alert("Batch generation failed");
    } finally {
      setBatchGenerating(false);
    }
  }, []);

  const graphOnlyCount = services.filter(
    (s) => s.source === "graph" && s.govuk_url,
  ).length;

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
        subtitle={`${services.length} service(s) registered — ${fullCount} full, ${graphCount} from graph.`}
        actions={
          <div className="flex gap-2">
            {graphOnlyCount > 0 && (
              <button
                onClick={handleBatchGenerate}
                disabled={batchGenerating}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {batchGenerating
                  ? "Generating..."
                  : `Generate missing (${graphOnlyCount})`}
              </button>
            )}
            <a
              href="/services/new"
              className="bg-govuk-green text-white px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90"
            >
              + Create new service
            </a>
          </div>
        }
      />

      {batchResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm">
          Batch complete: {batchResult.succeeded} succeeded,{" "}
          {batchResult.failed} failed.
          <button
            onClick={() => setBatchResult(null)}
            className="ml-2 text-green-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}


      {/* Typology Dashboard — collapsible summary */}
      <TypologyDashboard
        services={services}
        activeType={typologyFilter}
        onSelectType={(type) =>
          setTypologyFilter((prev) => (prev === type ? "all" : type))
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Source filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Source:</span>
          {(["all", "full", "graph", "catalogue"] as const).map((f) => {
            const count =
              f === "all"
                ? services.length
                : f === "full"
                  ? fullCount
                  : f === "graph"
                    ? graphCount
                    : catalogueCount;
            const label =
              f === "all"
                ? "All"
                : f === "full"
                  ? "Full"
                  : f === "graph"
                    ? "Graph"
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

      <div className="space-y-4">
        {govServices.map((service) => (
          <div
            key={service.id}
            className="border border-studio-border rounded-xl bg-white hover:shadow-sm transition-shadow"
          >
            <a
              href={`/services/${encodeURIComponent(service.id)}`}
              className="block p-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold">{service.name}</h2>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        service.source === "catalogue"
                          ? "bg-gray-100 text-gray-600"
                          : (service.source || "full") === "full"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {service.source === "catalogue"
                        ? "Catalogue"
                        : (service.source || "full") === "full"
                          ? "Full"
                          : "Graph"}
                    </span>
                    {service.priority === "demo" && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                        Demo
                      </span>
                    )}
                    {service.interactionType && (
                      <span className="text-[10px] font-medium text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded uppercase">
                        {service.interactionType.replace(/_/g, " ")}
                      </span>
                    )}
                    {service.generatedAt && (
                      <span
                        className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded"
                        title={service.generatedAt}
                      >
                        Generated
                      </span>
                    )}
                    {service.serviceType &&
                      TYPOLOGY_CONFIG[service.serviceType] && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPOLOGY_CONFIG[service.serviceType].bgColor} ${TYPOLOGY_CONFIG[service.serviceType].color}`}
                        >
                          {TYPOLOGY_CONFIG[service.serviceType].icon}{" "}
                          {TYPOLOGY_CONFIG[service.serviceType].label}
                        </span>
                      )}
                    {service.serviceType &&
                      !service.interactionType &&
                      !TYPOLOGY_CONFIG[service.serviceType] && (
                        <span className="text-[10px] font-medium text-gray-500 uppercase">
                          {service.serviceType}
                        </span>
                      )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {service.department}
                  </p>
                  <p className="text-sm mt-2 text-gray-700">
                    {service.description}
                  </p>
                </div>
                {(service.source || "full") === "full" && (
                  <div className="text-right">
                    <div className="text-3xl font-light tracking-tight">
                      {service.completeness}%
                    </div>
                    <div className="text-xs text-gray-500">complete</div>
                    {service.gapCount > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        {service.gapCount} gap(s)
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                {(service.source || "full") === "full" ? (
                  <>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      Manifest
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        service.hasPolicy
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      Policy {service.hasPolicy ? "" : "(missing)"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        service.hasStateModel
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      State Model {service.hasStateModel ? "" : "(missing)"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        service.hasConsent
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      Consent {service.hasConsent ? "" : "(missing)"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Eligibility data
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      GOV.UK link
                    </span>
                  </>
                )}
              </div>
            </a>

            {/* Action bar */}
            <div className="border-t border-studio-border px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(service.source || "full") === "full" ? (
                  <>
                    <a
                      href={`/services/${encodeURIComponent(service.id)}/ledger`}
                      className="text-sm font-semibold text-studio-accent hover:underline"
                    >
                      View ledger
                    </a>
                    <span className="text-gray-300">|</span>
                    <a
                      href={`/services/${encodeURIComponent(service.id)}/edit`}
                      className="text-sm font-semibold text-studio-accent hover:underline"
                    >
                      Edit service
                    </a>
                    <span className="text-gray-300">|</span>
                    <a
                      href={`/services/${encodeURIComponent(service.id)}`}
                      className="text-sm font-semibold text-red-600 hover:underline"
                    >
                      Delete
                    </a>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {service.source === "catalogue"
                        ? "Catalogue — no artefacts yet"
                        : "Graph-only — needs artefacts for full integration"}
                    </span>
                    {service.govuk_url && (
                      <>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            generateService(service.id);
                          }}
                          disabled={generatingId === service.id}
                          className="text-sm font-semibold text-purple-600 hover:underline disabled:opacity-50"
                        >
                          {generatingId === service.id
                            ? "Generating..."
                            : "Generate"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {(service.source || "full") === "full" && (
                  <>
                    <span className="text-sm text-gray-500">
                      {service.promoted ? (
                        <span className="text-green-700 font-medium">
                          Promoted
                        </span>
                      ) : (
                        "Not promoted"
                      )}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        togglePromote(service.id);
                      }}
                      disabled={togglingId === service.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                        service.promoted ? "bg-green-600" : "bg-gray-300"
                      } ${togglingId === service.id ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                      aria-label={`${service.promoted ? "Remove" : "Add"} ${service.name} from citizen dashboard`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          service.promoted ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
