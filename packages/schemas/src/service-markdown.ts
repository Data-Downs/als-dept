/**
 * service-markdown.ts — Serialise a service's structured artefacts into a
 * single Markdown "capability card".
 *
 * The structured manifest, policy, state model and consent definitions remain
 * the authoritative machine contract. This Markdown view is a prose rendering
 * of those artefacts, intended for agents (and humans) to read and understand a
 * service before calling the structured tools. It is generated, never authored.
 */

import type {
  CapabilityManifest,
  PolicyRuleset,
  StateModelDefinition,
  ConsentModel,
  JsonSchema,
  PlanTemplate,
  DecisionGateDefinition,
} from "./index";

export interface ServiceMarkdownInput {
  manifest: CapabilityManifest;
  policy?: PolicyRuleset | null;
  stateModel?: StateModelDefinition | null;
  consent?: ConsentModel | null;
}

const OPERATOR_PHRASES: Record<string, (value: string) => string> = {
  ">=": (v) => `must be at least ${v}`,
  "<=": (v) => `must be at most ${v}`,
  "==": (v) => `must equal ${v}`,
  "!=": (v) => `must not equal ${v}`,
  ">": (v) => `must be more than ${v}`,
  "<": (v) => `must be less than ${v}`,
  in: (v) => `must be one of ${v}`,
  exists: () => `must be provided`,
  "not-exists": () => `must not be present`,
};

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function phraseCondition(condition: {
  field: string;
  operator: string;
  value?: unknown;
}): string {
  const phraser = OPERATOR_PHRASES[condition.operator];
  const valueStr = formatValue(condition.value);
  const clause = phraser
    ? phraser(valueStr)
    : `${condition.operator} ${valueStr}`.trim();
  return `\`${condition.field}\` ${clause}`;
}

function schemaFields(schema: JsonSchema | undefined): Array<{
  name: string;
  type: string;
  required: boolean;
}> {
  if (!schema?.properties) return [];
  const required = new Set(
    Array.isArray(schema.required) ? schema.required : [],
  );
  return Object.entries(schema.properties).map(([name, prop]) => ({
    name,
    type: (prop as { type?: string })?.type || "string",
    required: required.has(name),
  }));
}

/** Render a service's artefacts as a Markdown capability card. */
export function serviceToMarkdown(input: ServiceMarkdownInput): string {
  const { manifest: m, policy, stateModel, consent } = input;
  const lines: string[] = [];

  lines.push(`# ${m.name}`);
  lines.push("");
  if (m.description) lines.push(`> ${m.description}`);
  lines.push("");

  // Identity block
  const meta: string[] = [`**Department:** ${m.department}`];
  meta.push(`**Service ID:** \`${m.id}\``);
  if (m.jurisdiction) meta.push(`**Jurisdiction:** ${m.jurisdiction}`);
  if (m.govuk_url) meta.push(`**GOV.UK:** ${m.govuk_url}`);
  lines.push(meta.join("  \n"));
  lines.push("");

  if (m.eligibility_summary) {
    lines.push("## Overview");
    lines.push("");
    lines.push(m.eligibility_summary);
    lines.push("");
  }

  // Eligibility (policy)
  if (policy && policy.rules.length > 0) {
    lines.push("## Who can use it");
    lines.push("");
    lines.push("These conditions are checked automatically before proceeding:");
    lines.push("");
    for (const rule of policy.rules) {
      let line = `- ${rule.description} — ${phraseCondition(rule.condition)}.`;
      if (rule.reason_if_failed) line += ` If not met: _${rule.reason_if_failed}_`;
      if (rule.alternative_service)
        line += ` (Alternative: \`${rule.alternative_service}\`.)`;
      lines.push(line);
    }
    lines.push("");
    if (policy.edge_cases && policy.edge_cases.length > 0) {
      lines.push("**Edge cases**");
      lines.push("");
      for (const ec of policy.edge_cases) {
        lines.push(`- ${ec.description} → ${ec.action}`);
      }
      lines.push("");
    }
  }

  // Inputs
  const inputs = schemaFields(m.input_schema);
  if (inputs.length > 0) {
    lines.push("## What you'll need");
    lines.push("");
    for (const f of inputs) {
      lines.push(
        `- \`${f.name}\` (${f.type})${f.required ? " — required" : ""}`,
      );
    }
    lines.push("");
  }

  // Outputs
  const outputs = schemaFields(m.output_schema);
  if (outputs.length > 0) {
    lines.push("## What you'll get back");
    lines.push("");
    for (const f of outputs) {
      lines.push(`- \`${f.name}\` (${f.type})`);
    }
    lines.push("");
  }

  // Process (state model)
  if (stateModel && stateModel.states.length > 0) {
    lines.push("## How it works");
    lines.push("");
    const stateLabel = (id: string) => id.replace(/-/g, " ");
    for (const s of stateModel.states) {
      const tags: string[] = [];
      if (s.type === "initial") tags.push("start");
      if (s.type === "terminal") tags.push("end");
      if (s.receipt) tags.push("receipt issued");
      const suffix = tags.length > 0 ? ` _(${tags.join(", ")})_` : "";
      lines.push(`- **${stateLabel(s.id)}**${suffix}`);
    }
    lines.push("");
    if (stateModel.transitions.length > 0) {
      lines.push("**Transitions**");
      lines.push("");
      for (const t of stateModel.transitions) {
        const trigger = t.trigger ? ` on _${t.trigger}_` : "";
        const cond = t.condition ? ` when ${t.condition}` : "";
        lines.push(
          `- ${stateLabel(t.from)} → ${stateLabel(t.to)}${trigger}${cond}`,
        );
      }
      lines.push("");
    }
  }

  // Constraints
  const c = m.constraints;
  if (c && (c.sla || c.fee || c.availability)) {
    lines.push("## What to expect");
    lines.push("");
    if (c.sla) lines.push(`- **Processing time:** ${c.sla}`);
    if (c.fee)
      lines.push(`- **Fee:** ${c.fee.currency} ${c.fee.amount}`);
    if (c.availability) lines.push(`- **Availability:** ${c.availability}`);
    lines.push("");
  }

  // Consent
  if (consent && consent.grants.length > 0) {
    lines.push("## Your data and consent");
    lines.push("");
    lines.push(
      "Before an agent acts on your behalf, it will ask to share the following:",
    );
    lines.push("");
    for (const g of consent.grants) {
      const parts = [`- **${g.description}**`];
      if (g.data_shared.length > 0)
        parts.push(`shares: ${g.data_shared.join(", ")}`);
      if (g.purpose) parts.push(`purpose: ${g.purpose}`);
      parts.push(g.required ? "required" : "optional");
      lines.push(parts.join(" — "));
    }
    lines.push("");
    if (consent.revocation) {
      lines.push(
        `**Revocation:** ${consent.revocation.mechanism} — ${consent.revocation.effect}`,
      );
      lines.push("");
    }
    if (consent.delegation) {
      lines.push(
        `**Delegation:** ${consent.delegation.agent_identity} may act within: ${consent.delegation.scopes.join(", ")}. ${consent.delegation.limitations}`,
      );
      lines.push("");
    }
  }

  // Redress
  const r = m.redress;
  if (r && (r.complaint_url || r.appeal_process || r.ombudsman)) {
    lines.push("## If something goes wrong");
    lines.push("");
    if (r.complaint_url) lines.push(`- **Complaints:** ${r.complaint_url}`);
    if (r.appeal_process) lines.push(`- **Appeals:** ${r.appeal_process}`);
    if (r.ombudsman) lines.push(`- **Ombudsman:** ${r.ombudsman}`);
    lines.push("");
  }

  // Handoff
  const h = m.handoff;
  if (h && (h.escalation_phone || h.opening_hours || h.department_queue)) {
    lines.push("## Talking to a human");
    lines.push("");
    if (h.escalation_phone) lines.push(`- **Phone:** ${h.escalation_phone}`);
    if (h.opening_hours) lines.push(`- **Hours:** ${h.opening_hours}`);
    if (h.department_queue) lines.push(`- **Queue:** ${h.department_queue}`);
    lines.push("");
  }

  // Audit / accountability
  const a = m.audit_requirements;
  if (a && (a.data_controller || a.lawful_basis || a.retention_period)) {
    lines.push("## Accountability");
    lines.push("");
    if (a.data_controller)
      lines.push(`- **Data controller:** ${a.data_controller}`);
    if (a.lawful_basis) lines.push(`- **Lawful basis:** ${a.lawful_basis}`);
    if (a.retention_period)
      lines.push(`- **Retention:** ${a.retention_period}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    "_Generated from published legibility artefacts. The structured manifest, policy, state model and consent definitions remain the authoritative machine contract — eligibility and state are evaluated deterministically in code, not from this prose._",
  );

  return lines.join("\n") + "\n";
}

export interface ServiceIndexEntry {
  id: string;
  name: string;
  department: string;
  description: string;
}

/**
 * Render an llms.txt-style index of all services. Each entry links to the
 * service's Markdown capability card.
 */
export function servicesToLlmsTxt(
  services: ServiceIndexEntry[],
  opts?: { title?: string; summary?: string; cardUrl?: (id: string) => string },
): string {
  const title = opts?.title || "Agentic Legibility Stack — Services";
  const summary =
    opts?.summary ||
    "Capability cards for government services published through the Legibility Studio. Each links to a Markdown description an agent can read before calling the structured service tools.";
  const cardUrl =
    opts?.cardUrl || ((id: string) => `/services/${encodeURIComponent(id)}/md`);

  const byDept = new Map<string, ServiceIndexEntry[]>();
  for (const s of services) {
    const list = byDept.get(s.department) || [];
    list.push(s);
    byDept.set(s.department, list);
  }

  const lines: string[] = [`# ${title}`, "", `> ${summary}`, ""];
  for (const dept of [...byDept.keys()].sort()) {
    lines.push(`## ${dept}`);
    lines.push("");
    for (const s of byDept.get(dept)!.sort((a, b) => a.name.localeCompare(b.name))) {
      const desc = s.description ? `: ${s.description}` : "";
      lines.push(`- [${s.name}](${cardUrl(s.id)})${desc}`);
    }
    lines.push("");
  }

  return lines.join("\n") + "\n";
}

// ── Plan capability cards ──

export interface PlanServiceSummary {
  id: string;
  name: string;
  department: string;
  description?: string;
}

export interface PlanMarkdownInput {
  plan: PlanTemplate;
  /** Resolved member services (entry + downstream). */
  services: PlanServiceSummary[];
  /** Resolved gate definitions attached to the plan. */
  gates?: DecisionGateDefinition[];
  /** How to link to a member service's own capability card. */
  cardUrl?: (serviceId: string) => string;
}

const ASSEMBLY_PROSE: Record<string, string> = {
  authored: "a fixed, vetted journey — everyone with this life event follows the same path",
  agent: "assembled for the citizen by an agent at the time of need",
  hybrid:
    "assembled by an agent but grounded in these published services, with every step recorded",
};

/** Render a plan template as a Markdown capability card for agents and humans. */
export function planToMarkdown(input: PlanMarkdownInput): string {
  const { plan, services, gates = [] } = input;
  const cardUrl =
    input.cardUrl ||
    ((id: string) => `/services/${encodeURIComponent(id)}/md`);
  const byId = new Map(services.map((s) => [s.id, s]));
  const name = (id: string) => byId.get(id)?.name || id;
  const lines: string[] = [];

  lines.push(`# ${plan.icon ? plan.icon + " " : ""}${plan.name}`);
  lines.push("");
  if (plan.description) lines.push(`> ${plan.description}`);
  lines.push("");
  lines.push(`**Plan ID:** \`${plan.id}\``);
  lines.push("");

  lines.push("## How this plan is built");
  lines.push("");
  lines.push(
    ASSEMBLY_PROSE[plan.settings.assembly] ?? ASSEMBLY_PROSE.hybrid,
  );
  lines.push("");

  // Where to start
  if (plan.entryServiceIds.length > 0) {
    lines.push("## Where to start");
    lines.push("");
    for (const id of plan.entryServiceIds) {
      const svc = byId.get(id);
      const label = svc ? `[${svc.name}](${cardUrl(id)})` : `\`${id}\``;
      const dept = svc?.department ? ` — ${svc.department}` : "";
      lines.push(`- ${label}${dept}`);
    }
    lines.push("");
  }

  // All services in the plan
  const others = services.filter((s) => !plan.entryServiceIds.includes(s.id));
  if (others.length > 0) {
    lines.push("## Other services in this plan");
    lines.push("");
    for (const svc of others) {
      const dept = svc.department ? ` — ${svc.department}` : "";
      lines.push(`- [${svc.name}](${cardUrl(svc.id)})${dept}`);
    }
    lines.push("");
  }

  // Sequence and dependencies
  const requires = plan.edges.filter((e) => e.type === "REQUIRES");
  const enables = plan.edges.filter((e) => e.type === "ENABLES");
  if (requires.length > 0 || enables.length > 0) {
    lines.push("## Sequence and dependencies");
    lines.push("");
    for (const e of requires) {
      lines.push(`- Complete **${name(e.from)}** before **${name(e.to)}**.`);
    }
    for (const e of enables) {
      lines.push(`- **${name(e.from)}** may lead on to **${name(e.to)}**.`);
    }
    lines.push("");
  }

  // Questions along the way
  if (gates.length > 0) {
    lines.push("## Questions along the way");
    lines.push("");
    for (const gate of gates) {
      lines.push(`- ${gate.question}`);
      for (const opt of gate.options) {
        lines.push(`  - ${opt.label}`);
      }
    }
    lines.push("");
  }

  // Shared data
  if (plan.sharedFields.length > 0) {
    lines.push("## What you'll be asked once");
    lines.push("");
    lines.push(
      "These details are collected once and reused across the services above:",
    );
    lines.push("");
    for (const f of plan.sharedFields) {
      lines.push(`- ${f.label}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    "_Generated from a published plan template. The member services, their eligibility, and the gate routing are evaluated deterministically in code; this prose is a view of that structure, not the authority for it._",
  );

  return lines.join("\n") + "\n";
}

export interface PlanIndexEntry {
  id: string;
  name: string;
  description: string;
}

/** Render a Plans section for the llms.txt index. */
export function plansToLlmsTxt(
  plans: PlanIndexEntry[],
  opts?: { cardUrl?: (id: string) => string },
): string {
  const cardUrl =
    opts?.cardUrl || ((id: string) => `/plans/${encodeURIComponent(id)}/md`);
  const lines: string[] = ["## Plans (life events)", ""];
  for (const p of [...plans].sort((a, b) => a.name.localeCompare(b.name))) {
    const desc = p.description ? `: ${p.description}` : "";
    lines.push(`- [${p.name}](${cardUrl(p.id)})${desc}`);
  }
  lines.push("");
  return lines.join("\n") + "\n";
}
