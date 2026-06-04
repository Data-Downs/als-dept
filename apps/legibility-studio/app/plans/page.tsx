"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

interface PlanSummary {
  id: string;
  name: string;
  icon: string;
  description: string;
  published: boolean;
  serviceCount: number;
  gateCount: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/" }, { label: "Plans" }]} />
      <div className="flex justify-between items-start mb-6">
        <PageHeader
          title="Plans"
          subtitle="Cross-service life-event journeys, published as headless artefacts."
        />
        <a
          href="/plans/new"
          className="bg-studio-accent text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 shrink-0"
        >
          New plan
        </a>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <a
              key={p.id}
              href={`/plans/${encodeURIComponent(p.id)}`}
              className="border border-studio-border rounded-xl bg-white p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{p.icon || "•"}</span>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    p.published
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.published ? "Published" : "Draft"}
                </span>
              </div>
              <h2 className="font-bold text-base">{p.name}</h2>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {p.description}
              </p>
              <div className="text-xs text-gray-400 mt-3 flex gap-3">
                <span>{p.serviceCount} services</span>
                <span>{p.gateCount} gates</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
