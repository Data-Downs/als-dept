"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PlanTemplate } from "@als/schemas";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

type PlanDetail = PlanTemplate & { published?: boolean };

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/plans/${encodeURIComponent(planId)}`)
      .then((r) => r.json())
      .then((d) => {
        setPlan(d.error ? null : d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [planId]);

  useEffect(load, [load]);

  const togglePublish = useCallback(async () => {
    await fetch(`/api/plans/${encodeURIComponent(planId)}/promote`, {
      method: "POST",
    });
    load();
  }, [planId, load]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`Delete plan "${plan?.name}"?`)) return;
    const res = await fetch(`/api/plans/${encodeURIComponent(planId)}`, {
      method: "DELETE",
    });
    if (res.ok) router.push("/plans");
  }, [planId, plan, router]);

  if (loading)
    return <div className="text-center py-12 text-gray-500">Loading plan...</div>;
  if (!plan)
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">Plan not found</h1>
        <a href="/plans" className="text-studio-accent mt-4 inline-block hover:underline">
          Back to plans
        </a>
      </div>
    );

  const requires = plan.edges.filter((e) => e.type === "REQUIRES");
  const enables = plan.edges.filter((e) => e.type === "ENABLES");

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Plans", href: "/plans" },
          { label: plan.name },
        ]}
      />

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {plan.icon ? plan.icon + " " : ""}
            {plan.name}
          </h1>
          <p className="mt-1 text-gray-700">{plan.description}</p>
          <div className="flex gap-2 mt-3">
            <a
              href={`/plans/${encodeURIComponent(planId)}/md`}
              target="_blank"
              rel="noreferrer"
              className="border border-studio-border px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              View capability card
            </a>
            <a
              href={`/plans/${encodeURIComponent(planId)}/edit`}
              className="bg-studio-accent text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:opacity-90"
            >
              Edit
            </a>
            <button
              onClick={togglePublish}
              className="bg-govuk-green text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:opacity-90"
            >
              {plan.published ? "Unpublish" : "Publish"}
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
        <span
          className={`text-xs font-bold uppercase px-2 py-1 rounded ${
            plan.published
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {plan.published ? "Published" : "Draft"}
        </span>
      </div>

      {/* Settings + posture */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ["Freshness", plan.settings.freshness],
          ["Assembly", plan.settings.assembly],
          ["Administration (L2)", plan.posture.administration],
          ["Orchestration (L3)", plan.posture.orchestration],
        ].map(([label, value]) => (
          <div key={label} className="border border-studio-border rounded-xl bg-white p-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="font-bold text-sm capitalize">
              {String(value).replace(/-/g, " ")}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-studio-border rounded-xl bg-white p-4">
          <h3 className="font-bold text-sm mb-2">Entry services</h3>
          <ul className="text-sm space-y-1">
            {plan.entryServiceIds.map((id) => (
              <li key={id} className="font-mono text-xs">
                {id}
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-studio-border rounded-xl bg-white p-4">
          <h3 className="font-bold text-sm mb-2">
            Decision gates ({plan.attachedGateIds.length})
          </h3>
          <ul className="text-sm space-y-1">
            {plan.attachedGateIds.map((id) => (
              <li key={id} className="font-mono text-xs">
                {id}
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-studio-border rounded-xl bg-white p-4 md:col-span-2">
          <h3 className="font-bold text-sm mb-2">Dependencies</h3>
          {requires.length === 0 && enables.length === 0 ? (
            <p className="text-sm text-gray-500">None.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {requires.map((e, i) => (
                <li key={`r${i}`}>
                  <span className="text-red-700 font-medium">REQUIRES</span>{" "}
                  <span className="font-mono text-xs">{e.from}</span> before{" "}
                  <span className="font-mono text-xs">{e.to}</span>
                </li>
              ))}
              {enables.map((e, i) => (
                <li key={`e${i}`}>
                  <span className="text-blue-700 font-medium">ENABLES</span>{" "}
                  <span className="font-mono text-xs">{e.from}</span> →{" "}
                  <span className="font-mono text-xs">{e.to}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
