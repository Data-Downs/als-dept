"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";

const INTERACTION_TYPES = [
  {
    id: "benefit",
    label: "Benefit",
    description: "Citizen seeks financial support; income-assessed",
    examples: "Universal Credit, PIP, Housing Benefit",
  },
  {
    id: "application",
    label: "Application",
    description: "Submit information, receive a decision",
    examples: "Passport, Child Benefit, Blue Badge",
  },
  {
    id: "license",
    label: "Licence",
    description: "Prove permission to do something",
    examples: "Driving licence, fishing licence",
  },
  {
    id: "register",
    label: "Registration",
    description: "Government needs an official list",
    examples: "Voter registration, birth certificate",
  },
  {
    id: "obligation",
    label: "Obligation",
    description: "Something the citizen must do",
    examples: "Update DVLA address, notify OPG of death",
  },
  {
    id: "legal_process",
    label: "Legal process",
    description: "Navigate complexity with professional support",
    examples: "Probate, LPA, divorce",
  },
  {
    id: "portal",
    label: "Portal",
    description: "Access multiple services through one account",
    examples: "UC journal, student loans",
  },
  {
    id: "entitlement",
    label: "Entitlement",
    description: "Claim a right",
    examples: "Statutory maternity pay, free childcare",
  },
  {
    id: "grant",
    label: "Grant",
    description: "Apply for funding",
    examples: "Disabled Facilities Grant",
  },
  {
    id: "payment_service",
    label: "Payment",
    description: "Verify liability and pay",
    examples: "Self-assessment tax",
  },
  {
    id: "appointment_booker",
    label: "Appointment",
    description: "Book a slot after prerequisites",
    examples: "Driving test, prison visit",
  },
  {
    id: "task_list",
    label: "Task list",
    description: "Complete sequential steps",
    examples: "Learn to drive, Access to Work",
  },
  {
    id: "informational_hub",
    label: "Information hub",
    description: "Help the citizen decide what to do",
    examples: "Get into teaching, travel advice",
  },
];

export default function NewServicePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [interactionType, setInteractionType] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name || !department || !interactionType) return;
    setSaving(true);

    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        department,
        interactionType,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/services/${data.id}`);
    } else {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New service"
        subtitle="Select an interaction type to scaffold the service artefacts."
      />

      <div className="max-w-2xl space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Service name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apply for Universal Credit"
            className="w-full border border-publish-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-govuk-blue"
          />
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. DWP"
            className="w-full border border-publish-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-govuk-blue"
          />
        </div>

        {/* Interaction type picker */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Interaction type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INTERACTION_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setInteractionType(t.id)}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  interactionType === t.id
                    ? "border-govuk-blue bg-blue-50"
                    : "border-publish-border bg-white hover:border-gray-300"
                }`}
              >
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {t.description}
                </div>
                <div className="text-xs text-gray-400 mt-1">{t.examples}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={!name || !department || !interactionType || saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-govuk-blue text-white text-sm font-medium rounded-lg hover:bg-govuk-dark-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Creating..." : "Create service"}
        </button>
      </div>
    </div>
  );
}
