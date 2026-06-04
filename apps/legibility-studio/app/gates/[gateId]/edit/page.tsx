"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { DecisionGateDefinition } from "@als/schemas";
import GateForm from "@/components/forms/GateForm";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export default function EditGatePage({
  params,
}: {
  params: Promise<{ gateId: string }>;
}) {
  const { gateId } = use(params);
  const router = useRouter();
  const [gate, setGate] = useState<DecisionGateDefinition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/gates/${encodeURIComponent(gateId)}`)
      .then((r) => r.json())
      .then((d) => setGate(d.error ? null : d))
      .catch(() => setError("Failed to load gate"));
  }, [gateId]);

  async function handleSubmit(updated: DecisionGateDefinition) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/gates/${encodeURIComponent(gateId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      router.push("/gates");
    } else {
      const e = await res.json();
      setError(e.error || "Failed to update gate");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete gate "${gateId}"?`)) return;
    const res = await fetch(`/api/gates/${encodeURIComponent(gateId)}`, {
      method: "DELETE",
    });
    if (res.ok) router.push("/gates");
  }

  if (!gate) {
    return (
      <div className="text-center py-12 text-gray-500">
        {error || "Loading gate..."}
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Gates", href: "/gates" },
          { label: gate.id },
        ]}
      />
      <div className="flex justify-between items-start mb-2">
        <PageHeader title={`Edit gate: ${gate.id}`} />
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-700 shrink-0"
        >
          Delete
        </button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}
      <GateForm
        initialData={gate}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        isSubmitting={submitting}
      />
    </div>
  );
}
