"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanTemplate } from "@als/schemas";
import PlanForm from "@/components/forms/PlanForm";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export default function NewPlanPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(plan: PlanTemplate) {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (res.ok) {
      router.push(`/plans/${encodeURIComponent(plan.id)}`);
    } else {
      const e = await res.json();
      setError(e.error || "Failed to create plan");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Plans", href: "/plans" },
          { label: "New" },
        ]}
      />
      <PageHeader title="New plan" subtitle="Author a cross-service life-event journey." />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}
      <PlanForm
        isNew
        onSubmit={handleSubmit}
        submitLabel="Create plan"
        isSubmitting={submitting}
      />
    </div>
  );
}
