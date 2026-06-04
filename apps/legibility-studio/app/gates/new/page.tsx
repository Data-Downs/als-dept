"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DecisionGateDefinition } from "@als/schemas";
import GateForm from "@/components/forms/GateForm";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export default function NewGatePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(gate: DecisionGateDefinition) {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/gates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...gate, published: true }),
    });
    if (res.ok) {
      router.push("/gates");
    } else {
      const e = await res.json();
      setError(e.error || "Failed to create gate");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Gates", href: "/gates" },
          { label: "New" },
        ]}
      />
      <PageHeader title="New decision gate" />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}
      <GateForm
        isNew
        onSubmit={handleSubmit}
        submitLabel="Create gate"
        isSubmitting={submitting}
      />
    </div>
  );
}
