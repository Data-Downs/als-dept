"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { PlanTemplate } from "@als/schemas";
import PlanForm from "@/components/forms/PlanForm";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export default function EditPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<PlanTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/plans/${encodeURIComponent(planId)}`)
      .then((r) => r.json())
      .then(setPlan)
      .catch(() => setError("Failed to load plan"));
  }, [planId]);

  async function handleSubmit(updated: PlanTemplate) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/plans/${encodeURIComponent(planId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      router.push(`/plans/${encodeURIComponent(planId)}`);
    } else {
      const e = await res.json();
      setError(e.error || "Failed to update plan");
      setSubmitting(false);
    }
  }

  if (!plan) {
    return (
      <div className="text-center py-12 text-gray-500">
        {error || "Loading plan..."}
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Plans", href: "/plans" },
          { label: plan.name, href: `/plans/${encodeURIComponent(planId)}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader title={`Edit: ${plan.name}`} />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}
      <PlanForm
        initialData={plan}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        isSubmitting={submitting}
      />
    </div>
  );
}
