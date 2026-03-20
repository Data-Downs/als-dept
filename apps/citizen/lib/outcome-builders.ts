/**
 * Outcome Builders — construct JourneyOutcome objects from persona data.
 *
 * Each builder reads the persona JSON and calculates real amounts,
 * dates, and references. If a perm sec asks "where does that number
 * come from?", it traces back to the persona's actual circumstances.
 */

import type { JourneyOutcome, OutcomeDetail } from "./outcome-types";
import type { PersonaData } from "./types";

type OutcomeBuilder = (
  persona: PersonaData,
  issuedAt: string,
) => JourneyOutcome | null;

// ── Deterministic reference generator ──

function makeRef(prefix: string, personaId: string, serviceId: string): string {
  // Simple hash from persona + service to get stable, realistic-looking refs
  let hash = 0;
  const seed = `${personaId}:${serviceId}:2026`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const num = Math.abs(hash) % 100000;
  return `${prefix}-2026-${num.toString().padStart(5, "0")}`;
}

// ── Sarah Okafor: Bereaved Spouse ──

const buildTellUsOnce: OutcomeBuilder = (persona, issuedAt) => {
  const bereavement = (persona as Record<string, unknown>).bereavement as
    | Record<string, unknown>
    | undefined;
  if (!bereavement) return null;

  const deceasedName =
    (bereavement.deceasedName as string) || "the deceased";
  const address = persona.address;
  const council = address?.city
    ? `${address.city} Council`
    : "Local Council";

  return {
    id: `outcome-dwp-tell-us-once-${persona.id}`,
    serviceId: "dwp-tell-us-once",
    serviceName: "Tell Us Once",
    department: "Department for Work and Pensions",
    type: "notification",
    title: "Tell Us Once — Departments Notified",
    reference: makeRef("TUO", persona.id || "", "dwp-tell-us-once"),
    issuedAt,
    details: [
      { label: "HM Revenue & Customs", value: "Notified", type: "text" },
      {
        label: "Department for Work and Pensions",
        value: "Notified",
        type: "text",
      },
      {
        label: "Driver and Vehicle Licensing Agency",
        value: "Notified",
        type: "text",
      },
      { label: "HM Passport Office", value: "Notified", type: "text" },
      { label: council, value: "Notified", type: "text" },
      { label: "Electoral Register", value: "Notified", type: "text" },
      {
        label: "Deceased",
        value: deceasedName,
        type: "text",
      },
    ],
  };
};

const buildDeathRegistration: OutcomeBuilder = (persona, issuedAt) => {
  const bereavement = (persona as Record<string, unknown>).bereavement as
    | Record<string, unknown>
    | undefined;
  if (!bereavement) return null;

  const deceasedName =
    (bereavement.deceasedName as string) || "the deceased";
  const dateOfDeath = bereavement.dateOfDeath as string;
  const address = persona.address;
  const district = address?.city || "Unknown";

  return {
    id: `outcome-gro-register-death-${persona.id}`,
    serviceId: "gro-register-death",
    serviceName: "Register a Death",
    department: "General Register Office",
    type: "registration",
    title: "Death Registered",
    reference: makeRef("DRG", persona.id || "", "gro-register-death"),
    issuedAt,
    details: [
      { label: "Name", value: deceasedName, type: "text" },
      {
        label: "Date of death",
        value: formatDate(dateOfDeath),
        type: "date",
      },
      { label: "Registration district", value: district, type: "text" },
    ],
  };
};

const buildDeathCertificate: OutcomeBuilder = (persona, issuedAt) => {
  const bereavement = (persona as Record<string, unknown>).bereavement as
    | Record<string, unknown>
    | undefined;
  if (!bereavement) return null;

  const deceasedName =
    (bereavement.deceasedName as string) || "the deceased";
  const dateOfDeath = bereavement.dateOfDeath as string;
  const address = persona.address;
  const district = address?.city || "Unknown";
  const certNumber = makeRef("DN", persona.id || "", "gro-death-certificate");

  return {
    id: `outcome-gro-death-certificate-${persona.id}`,
    serviceId: "gro-death-certificate",
    serviceName: "Death Certificate",
    department: "General Register Office",
    type: "document",
    title: "Death Certificate Issued",
    reference: certNumber,
    issuedAt,
    details: [
      { label: "Name", value: deceasedName, type: "text" },
      {
        label: "Date of death",
        value: formatDate(dateOfDeath),
        type: "date",
      },
      { label: "District", value: `${district}, ${address?.county || ""}`.replace(/, $/, ""), type: "text" },
      {
        label: "Certificate",
        value: certNumber,
        type: "credential-number",
      },
    ],
    credential: {
      type: "death-certificate",
      issuer: "General Register Office",
      number: certNumber,
      issued: issuedAt,
      status: "valid",
    },
  };
};

const buildBereavementSupport: OutcomeBuilder = (persona, issuedAt) => {
  const bereavement = (persona as Record<string, unknown>).bereavement as
    | Record<string, unknown>
    | undefined;
  if (!bereavement) return null;

  // BSP standard rate: £3,500 lump sum + 18 monthly payments of £350
  // Eligible if: spouse/civil partner died, claimant under State Pension age,
  // and spouse paid NI contributions.
  const lumpSum = 3500;
  const monthlyAmount = 350;
  const monthlyPayments = 18;

  // Calculate first payment date: ~6 weeks from issuedAt
  const firstPayment = new Date(issuedAt);
  firstPayment.setDate(firstPayment.getDate() + 14);
  // Align to next payment cycle (typically first of month)
  firstPayment.setDate(1);
  if (firstPayment <= new Date(issuedAt)) {
    firstPayment.setMonth(firstPayment.getMonth() + 1);
  }

  const financials = persona.financials as
    | Record<string, unknown>
    | undefined;
  const bankName =
    (financials?.currentAccount as Record<string, unknown>)?.bank || "your bank";

  return {
    id: `outcome-dwp-bereavement-support-${persona.id}`,
    serviceId: "dwp-bereavement-support",
    serviceName: "Bereavement Support Payment",
    department: "Department for Work and Pensions",
    type: "payment",
    title: "Bereavement Support Payment Confirmed",
    reference: makeRef("BSP", persona.id || "", "dwp-bereavement-support"),
    issuedAt,
    details: [
      {
        label: "Initial lump sum",
        value: formatCurrency(lumpSum),
        highlight: true,
        type: "currency",
      },
      {
        label: "Monthly payments",
        value: `${formatCurrency(monthlyAmount)} × ${monthlyPayments} months`,
        type: "currency",
      },
      {
        label: "First payment",
        value: formatDate(firstPayment.toISOString().split("T")[0]),
        type: "date",
      },
      {
        label: "Paid to",
        value: `${bankName} account`,
        type: "text",
      },
    ],
  };
};

const buildProbateGrant: OutcomeBuilder = (persona, issuedAt) => {
  const bereavement = (persona as Record<string, unknown>).bereavement as
    | Record<string, unknown>
    | undefined;
  if (!bereavement) return null;

  const deceasedName =
    (bereavement.deceasedName as string) || "the deceased";
  const estateValue = (bereavement.estateValue as number) || 0;

  return {
    id: `outcome-hmcts-probate-${persona.id}`,
    serviceId: "hmcts-probate",
    serviceName: "Probate",
    department: "HM Courts & Tribunals Service",
    type: "document",
    title: "Grant of Probate Issued",
    reference: makeRef("PR", persona.id || "", "hmcts-probate"),
    issuedAt,
    details: [
      { label: "Deceased", value: deceasedName, type: "text" },
      {
        label: "Executor",
        value: persona.name || "Unknown",
        type: "text",
      },
      {
        label: "Gross estate value",
        value: formatCurrency(estateValue),
        type: "currency",
      },
      {
        label: "Case reference",
        value: makeRef("PR", persona.id || "", "hmcts-probate"),
        type: "credential-number",
      },
    ],
    credential: {
      type: "grant-of-probate",
      issuer: "HM Courts & Tribunals Service",
      number: makeRef("PR", persona.id || "", "hmcts-probate"),
      issued: issuedAt,
      status: "valid",
    },
  };
};

const buildIHT400: OutcomeBuilder = (persona, issuedAt) => {
  const bereavement = (persona as Record<string, unknown>).bereavement as
    | Record<string, unknown>
    | undefined;
  if (!bereavement) return null;

  const estateValue = (bereavement.estateValue as number) || 0;
  // Nil-rate band: £325,000 + residence nil-rate band: £175,000 = £500,000
  // Transferable nil-rate from spouse: another £500,000 = £1,000,000 total
  const nilRateBand = 325000;
  const residenceNilRate = 175000;
  const totalThreshold = nilRateBand + residenceNilRate;
  // With transferable nil-rate from deceased spouse
  const combinedThreshold = totalThreshold * 2;
  const ihtDue = estateValue > combinedThreshold;
  const taxAmount = ihtDue
    ? Math.round((estateValue - combinedThreshold) * 0.4)
    : 0;

  const details: OutcomeDetail[] = [
    {
      label: "Gross estate value",
      value: formatCurrency(estateValue),
      type: "currency",
    },
    {
      label: "Combined nil-rate threshold",
      value: formatCurrency(combinedThreshold),
      type: "currency",
    },
  ];

  if (ihtDue) {
    details.push({
      label: "Inheritance tax due",
      value: formatCurrency(taxAmount),
      highlight: true,
      type: "currency",
    });
  } else {
    details.push({
      label: "Inheritance tax due",
      value: "Nil — estate below threshold",
      highlight: true,
      type: "text",
    });
  }

  return {
    id: `outcome-hmrc-iht400-${persona.id}`,
    serviceId: "hmrc-iht400",
    serviceName: "Inheritance Tax Return",
    department: "HM Revenue & Customs",
    type: "registration",
    title: "Inheritance Tax Return Filed",
    reference: makeRef("IHT", persona.id || "", "hmrc-iht400"),
    issuedAt,
    details,
  };
};

// ── Builder Registry ──

const OUTCOME_BUILDERS: Record<string, OutcomeBuilder> = {
  "dwp-tell-us-once": buildTellUsOnce,
  "gro-register-death": buildDeathRegistration,
  "gro-death-certificate": buildDeathCertificate,
  "dwp-bereavement-support": buildBereavementSupport,
  "hmcts-probate": buildProbateGrant,
  "hmrc-iht400": buildIHT400,
};

/**
 * Build a journey outcome for a given service, deriving all data
 * from the persona's actual profile.
 */
export function buildOutcome(
  serviceId: string,
  persona: PersonaData,
  issuedAt?: string,
): JourneyOutcome | null {
  const builder = OUTCOME_BUILDERS[serviceId];
  if (!builder) return null;
  return builder(persona, issuedAt || new Date().toISOString().split("T")[0]);
}

/**
 * Build multiple outcomes at once.
 */
export function buildOutcomes(
  serviceIds: string[],
  persona: PersonaData,
  issuedAt?: string,
): JourneyOutcome[] {
  const date = issuedAt || "2026-03-20";
  return serviceIds
    .map((id) => buildOutcome(id, persona, date))
    .filter((o): o is JourneyOutcome => o !== null);
}

// ── Formatters ──

function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString("en-GB", { minimumFractionDigits: amount % 1 === 0 ? 0 : 2 })}`;
}

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}
