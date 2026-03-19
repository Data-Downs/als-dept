"use client";

import { useState, useMemo } from "react";
import Section from "./Section";
import { DEPARTMENTS } from "@als/personal-data";
import type { DepartmentCode } from "@als/personal-data";

interface FieldSourceAttribution {
  source: string;
  tier: string;
  topic: string;
}

interface Props {
  fieldSources: Record<string, FieldSourceAttribution>;
  onChange: (updated: Record<string, FieldSourceAttribution>) => void;
}

const ALL_SOURCES = [
  "HMRC",
  "DWP",
  "Home Office",
  "HM Passport Office",
  "DVLA",
  "DVSA",
  "DfE",
  "SLC",
  "HMPPS",
  "HMCTS",
  "DBS",
  "LAA",
  "NHS",
  "Companies House",
  "Local Authority",
  "General Register Office",
  "GDS",
  "GOV.UK App",
  "User",
  "Agent inference",
  "UCAS",
];

const TIER_OPTIONS = ["verified", "submitted", "inferred"];

const TOPIC_OPTIONS = [
  "identity",
  "finance",
  "employment",
  "health",
  "disability",
  "education",
  "immigration",
  "justice",
  "driving",
  "parenting",
  "housing",
  "business",
  "legal",
  "general",
];

function getSourceColour(source: string): string {
  const dept = DEPARTMENTS.find((d) => d.code === source || d.name === source);
  if (dept) return dept.color;
  switch (source) {
    case "HMPPS":
    case "HMCTS":
    case "LAA":
      return "#912b88";
    case "NHS":
      return "#005eb8";
    case "DBS":
      return "#d4351c";
    case "General Register Office":
      return "#505a5f";
    case "User":
      return "#0b0c0c";
    case "Agent inference":
      return "#b58900";
    case "SLC":
    case "UCAS":
      return "#f47738";
    case "Companies House":
      return "#00703c";
    default:
      return "#505a5f";
  }
}

function getTierBadge(tier: string) {
  switch (tier) {
    case "verified":
      return "bg-green-100 text-green-800";
    case "submitted":
      return "bg-blue-100 text-blue-800";
    case "inferred":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function formatFieldPath(path: string): string {
  return path
    .replace(/\./g, " \u203A ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export default function DataSourcesSection({ fieldSources, onChange }: Props) {
  const [viewMode, setViewMode] = useState<"by-source" | "by-field">(
    "by-source",
  );
  const [editingField, setEditingField] = useState<string | null>(null);

  // Group fields by source
  const bySource = useMemo(() => {
    const groups: Record<string, Array<{ path: string; attr: FieldSourceAttribution }>> = {};
    for (const [path, attr] of Object.entries(fieldSources)) {
      const src = attr.source;
      if (!groups[src]) groups[src] = [];
      groups[src].push({ path, attr });
    }
    // Sort groups by size (largest first)
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [fieldSources]);

  // Group fields by topic
  const byTopic = useMemo(() => {
    const groups: Record<string, Array<{ path: string; attr: FieldSourceAttribution }>> = {};
    for (const [path, attr] of Object.entries(fieldSources)) {
      const topic = attr.topic;
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push({ path, attr });
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [fieldSources]);

  function updateField(
    path: string,
    key: "source" | "tier" | "topic",
    value: string,
  ) {
    const updated = { ...fieldSources };
    updated[path] = { ...updated[path], [key]: value };
    onChange(updated);
  }

  const selectClass =
    "border border-studio-border rounded px-2 py-1 text-xs focus:outline-none focus:border-studio-accent bg-white";

  return (
    <Section
      title={`Data Sources (${Object.keys(fieldSources).length} fields)`}
      defaultOpen
    >
      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode("by-source")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            viewMode === "by-source"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          By source
        </button>
        <button
          onClick={() => setViewMode("by-field")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            viewMode === "by-field"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          By field
        </button>
      </div>

      {viewMode === "by-source" ? (
        <div className="space-y-4">
          {bySource.map(([source, fields]) => (
            <div key={source}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: getSourceColour(source) }}
                />
                <h4 className="text-sm font-bold">{source}</h4>
                <span className="text-xs text-gray-400">
                  {fields.length} field{fields.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="bg-white rounded-lg border border-studio-border divide-y divide-gray-100">
                {fields.map(({ path, attr }) => (
                  <div key={path} className="px-3 py-2">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex-1 font-mono text-xs text-gray-700 truncate">
                        {path}
                      </span>
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${getTierBadge(attr.tier)}`}
                      >
                        {attr.tier}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400">
                        {attr.topic}
                      </span>
                      <button
                        onClick={() =>
                          setEditingField(editingField === path ? null : path)
                        }
                        className="shrink-0 text-xs text-studio-accent hover:underline"
                      >
                        {editingField === path ? "done" : "edit"}
                      </button>
                    </div>
                    {editingField === path && (
                      <div className="flex gap-3 mt-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                            Source
                          </label>
                          <select
                            className={selectClass}
                            value={attr.source}
                            onChange={(e) =>
                              updateField(path, "source", e.target.value)
                            }
                          >
                            {ALL_SOURCES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                            Tier
                          </label>
                          <select
                            className={selectClass}
                            value={attr.tier}
                            onChange={(e) =>
                              updateField(path, "tier", e.target.value)
                            }
                          >
                            {TIER_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                            Topic
                          </label>
                          <select
                            className={selectClass}
                            value={attr.topic}
                            onChange={(e) =>
                              updateField(path, "topic", e.target.value)
                            }
                          >
                            {TOPIC_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-studio-border divide-y divide-gray-100">
          {Object.entries(fieldSources)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([path, attr]) => (
              <div key={path} className="px-3 py-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex-1 font-mono text-xs text-gray-700 truncate">
                    {path}
                  </span>
                  <span
                    className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: getSourceColour(attr.source) }}
                  >
                    {attr.source}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${getTierBadge(attr.tier)}`}
                  >
                    {attr.tier}
                  </span>
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {attr.topic}
                  </span>
                  <button
                    onClick={() =>
                      setEditingField(editingField === path ? null : path)
                    }
                    className="shrink-0 text-xs text-studio-accent hover:underline"
                  >
                    {editingField === path ? "done" : "edit"}
                  </button>
                </div>
                {editingField === path && (
                  <div className="flex gap-3 mt-2 ml-0">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                        Source
                      </label>
                      <select
                        className={selectClass}
                        value={attr.source}
                        onChange={(e) =>
                          updateField(path, "source", e.target.value)
                        }
                      >
                        {ALL_SOURCES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                        Tier
                      </label>
                      <select
                        className={selectClass}
                        value={attr.tier}
                        onChange={(e) =>
                          updateField(path, "tier", e.target.value)
                        }
                      >
                        {TIER_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                        Topic
                      </label>
                      <select
                        className={selectClass}
                        value={attr.topic}
                        onChange={(e) =>
                          updateField(path, "topic", e.target.value)
                        }
                      >
                        {TOPIC_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </Section>
  );
}
