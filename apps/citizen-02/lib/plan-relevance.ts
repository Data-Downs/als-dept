/**
 * Plan relevance — checks each service in a life event plan against persona
 * data and determines whether it's relevant, already completed, or not needed.
 *
 * This is NOT hardcoded per-service. Instead it uses structured rules that
 * match service characteristics (type, name patterns, eligibility criteria)
 * against persona data signals (vehicles, children, employment, age, etc.).
 */

import type { PersonaData, LifeEventService } from "./types";

export interface RelevanceResult {
  relevant: boolean;
  reason: string; // Human-readable explanation
}

type RelevanceRule = (
  svc: LifeEventService,
  persona: PersonaData,
  raw: Record<string, unknown>
) => RelevanceResult | null;

/**
 * Each rule inspects a service + persona and returns a result if it has an
 * opinion, or null to defer to the next rule. First match wins.
 */
const RULES: RelevanceRule[] = [
  // ── Driving: provisional licence not needed if persona already drives ──
  provisionaLicenceRule,

  // ── Driving: theory/practical tests not needed if persona already drives ──
  learnerTestsRule,

  // ── Benefits: already receiving a specific benefit ──
  alreadyReceivingBenefitRule,

  // ── Age-based irrelevance (e.g. pension services for young personas) ──
  ageMismatchRule,

  // ── Employment-based: job-seeking services for employed personas ──
  employmentMismatchRule,
];

/**
 * Check relevance of every service in a plan against persona data.
 * Returns a map of serviceId → RelevanceResult for services that are NOT relevant.
 * Services not in the map are assumed relevant.
 */
export function computePlanRelevance(
  services: LifeEventService[],
  personaData: PersonaData | null
): Record<string, RelevanceResult> {
  if (!personaData) return {};

  const raw = personaData as unknown as Record<string, unknown>;
  const results: Record<string, RelevanceResult> = {};

  for (const svc of services) {
    for (const rule of RULES) {
      const result = rule(svc, personaData, raw);
      if (result && !result.relevant) {
        results[svc.id] = result;
        break;
      }
    }
  }

  return results;
}

// ── Rule implementations ────────────────────────────────────────────────────

/** Provisional licence is not needed if the persona owns/drives vehicles */
function provisionaLicenceRule(
  svc: LifeEventService,
  persona: PersonaData,
): RelevanceResult | null {
  const nameLC = svc.name.toLowerCase();
  if (!nameLC.includes("provisional") || !nameLC.includes("licence")) return null;

  if (persona.vehicles && persona.vehicles.length > 0) {
    return {
      relevant: false,
      reason: "You already have a full driving licence — a provisional is not needed",
    };
  }
  return null;
}

/** Theory and practical driving tests not needed if persona already has a full licence */
function learnerTestsRule(
  svc: LifeEventService,
  persona: PersonaData,
): RelevanceResult | null {
  const nameLC = svc.name.toLowerCase();
  const isTheoryTest = nameLC.includes("theory test");
  const isDrivingTest = nameLC.includes("driving test") && nameLC.includes("practical");

  if (!isTheoryTest && !isDrivingTest) return null;

  if (persona.vehicles && persona.vehicles.length > 0) {
    return {
      relevant: false,
      reason: "You already hold a full driving licence",
    };
  }
  return null;
}

/** If persona is already receiving a specific benefit, that service may not need starting */
function alreadyReceivingBenefitRule(
  svc: LifeEventService,
  persona: PersonaData,
): RelevanceResult | null {
  if (svc.serviceType !== "benefit" && svc.serviceType !== "entitlement") return null;

  const current = persona.benefits?.currentlyReceiving;
  if (!current || current.length === 0) return null;

  const svcNameLC = svc.name.toLowerCase();
  for (const b of current) {
    const benefitLC = b.type.toLowerCase();
    // Fuzzy match: if the benefit name is substantially contained in the service name
    if (
      svcNameLC.includes(benefitLC) ||
      benefitLC.includes(svcNameLC.replace(/apply for |claim |register for /g, ""))
    ) {
      return {
        relevant: false,
        reason: `You're already receiving ${b.type}`,
      };
    }
  }
  return null;
}

/** Check age-based eligibility mismatches */
function ageMismatchRule(
  svc: LifeEventService,
  persona: PersonaData,
): RelevanceResult | null {
  if (!svc.eligibility_summary) return null;

  const dob = persona.primaryContact?.dateOfBirth;
  if (!dob) return null;

  const age = Math.floor(
    (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const summary = svc.eligibility_summary.toLowerCase();

  // "State Pension age" / pension services for young people
  if (summary.includes("state pension age") || summary.includes("aged 66")) {
    if (age < 55) {
      return {
        relevant: false,
        reason: `This is for people approaching State Pension age — you're ${age}`,
      };
    }
  }

  // Under-X rules (e.g. "under 25", "aged 16 to 24")
  const rangeMatch = summary.match(/aged?\s+(\d+)\s*(?:to|-)\s*(\d+)/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1], 10);
    const hi = parseInt(rangeMatch[2], 10);
    if (age < lo || age > hi) {
      return {
        relevant: false,
        reason: `This is for people aged ${lo}–${hi} — you're ${age}`,
      };
    }
  }

  return null;
}

/** Job-seeking services aren't relevant if persona is employed */
function employmentMismatchRule(
  svc: LifeEventService,
  persona: PersonaData,
  raw: Record<string, unknown>,
): RelevanceResult | null {
  const nameLC = svc.name.toLowerCase();
  const isJobSeeking =
    nameLC.includes("jobseeker") ||
    nameLC.includes("job centre") ||
    nameLC.includes("work coach") ||
    (nameLC.includes("universal credit") && svc.eligibility_summary?.toLowerCase().includes("unemployed"));

  if (!isJobSeeking) return null;

  const emp = persona.employment as Record<string, unknown> | undefined;
  const status = (
    emp?.status ?? emp?.employment_status ?? raw.employment_status
  ) as string | undefined;

  if (status && /^(employed|self-employed)$/i.test(status)) {
    return {
      relevant: false,
      reason: "You're currently employed — this is for people seeking work",
    };
  }
  return null;
}
