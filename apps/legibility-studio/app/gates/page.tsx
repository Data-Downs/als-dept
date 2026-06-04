"use client";

import { useState, useEffect } from "react";
import type { DecisionGateDefinition } from "@als/schemas";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export default function GatesPage() {
  const [gates, setGates] = useState<DecisionGateDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gates")
      .then((r) => r.json())
      .then((d) => {
        setGates(d.gates || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/" }, { label: "Gates" }]} />
      <div className="flex justify-between items-start mb-6">
        <PageHeader
          title="Decision gates"
          subtitle="Structured routing questions — the citizen's irreducible choices (layer 4)."
        />
        <a
          href="/gates/new"
          className="bg-studio-accent text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 shrink-0"
        >
          New gate
        </a>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading gates...</div>
      ) : gates.length === 0 ? (
        <p className="text-gray-500">No gates yet.</p>
      ) : (
        <div className="border border-studio-border rounded-xl bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-studio-border bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2.5 px-4">Gate</th>
                <th className="py-2.5 px-4">Question</th>
                <th className="py-2.5 px-4">Context</th>
                <th className="py-2.5 px-4">Options</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((g) => (
                <tr
                  key={g.id}
                  onClick={() =>
                    (window.location.href = `/gates/${encodeURIComponent(g.id)}/edit`)
                  }
                  className="border-b border-studio-border last:border-0 hover:bg-blue-50 cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono text-xs text-studio-accent">
                    {g.id}
                    {g.sensitive && (
                      <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded uppercase">
                        sensitive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">{g.question}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">
                    {g.context?.lifeEventId || g.context?.serviceId || "—"}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500">
                    {g.options.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
