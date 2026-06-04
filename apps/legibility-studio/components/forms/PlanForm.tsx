"use client";

import { useState, useEffect } from "react";
import FormField from "./FormField";
import DynamicList from "./DynamicList";
import type {
  PlanTemplate,
  PlanEdge,
  PlanSharedField,
  PlanRelevanceRule,
  PlanFreshness,
  PlanAssembly,
  LayerPosture,
} from "@als/schemas";

interface ServiceOption {
  id: string;
  name: string;
}
interface GateOption {
  id: string;
  question: string;
}

function emptyPlan(): PlanTemplate {
  return {
    id: "",
    version: "1.0.0",
    name: "",
    icon: "",
    description: "",
    entryServiceIds: [],
    membership: { mode: "graph-traversal" },
    edges: [],
    attachedGateIds: [],
    sharedFields: [],
    relevanceRules: [],
    settings: { freshness: "hybrid", assembly: "hybrid" },
    posture: {
      administration: "probabilistic-with-audit",
      orchestration: "deterministic",
    },
  };
}

const inputClass =
  "w-full border border-studio-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-studio-accent";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-studio-border rounded-xl bg-white mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-50 rounded-t-xl"
      >
        <div>
          <span className="font-bold text-sm">{title}</span>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
        <span className="text-xs text-gray-500">{open ? "Collapse" : "Expand"}</span>
      </button>
      {open && (
        <div className="border-t border-studio-border p-4">{children}</div>
      )}
    </div>
  );
}

export default function PlanForm({
  initialData,
  isNew = false,
  onSubmit,
  submitLabel = "Save plan",
  isSubmitting = false,
}: {
  initialData?: PlanTemplate;
  isNew?: boolean;
  onSubmit: (plan: PlanTemplate) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}) {
  const [form, setForm] = useState<PlanTemplate>(initialData || emptyPlan());
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [gates, setGates] = useState<GateOption[]>([]);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) =>
        setServices(
          (d.services || []).map((s: ServiceOption) => ({
            id: s.id,
            name: s.name,
          })),
        ),
      )
      .catch(() => {});
    fetch("/api/gates")
      .then((r) => r.json())
      .then((d) => setGates(d.gates || []))
      .catch(() => {});
  }, []);

  function set<K extends keyof PlanTemplate>(key: K, value: PlanTemplate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <datalist id="plan-service-ids">
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </datalist>

      <Section title="Identity">
        {isNew && (
          <FormField label="Plan ID" required hint="Slug, e.g. bereavement">
            <input
              className={inputClass}
              value={form.id}
              onChange={(e) =>
                set(
                  "id",
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                )
              }
            />
          </FormField>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <FormField label="Name" required>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </FormField>
          <FormField label="Icon" hint="emoji">
            <input
              className={`${inputClass} w-20`}
              value={form.icon}
              onChange={(e) => set("icon", e.target.value)}
            />
          </FormField>
        </div>
        <FormField label="Description">
          <textarea
            className={inputClass}
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </FormField>
      </Section>

      <Section
        title="Entry services"
        description="Where a citizen starts this plan."
      >
        <DynamicList
          items={form.entryServiceIds}
          onAdd={() => set("entryServiceIds", [...form.entryServiceIds, ""])}
          onRemove={(i) =>
            set(
              "entryServiceIds",
              form.entryServiceIds.filter((_, idx) => idx !== i),
            )
          }
          onChange={(i, item) =>
            set(
              "entryServiceIds",
              form.entryServiceIds.map((s, idx) => (idx === i ? item : s)),
            )
          }
          addLabel="Add entry service"
          renderItem={(id, _i, onChange) => (
            <input
              className={`${inputClass} pr-16`}
              list="plan-service-ids"
              value={id}
              placeholder="service id"
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        />
      </Section>

      <Section
        title="Dependencies"
        description="REQUIRES = hard prerequisite (locks the dependent); ENABLES = soft surfacing."
      >
        <DynamicList
          items={form.edges}
          onAdd={() =>
            set("edges", [...form.edges, { from: "", to: "", type: "ENABLES" }])
          }
          onRemove={(i) =>
            set(
              "edges",
              form.edges.filter((_, idx) => idx !== i),
            )
          }
          onChange={(i, item) =>
            set(
              "edges",
              form.edges.map((e, idx) => (idx === i ? item : e)),
            )
          }
          addLabel="Add dependency"
          renderItem={(edge: PlanEdge, _i, onChange) => (
            <div className="grid grid-cols-3 gap-2 pr-12">
              <input
                className={inputClass}
                list="plan-service-ids"
                value={edge.from}
                placeholder="from"
                onChange={(e) => onChange({ ...edge, from: e.target.value })}
              />
              <input
                className={inputClass}
                list="plan-service-ids"
                value={edge.to}
                placeholder="to"
                onChange={(e) => onChange({ ...edge, to: e.target.value })}
              />
              <select
                className={inputClass}
                value={edge.type}
                onChange={(e) =>
                  onChange({
                    ...edge,
                    type: e.target.value as PlanEdge["type"],
                  })
                }
              >
                <option value="ENABLES">ENABLES</option>
                <option value="REQUIRES">REQUIRES</option>
              </select>
            </div>
          )}
        />
      </Section>

      <Section
        title="Decision gates"
        description="Routing questions attached to this plan."
      >
        {gates.length === 0 ? (
          <p className="text-sm text-gray-500">
            No gates defined yet. Author gates under Gates first.
          </p>
        ) : (
          <div className="space-y-1.5">
            {gates.map((g) => (
              <label key={g.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.attachedGateIds.includes(g.id)}
                  onChange={(e) =>
                    set(
                      "attachedGateIds",
                      e.target.checked
                        ? [...form.attachedGateIds, g.id]
                        : form.attachedGateIds.filter((id) => id !== g.id),
                    )
                  }
                />
                <span>
                  <span className="font-mono text-xs text-gray-500">{g.id}</span>
                  <br />
                  {g.question}
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Shared fields"
        description="Collected once, reused across the plan's services."
      >
        <DynamicList
          items={form.sharedFields}
          onAdd={() =>
            set("sharedFields", [
              ...form.sharedFields,
              { canonicalKey: "", label: "", neededBy: [] },
            ])
          }
          onRemove={(i) =>
            set(
              "sharedFields",
              form.sharedFields.filter((_, idx) => idx !== i),
            )
          }
          onChange={(i, item) =>
            set(
              "sharedFields",
              form.sharedFields.map((f, idx) => (idx === i ? item : f)),
            )
          }
          addLabel="Add shared field"
          renderItem={(field: PlanSharedField, _i, onChange) => (
            <div className="grid grid-cols-2 gap-2 pr-12">
              <input
                className={inputClass}
                value={field.canonicalKey}
                placeholder="canonical key"
                onChange={(e) =>
                  onChange({ ...field, canonicalKey: e.target.value })
                }
              />
              <input
                className={inputClass}
                value={field.label}
                placeholder="label"
                onChange={(e) => onChange({ ...field, label: e.target.value })}
              />
            </div>
          )}
        />
      </Section>

      <Section
        title="Relevance rules"
        description="Skip a service when a persona fact matches."
      >
        <DynamicList
          items={form.relevanceRules}
          onAdd={() =>
            set("relevanceRules", [
              ...form.relevanceRules,
              {
                serviceId: "",
                skipIf: { field: "", operator: "==", value: "" },
                reason: "",
              },
            ])
          }
          onRemove={(i) =>
            set(
              "relevanceRules",
              form.relevanceRules.filter((_, idx) => idx !== i),
            )
          }
          onChange={(i, item) =>
            set(
              "relevanceRules",
              form.relevanceRules.map((r, idx) => (idx === i ? item : r)),
            )
          }
          addLabel="Add relevance rule"
          renderItem={(rule: PlanRelevanceRule, _i, onChange) => (
            <div className="space-y-2 pr-12">
              <input
                className={inputClass}
                list="plan-service-ids"
                value={rule.serviceId}
                placeholder="service id to skip"
                onChange={(e) =>
                  onChange({ ...rule, serviceId: e.target.value })
                }
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className={inputClass}
                  value={rule.skipIf.field}
                  placeholder="fact"
                  onChange={(e) =>
                    onChange({
                      ...rule,
                      skipIf: { ...rule.skipIf, field: e.target.value },
                    })
                  }
                />
                <input
                  className={inputClass}
                  value={rule.skipIf.operator}
                  placeholder="operator"
                  onChange={(e) =>
                    onChange({
                      ...rule,
                      skipIf: { ...rule.skipIf, operator: e.target.value },
                    })
                  }
                />
                <input
                  className={inputClass}
                  value={String(rule.skipIf.value ?? "")}
                  placeholder="value"
                  onChange={(e) =>
                    onChange({
                      ...rule,
                      skipIf: { ...rule.skipIf, value: e.target.value },
                    })
                  }
                />
              </div>
              <input
                className={inputClass}
                value={rule.reason}
                placeholder="reason shown to citizen"
                onChange={(e) => onChange({ ...rule, reason: e.target.value })}
              />
            </div>
          )}
        />
      </Section>

      <Section
        title="Settings (plastic to policy)"
        description="The two published dials governing this plan."
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Freshness"
            hint="How the published structure relates to the live graph"
          >
            <select
              className={inputClass}
              value={form.settings.freshness}
              onChange={(e) =>
                set("settings", {
                  ...form.settings,
                  freshness: e.target.value as PlanFreshness,
                })
              }
            >
              <option value="hybrid">Hybrid (frozen structure, live status)</option>
              <option value="frozen">Frozen</option>
              <option value="live">Live</option>
            </select>
          </FormField>
          <FormField
            label="Assembly"
            hint="How a citizen's plan is composed"
          >
            <select
              className={inputClass}
              value={form.settings.assembly}
              onChange={(e) =>
                set("settings", {
                  ...form.settings,
                  assembly: e.target.value as PlanAssembly,
                })
              }
            >
              <option value="hybrid">Hybrid (agent + verifiable credentials)</option>
              <option value="authored">Authored (deterministic)</option>
              <option value="agent">Agent-assembled (probabilistic)</option>
            </select>
          </FormField>
        </div>
      </Section>

      <Section
        title="Posture / depth"
        description="How far down the seven layers agentic operation is permitted. Layers 5–7 are always deterministic; layer 4 is always the citizen's."
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Administration (layer 2)">
            <select
              className={inputClass}
              value={form.posture.administration}
              onChange={(e) =>
                set("posture", {
                  ...form.posture,
                  administration: e.target.value as LayerPosture,
                })
              }
            >
              <option value="probabilistic-with-audit">
                Probabilistic with audit
              </option>
              <option value="deterministic">Deterministic</option>
            </select>
          </FormField>
          <FormField label="Orchestration (layer 3)">
            <select
              className={inputClass}
              value={form.posture.orchestration}
              onChange={(e) =>
                set("posture", {
                  ...form.posture,
                  orchestration: e.target.value as LayerPosture,
                })
              }
            >
              <option value="deterministic">Deterministic</option>
              <option value="probabilistic-with-audit">
                Probabilistic with audit
              </option>
            </select>
          </FormField>
        </div>
      </Section>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-govuk-green text-white px-6 py-2 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        <a
          href="/plans"
          className="px-6 py-2 rounded-lg border border-studio-border text-sm hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
