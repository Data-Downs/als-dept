/**
 * Outcome Template Registry — per-interaction-type templates that define
 * what outcome to produce when a journey reaches a terminal state.
 *
 * Follows the same pattern as TEMPLATE_CARD_REGISTRY and
 * INSTRUCTION_TEMPLATE_REGISTRY: keyed by InteractionType, each template
 * defines the shape of the outcome (type, title, fields) rather than
 * concrete values. The generic builder populates fields from data sources.
 */

import type {
  OutcomeType,
  JourneyOutcome,
  OutcomeDetail,
  CredentialUpdate,
} from "./outcome-types";
import type { InteractionType } from "./card-registry";

// ── Template Types ──

export interface OutcomeFieldSpec {
  /** Data key to look up (e.g. "payment_amount") */
  key: string;
  /** Display label */
  label: string;
  type: "currency" | "date" | "text" | "credential-number";
  highlight?: boolean;
  /** Fallback text if no data found. Supports {department} and {serviceName} placeholders. */
  fallback?: string;
  /** Where to look for data, in priority order */
  sourcePreference: Array<"outcomeHint" | "inferred" | "submitted" | "persona">;
}

export interface OutcomeTemplate {
  outcomeType: OutcomeType;
  /** Title with {serviceName} and {department} placeholders */
  titlePattern: string;
  fields: OutcomeFieldSpec[];
  /** For credential-type outcomes — defines the credential to add */
  credentialSpec?: {
    typePattern: string;
    issuerField: string;
  };
}

export interface OutcomeContext {
  serviceId: string;
  serviceName: string;
  department: string;
  govukUrl?: string;
  conversationId?: string;
  issuedAt: string;
}

export interface OutcomeDataSources {
  outcomeHints?: Record<string, unknown>;
  inferredFacts?: Record<string, unknown>;
  submittedData?: Record<string, unknown>;
  personaData?: Record<string, unknown>;
}

// ── Shared field specs ──

const PAID_TO_FIELD: OutcomeFieldSpec = {
  key: "paid_to",
  label: "Paid to",
  type: "text",
  fallback: "Your registered bank account",
  sourcePreference: ["persona", "submitted"],
};

const FIRST_PAYMENT_FIELD: OutcomeFieldSpec = {
  key: "first_payment_date",
  label: "First payment",
  type: "date",
  fallback: "To be confirmed by {department}",
  sourcePreference: ["outcomeHint", "inferred"],
};

// ── Template Registry ──

export const OUTCOME_TEMPLATE_REGISTRY: Partial<
  Record<InteractionType, OutcomeTemplate>
> = {
  benefit: {
    outcomeType: "payment",
    titlePattern: "{serviceName} Confirmed",
    fields: [
      {
        key: "payment_amount",
        label: "Payment amount",
        type: "currency",
        highlight: true,
        fallback: "Amount to be confirmed by {department}",
        sourcePreference: ["outcomeHint", "inferred", "submitted"],
      },
      {
        key: "payment_frequency",
        label: "Frequency",
        type: "text",
        fallback: "To be confirmed",
        sourcePreference: ["outcomeHint", "inferred"],
      },
      FIRST_PAYMENT_FIELD,
      PAID_TO_FIELD,
    ],
  },

  entitlement: {
    outcomeType: "payment",
    titlePattern: "{serviceName} — Entitlement Confirmed",
    fields: [
      {
        key: "entitlement_amount",
        label: "Entitlement amount",
        type: "currency",
        highlight: true,
        fallback: "Amount to be confirmed by {department}",
        sourcePreference: ["outcomeHint", "inferred"],
      },
      {
        key: "entitlement_period",
        label: "Entitlement period",
        type: "text",
        fallback: "To be confirmed",
        sourcePreference: ["outcomeHint", "inferred"],
      },
      {
        key: "employer_notified",
        label: "Employer notified",
        type: "text",
        fallback: "Your employer will be notified",
        sourcePreference: ["outcomeHint"],
      },
      PAID_TO_FIELD,
    ],
  },

  license: {
    outcomeType: "credential",
    titlePattern: "{serviceName} — Issued",
    fields: [
      {
        key: "licence_number",
        label: "Licence number",
        type: "credential-number",
        fallback: "To be confirmed",
        sourcePreference: ["outcomeHint", "persona", "inferred"],
      },
      {
        key: "valid_from",
        label: "Valid from",
        type: "date",
        sourcePreference: ["outcomeHint"],
      },
      {
        key: "valid_until",
        label: "Valid until",
        type: "date",
        highlight: true,
        fallback: "To be confirmed by {department}",
        sourcePreference: ["outcomeHint", "inferred"],
      },
      {
        key: "posted_to",
        label: "Posted to",
        type: "text",
        fallback: "Your registered address",
        sourcePreference: ["persona"],
      },
    ],
    credentialSpec: {
      typePattern: "licence",
      issuerField: "department",
    },
  },

  register: {
    outcomeType: "registration",
    titlePattern: "{serviceName} — Registered",
    fields: [
      {
        key: "registration_reference",
        label: "Registration reference",
        type: "credential-number",
        sourcePreference: ["outcomeHint"],
      },
      {
        key: "registration_district",
        label: "Registration district",
        type: "text",
        sourcePreference: ["persona", "outcomeHint"],
      },
      {
        key: "event_date",
        label: "Date",
        type: "date",
        sourcePreference: ["outcomeHint", "inferred", "submitted"],
      },
    ],
  },

  legal_process: {
    outcomeType: "document",
    titlePattern: "{serviceName} — Complete",
    fields: [
      {
        key: "case_reference",
        label: "Case reference",
        type: "credential-number",
        sourcePreference: ["outcomeHint"],
      },
      {
        key: "court_or_registry",
        label: "Court or registry",
        type: "text",
        fallback: "To be confirmed",
        sourcePreference: ["outcomeHint", "inferred"],
      },
      {
        key: "document_type",
        label: "Document",
        type: "text",
        fallback: "Official documentation issued",
        sourcePreference: ["outcomeHint"],
      },
      {
        key: "next_steps",
        label: "Next steps",
        type: "text",
        fallback: "Official documents will be sent to your registered address",
        sourcePreference: ["outcomeHint"],
      },
    ],
  },

  grant: {
    outcomeType: "payment",
    titlePattern: "{serviceName} — Approved",
    fields: [
      {
        key: "grant_amount",
        label: "Grant amount",
        type: "currency",
        highlight: true,
        fallback: "Amount to be confirmed by {department}",
        sourcePreference: ["outcomeHint", "inferred"],
      },
      {
        key: "project_description",
        label: "Project",
        type: "text",
        sourcePreference: ["outcomeHint", "submitted"],
      },
      {
        key: "conditions_accepted",
        label: "Conditions",
        type: "text",
        fallback: "Grant conditions accepted",
        sourcePreference: ["outcomeHint"],
      },
      PAID_TO_FIELD,
    ],
  },

  payment_service: {
    outcomeType: "payment",
    titlePattern: "{serviceName} — Payment Complete",
    fields: [
      {
        key: "amount_paid",
        label: "Amount paid",
        type: "currency",
        highlight: true,
        sourcePreference: ["outcomeHint", "inferred", "submitted"],
      },
      {
        key: "payment_method",
        label: "Payment method",
        type: "text",
        sourcePreference: ["outcomeHint", "submitted"],
      },
      {
        key: "receipt_reference",
        label: "Receipt",
        type: "credential-number",
        sourcePreference: ["outcomeHint"],
      },
    ],
  },

  application: {
    outcomeType: "document",
    titlePattern: "{serviceName} — Application Approved",
    fields: [
      {
        key: "application_reference",
        label: "Application reference",
        type: "credential-number",
        sourcePreference: ["outcomeHint"],
      },
      {
        key: "decision",
        label: "Decision",
        type: "text",
        fallback: "Application approved",
        highlight: true,
        sourcePreference: ["outcomeHint"],
      },
      {
        key: "next_steps",
        label: "Next steps",
        type: "text",
        fallback: "Confirmation will be sent by {department}",
        sourcePreference: ["outcomeHint"],
      },
    ],
  },

  appointment_booker: {
    outcomeType: "registration",
    titlePattern: "{serviceName} — Appointment Booked",
    fields: [
      {
        key: "appointment_date",
        label: "Date",
        type: "date",
        highlight: true,
        sourcePreference: ["outcomeHint", "submitted"],
      },
      {
        key: "appointment_time",
        label: "Time",
        type: "text",
        sourcePreference: ["outcomeHint", "submitted"],
      },
      {
        key: "appointment_location",
        label: "Location",
        type: "text",
        sourcePreference: ["outcomeHint", "submitted"],
      },
    ],
  },

  portal: {
    outcomeType: "registration",
    titlePattern: "{serviceName} — Action Complete",
    fields: [
      {
        key: "action_performed",
        label: "Action",
        type: "text",
        sourcePreference: ["outcomeHint", "inferred"],
      },
      {
        key: "confirmation_reference",
        label: "Reference",
        type: "credential-number",
        sourcePreference: ["outcomeHint"],
      },
    ],
  },

  task_list: {
    outcomeType: "registration",
    titlePattern: "{serviceName} — All Steps Complete",
    fields: [
      {
        key: "steps_completed",
        label: "Steps completed",
        type: "text",
        fallback: "All required steps have been completed",
        sourcePreference: ["outcomeHint"],
      },
    ],
  },

  // informational_hub intentionally omitted — no outcomes for info-only services
};

// ── Generic Outcome Builder ──

/** Deterministic reference generator */
function makeRef(prefix: string, seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const num = Math.abs(hash) % 100000;
  return `${prefix}-2026-${num.toString().padStart(5, "0")}`;
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return String(amount);
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString("en-GB", {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
  });
  return num < 0 ? `-£${formatted}` : `£${formatted}`;
}

function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return "";
  try {
    const d = new Date(
      isoDate.includes("T") ? isoDate : isoDate + "T00:00:00",
    );
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/** Replace {placeholders} in a string */
function interpolate(
  pattern: string,
  context: OutcomeContext,
): string {
  return pattern
    .replace(/\{serviceName\}/g, context.serviceName)
    .replace(/\{department\}/g, context.department);
}

/** Resolve a field value from data sources in priority order */
function resolveField(
  spec: OutcomeFieldSpec,
  sources: OutcomeDataSources,
  context: OutcomeContext,
): string | null {
  for (const source of spec.sourcePreference) {
    let pool: Record<string, unknown> | undefined;
    switch (source) {
      case "outcomeHint":
        pool = sources.outcomeHints;
        break;
      case "inferred":
        pool = sources.inferredFacts;
        break;
      case "submitted":
        pool = sources.submittedData;
        break;
      case "persona":
        pool = sources.personaData;
        break;
    }
    if (!pool) continue;

    // Try the exact key first
    let value = pool[spec.key];

    // For persona data, try common nested paths
    if (value === undefined && source === "persona") {
      // bank details
      if (spec.key === "paid_to") {
        const financials = pool.financials as Record<string, unknown> | undefined;
        const account = (financials?.currentAccount ??
          financials?.personalAccount) as Record<string, unknown> | undefined;
        if (account?.bank) value = `${account.bank} account`;
      }
      // address for "posted_to"
      if (spec.key === "posted_to") {
        const address = pool.address as Record<string, unknown> | undefined;
        if (address?.city) value = `${address.line1 || address.line_1 || ""}, ${address.city}, ${address.postcode || ""}`.replace(/^, /, "");
      }
      // registration district
      if (spec.key === "registration_district") {
        const address = pool.address as Record<string, unknown> | undefined;
        if (address?.city) value = address.city as string;
      }
      // licence number from credentials
      if (spec.key === "licence_number") {
        const credentials = pool.credentials as Array<Record<string, unknown>> | undefined;
        const licence = credentials?.find((c) => c.type === "driving-licence");
        if (licence?.number) value = licence.number;
      }
    }

    if (value !== undefined && value !== null && value !== "") {
      // Format based on type
      if (spec.type === "currency" && typeof value === "number") {
        return formatCurrency(value);
      }
      if (spec.type === "currency" && typeof value === "string" && !isNaN(parseFloat(value))) {
        return formatCurrency(value);
      }
      if (spec.type === "date" && typeof value === "string") {
        return formatDate(value);
      }
      return String(value);
    }
  }

  // Use fallback
  if (spec.fallback) {
    return interpolate(spec.fallback, context);
  }

  return null;
}

/**
 * Build a JourneyOutcome from a template, context, and data sources.
 *
 * Returns null if no meaningful data was resolved (all fields hit
 * fallbacks or had no data). In that case, the caller should fall
 * back to JourneyCompleteCard.
 */
export function buildOutcomeFromTemplate(
  template: OutcomeTemplate,
  context: OutcomeContext,
  sources: OutcomeDataSources,
): JourneyOutcome | null {
  const details: OutcomeDetail[] = [];
  let hasRealData = false;

  for (const spec of template.fields) {
    const value = resolveField(spec, sources, context);
    if (value === null) continue;

    // Track whether we got real data (not just fallbacks)
    if (spec.fallback && value === interpolate(spec.fallback, context)) {
      // This is a fallback value — still include it but don't count as real data
    } else {
      hasRealData = true;
    }

    details.push({
      label: spec.label,
      value,
      highlight: spec.highlight,
      type: spec.type,
    });
  }

  // If we got zero real data, return null (graceful degradation)
  if (!hasRealData && details.length === 0) return null;

  const refSeed = `${context.conversationId || "conv"}:${context.serviceId}:2026`;
  const refPrefix = template.outcomeType === "payment"
    ? "PAY"
    : template.outcomeType === "credential"
      ? "CRD"
      : template.outcomeType === "document"
        ? "DOC"
        : "REF";

  const reference = makeRef(refPrefix, refSeed);

  // Build credential if specified
  let credential: CredentialUpdate | undefined;
  if (template.credentialSpec) {
    const credNumber =
      details.find((d) => d.type === "credential-number")?.value || reference;
    credential = {
      type: template.credentialSpec.typePattern,
      issuer: context.department,
      number: credNumber,
      issued: context.issuedAt,
      status: "valid",
    };
  }

  return {
    id: `outcome-${context.serviceId}-${context.conversationId || Date.now()}`,
    serviceId: context.serviceId,
    serviceName: context.serviceName,
    department: context.department,
    type: template.outcomeType,
    title: interpolate(template.titlePattern, context),
    reference,
    details,
    issuedAt: context.issuedAt,
    credential,
  };
}
