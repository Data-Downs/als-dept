"use client";

import { useState, useEffect } from "react";
import FormField from "./FormField";
import DynamicList from "./DynamicList";
import type { DecisionGateDefinition, DecisionGateOption } from "@als/schemas";

interface ServiceOption {
  id: string;
  name: string;
}

function emptyGate(): DecisionGateDefinition {
  return {
    id: "",
    question: "",
    helpText: "",
    sensitive: false,
    options: [],
    context: {},
  };
}

const inputClass =
  "w-full border border-studio-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-studio-accent";

function csv(arr?: string[]) {
  return (arr ?? []).join(", ");
}
function parseCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function GateForm({
  initialData,
  isNew = false,
  onSubmit,
  submitLabel = "Save gate",
  isSubmitting = false,
}: {
  initialData?: DecisionGateDefinition;
  isNew?: boolean;
  onSubmit: (gate: DecisionGateDefinition) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}) {
  const [form, setForm] = useState<DecisionGateDefinition>(
    initialData || emptyGate(),
  );
  const [services, setServices] = useState<ServiceOption[]>([]);

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
  }, []);

  function set<K extends keyof DecisionGateDefinition>(
    key: K,
    value: DecisionGateDefinition[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <datalist id="gate-service-ids">
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </datalist>

      {isNew && (
        <FormField label="Gate ID" required hint="e.g. bereavement-has-will">
          <input
            className={inputClass}
            value={form.id}
            onChange={(e) =>
              set("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
            }
          />
        </FormField>
      )}
      <FormField label="Question" required>
        <input
          className={inputClass}
          value={form.question}
          onChange={(e) => set("question", e.target.value)}
        />
      </FormField>
      <FormField label="Help text">
        <input
          className={inputClass}
          value={form.helpText || ""}
          onChange={(e) => set("helpText", e.target.value)}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Life event ID" hint="context (optional)">
          <input
            className={inputClass}
            value={form.context?.lifeEventId || ""}
            onChange={(e) =>
              set("context", { ...form.context, lifeEventId: e.target.value })
            }
          />
        </FormField>
        <FormField label="Service ID" hint="context (optional)">
          <input
            className={inputClass}
            list="gate-service-ids"
            value={form.context?.serviceId || ""}
            onChange={(e) =>
              set("context", { ...form.context, serviceId: e.target.value })
            }
          />
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-sm mb-4">
        <input
          type="checkbox"
          checked={!!form.sensitive}
          onChange={(e) => set("sensitive", e.target.checked)}
        />
        Sensitive (softens the presentation, e.g. bereavement)
      </label>

      <label className="block text-sm font-bold mb-2">Options</label>
      <DynamicList
        items={form.options}
        onAdd={() =>
          set("options", [
            ...form.options,
            { value: "", label: "", consequence: "", routingEffect: {} },
          ])
        }
        onRemove={(i) =>
          set(
            "options",
            form.options.filter((_, idx) => idx !== i),
          )
        }
        onChange={(i, item) =>
          set(
            "options",
            form.options.map((o, idx) => (idx === i ? item : o)),
          )
        }
        addLabel="Add option"
        renderItem={(opt: DecisionGateOption, _i, onChange) => (
          <div className="space-y-2 pr-12">
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputClass}
                value={opt.value}
                placeholder="value"
                onChange={(e) => onChange({ ...opt, value: e.target.value })}
              />
              <input
                className={inputClass}
                value={opt.label}
                placeholder="label (button text)"
                onChange={(e) => onChange({ ...opt, label: e.target.value })}
              />
            </div>
            <input
              className={inputClass}
              value={opt.consequence || ""}
              placeholder="consequence (feedback after selection)"
              onChange={(e) => onChange({ ...opt, consequence: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputClass}
                list="gate-service-ids"
                value={csv(opt.routingEffect?.enableServices)}
                placeholder="enable services (csv)"
                onChange={(e) =>
                  onChange({
                    ...opt,
                    routingEffect: {
                      ...opt.routingEffect,
                      enableServices: parseCsv(e.target.value),
                    },
                  })
                }
              />
              <input
                className={inputClass}
                list="gate-service-ids"
                value={csv(opt.routingEffect?.skipServices)}
                placeholder="skip services (csv)"
                onChange={(e) =>
                  onChange({
                    ...opt,
                    routingEffect: {
                      ...opt.routingEffect,
                      skipServices: parseCsv(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
        )}
      />

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-govuk-green text-white px-6 py-2 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        <a
          href="/gates"
          className="px-6 py-2 rounded-lg border border-studio-border text-sm hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
