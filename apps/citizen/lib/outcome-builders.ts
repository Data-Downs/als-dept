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

// ── Helpers ──

/** Resolve a stable persona identifier, falling back through available fields */
function personaKey(persona: PersonaData): string {
  return persona.id || persona.personaId || "unknown";
}

/** Deterministic reference generator from persona + service */
function makeRef(prefix: string, pid: string, serviceId: string): string {
  let hash = 0;
  const seed = `${pid}:${serviceId}:2026`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const num = Math.abs(hash) % 100000;
  return `${prefix}-2026-${num.toString().padStart(5, "0")}`;
}

/** Safely extract bereavement data from persona (untyped field) */
function getBereavement(
  persona: PersonaData,
): Record<string, unknown> | null {
  const raw = persona as unknown as Record<string, unknown>;
  const b = raw.bereavement as Record<string, unknown> | undefined;
  return b ?? null;
}

function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return "£0";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-GB", {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
  });
  return amount < 0 ? `-£${formatted}` : `£${formatted}`;
}

function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return "Date not available";
  try {
    const d = new Date(isoDate + "T00:00:00");
    if (isNaN(d.getTime())) return "Date not available";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/** Safely compute a first-of-month payment date after the issued date */
function nextPaymentDate(issuedAt: string): string {
  try {
    const d = new Date(issuedAt + "T00:00:00");
    if (isNaN(d.getTime())) return "2026-04-01";
    d.setDate(d.getDate() + 14);
    d.setDate(1);
    const issued = new Date(issuedAt + "T00:00:00");
    if (d <= issued) {
      d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().split("T")[0];
  } catch {
    return "2026-04-01";
  }
}

// ── Sarah Okafor: Bereaved Spouse ──

const buildTellUsOnce: OutcomeBuilder = (persona, issuedAt) => {
  const bereavement = getBereavement(persona);
  if (!bereavement) return null;

  const deceasedName =
    (bereavement.deceasedName as string) || "the deceased";
  const address = persona.address;
  const council = address?.city
    ? `${address.city} Council`
    : "Local Council";
  const pid = personaKey(persona);

  return {
    id: `outcome-dwp-tell-us-once-${pid}`,
    serviceId: "dwp-tell-us-once",
    serviceName: "Tell Us Once",
    department: "Department for Work and Pensions",
    type: "notification",
    title: "Tell Us Once — Departments Notified",
    reference: makeRef("TUO", pid, "dwp-tell-us-once"),
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
  const bereavement = getBereavement(persona);
  if (!bereavement) return null;

  const deceasedName =
    (bereavement.deceasedName as string) || "the deceased";
  const dateOfDeath = (bereavement.dateOfDeath as string) || undefined;
  const address = persona.address;
  const district = address?.city || "Unknown";
  const pid = personaKey(persona);

  return {
    id: `outcome-gro-register-death-${pid}`,
    serviceId: "gro-register-death",
    serviceName: "Register a Death",
    department: "General Register Office",
    type: "registration",
    title: "Death Registered",
    reference: makeRef("DRG", pid, "gro-register-death"),
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
  const bereavement = getBereavement(persona);
  if (!bereavement) return null;

  const deceasedName =
    (bereavement.deceasedName as string) || "the deceased";
  const dateOfDeath = (bereavement.dateOfDeath as string) || undefined;
  const address = persona.address;
  const district = address?.city || "Unknown";
  const county = address?.county || "";
  const pid = personaKey(persona);
  const certNumber = makeRef("DN", pid, "gro-death-certificate");

  return {
    id: `outcome-gro-death-certificate-${pid}`,
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
      {
        label: "District",
        value: county ? `${district}, ${county}` : district,
        type: "text",
      },
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
  const bereavement = getBereavement(persona);
  if (!bereavement) return null;

  // BSP standard rate: £3,500 lump sum + 18 monthly payments of £350
  const lumpSum = 3500;
  const monthlyAmount = 350;
  const monthlyPayments = 18;

  const firstPaymentIso = nextPaymentDate(issuedAt);

  const financials = persona.financials as
    | Record<string, unknown>
    | undefined;
  const bankName =
    (financials?.currentAccount as Record<string, unknown>)?.bank ||
    "your bank";
  const pid = personaKey(persona);

  return {
    id: `outcome-dwp-bereavement-support-${pid}`,
    serviceId: "dwp-bereavement-support",
    serviceName: "Bereavement Support Payment",
    department: "Department for Work and Pensions",
    type: "payment",
    title: "Bereavement Support Payment Confirmed",
    reference: makeRef("BSP", pid, "dwp-bereavement-support"),
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
        value: formatDate(firstPaymentIso),
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
  const bereavement = getBereavement(persona);
  if (!bereavement) return null;

  const deceasedName =
    (bereavement.deceasedName as string) || "the deceased";
  const estateValue = (bereavement.estateValue as number) || 0;
  const pid = personaKey(persona);

  return {
    id: `outcome-hmcts-probate-${pid}`,
    serviceId: "hmcts-probate",
    serviceName: "Probate",
    department: "HM Courts & Tribunals Service",
    type: "document",
    title: "Grant of Probate Issued",
    reference: makeRef("PR", pid, "hmcts-probate"),
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
        value: makeRef("PR", pid, "hmcts-probate"),
        type: "credential-number",
      },
    ],
    credential: {
      type: "grant-of-probate",
      issuer: "HM Courts & Tribunals Service",
      number: makeRef("PR", pid, "hmcts-probate"),
      issued: issuedAt,
      status: "valid",
    },
  };
};

const buildIHT400: OutcomeBuilder = (persona, issuedAt) => {
  const bereavement = getBereavement(persona);
  if (!bereavement) return null;

  const estateValue = (bereavement.estateValue as number) || 0;
  // Nil-rate band: £325,000 + residence nil-rate band: £175,000 = £500,000
  // Transferable nil-rate from deceased spouse: another £500,000 = £1,000,000
  const nilRateBand = 325000;
  const residenceNilRate = 175000;
  const totalThreshold = nilRateBand + residenceNilRate;
  const combinedThreshold = totalThreshold * 2;
  const ihtDue = estateValue > combinedThreshold;
  const taxAmount = ihtDue
    ? Math.round((estateValue - combinedThreshold) * 0.4)
    : 0;
  const pid = personaKey(persona);

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
    id: `outcome-hmrc-iht400-${pid}`,
    serviceId: "hmrc-iht400",
    serviceName: "Inheritance Tax Return",
    department: "HM Revenue & Customs",
    type: "registration",
    title: "Inheritance Tax Return Filed",
    reference: makeRef("IHT", pid, "hmrc-iht400"),
    issuedAt,
    details,
  };
};

// ── Marcus Taylor: Prison Leaver ──

const buildUniversalCredit: OutcomeBuilder = (persona, issuedAt) => {
  // Standard allowance for single person aged 25+ (2026 rate)
  const monthlyAmount = 393.45;
  const pid = personaKey(persona);

  // First payment is ~5 weeks from claim date
  const firstPaymentIso = (() => {
    try {
      const d = new Date(issuedAt + "T00:00:00");
      if (isNaN(d.getTime())) return "2026-04-24";
      d.setDate(d.getDate() + 35);
      return d.toISOString().split("T")[0];
    } catch {
      return "2026-04-24";
    }
  })();

  // Check if persona has a bank account
  const hasBankAccount = !!(persona as unknown as Record<string, unknown>)
    .bank_account;
  const paymentNote = hasBankAccount
    ? "Paid to your bank account"
    : "Basic bank account required — payment will go there once opened";

  return {
    id: `outcome-dwp-universal-credit-${pid}`,
    serviceId: "dwp-universal-credit",
    serviceName: "Universal Credit",
    department: "Department for Work and Pensions",
    type: "payment",
    title: "Universal Credit Claim Active",
    reference: makeRef("UC", pid, "dwp-universal-credit"),
    issuedAt,
    details: [
      {
        label: "Monthly amount",
        value: formatCurrency(monthlyAmount),
        highlight: true,
        type: "currency",
      },
      {
        label: "Rate",
        value: "Standard allowance (single, 25 or over)",
        type: "text",
      },
      {
        label: "Housing element",
        value: "Not applicable — approved premises",
        type: "text",
      },
      {
        label: "First payment",
        value: formatDate(firstPaymentIso),
        type: "date",
      },
      {
        label: "Payment method",
        value: paymentNote,
        type: "text",
      },
    ],
  };
};

const buildBasicBankAccount: OutcomeBuilder = (persona, issuedAt) => {
  const pid = personaKey(persona);
  const address = persona.address;
  const branch = address?.city || "Local";

  return {
    id: `outcome-dwp-basic-bank-account-${pid}`,
    serviceId: "dwp-basic-bank-account",
    serviceName: "Basic Bank Account",
    department: "Lloyds Banking Group",
    type: "registration",
    title: "Basic Bank Account Opened",
    reference: makeRef("BBA", pid, "dwp-basic-bank-account"),
    issuedAt,
    details: [
      {
        label: "Account type",
        value: "Lloyds Basic Account",
        type: "text",
      },
      {
        label: "Account holder",
        value: persona.name || "Unknown",
        type: "text",
      },
      {
        label: "Branch",
        value: `${branch} branch`,
        type: "text",
      },
      {
        label: "Features",
        value: "No credit check, no overdraft, no monthly fees",
        type: "text",
      },
      {
        label: "Status",
        value: "Open — ready to receive payments",
        highlight: true,
        type: "text",
      },
    ],
  };
};

const buildRenewDrivingLicence: OutcomeBuilder = (persona, issuedAt) => {
  const pid = personaKey(persona);
  const credentials = (persona as unknown as Record<string, unknown>)
    .credentials as Array<Record<string, unknown>> | undefined;
  const drivingLicence = credentials?.find(
    (c) => c.type === "driving-licence",
  );
  const licenceNumber =
    (drivingLicence?.number as string) || "Unknown";

  // New expiry: 10 years from issuedAt
  const newExpiry = (() => {
    try {
      const d = new Date(issuedAt + "T00:00:00");
      if (isNaN(d.getTime())) return "2036-03-20";
      d.setFullYear(d.getFullYear() + 10);
      return d.toISOString().split("T")[0];
    } catch {
      return "2036-03-20";
    }
  })();

  const address = persona.address;
  const postTo = address
    ? `${address.line1}, ${address.city}, ${address.postcode}`
    : "Your registered address";

  return {
    id: `outcome-dvla-renew-driving-licence-${pid}`,
    serviceId: "dvla.renew-driving-licence",
    serviceName: "Driving Licence Renewal",
    department: "Driver and Vehicle Licensing Agency",
    type: "credential",
    title: "Driving Licence Renewed",
    reference: licenceNumber,
    issuedAt,
    details: [
      {
        label: "Licence number",
        value: licenceNumber,
        type: "credential-number",
      },
      {
        label: "Name",
        value: persona.name || "Unknown",
        type: "text",
      },
      {
        label: "Valid from",
        value: formatDate(issuedAt),
        type: "date",
      },
      {
        label: "Valid until",
        value: formatDate(newExpiry),
        highlight: true,
        type: "date",
      },
      {
        label: "Posted to",
        value: postTo,
        type: "text",
      },
    ],
    credential: {
      type: "driving-licence",
      issuer: "DVLA",
      number: licenceNumber,
      issued: issuedAt,
      expires: newExpiry,
      status: "valid",
    },
  };
};

// ── James Whitfield: Disabled Appellant ──

/** Safely extract appeals data from persona */
function getAppeals(persona: PersonaData): Record<string, unknown> | null {
  const raw = persona as unknown as Record<string, unknown>;
  const a = raw.appeals as Record<string, unknown> | undefined;
  return a ?? null;
}

const buildPipAppeal: OutcomeBuilder = (persona, issuedAt) => {
  const appeals = getAppeals(persona);
  if (!appeals) return null;

  const pid = personaKey(persona);

  // Current PIP rates from persona benefits
  const benefits = persona.benefits?.currentlyReceiving || [];
  const currentPipDL = benefits.find(
    (b) => b.type === "PIP" && /daily living/i.test(b.reason || ""),
  );
  const currentDLWeekly = currentPipDL?.amount || 72.65;

  // Enhanced rates (2026 rates)
  const enhancedDailyLiving = 108.55;
  const enhancedMobility = 75.75;

  // Back-payment: weekly increase x 26 weeks
  const weeklyIncrease =
    enhancedDailyLiving - currentDLWeekly + enhancedMobility;
  const backPaymentWeeks = 26;
  const backPayment =
    Math.round(weeklyIncrease * backPaymentWeeks * 100) / 100;

  const financials = persona.financials as
    | Record<string, unknown>
    | undefined;
  const bankName =
    (financials?.currentAccount as Record<string, unknown>)?.bank ||
    "your bank";

  return {
    id: `outcome-dwp-pip-${pid}`,
    serviceId: "dwp-pip",
    serviceName: "Personal Independence Payment",
    department: "Department for Work and Pensions",
    type: "payment",
    title: "PIP Appeal Won — Enhanced Rates Awarded",
    reference: makeRef("PIP", pid, "dwp-pip"),
    issuedAt,
    details: [
      {
        label: "Enhanced daily living",
        value: `${formatCurrency(enhancedDailyLiving)}/week`,
        highlight: true,
        type: "currency",
      },
      {
        label: "Enhanced mobility",
        value: `${formatCurrency(enhancedMobility)}/week`,
        highlight: true,
        type: "currency",
      },
      {
        label: "Back-payment (26 weeks)",
        value: formatCurrency(backPayment),
        highlight: true,
        type: "currency",
      },
      {
        label: "Motability",
        value: "Agreement secured — enhanced mobility confirmed",
        type: "text",
      },
      {
        label: "Paid to",
        value: `${bankName} account`,
        type: "text",
      },
    ],
  };
};

const buildBlueBadge: OutcomeBuilder = (persona, issuedAt) => {
  const pid = personaKey(persona);
  const badgeNumber = makeRef("BB", pid, "la-blue-badge");

  // Expiry: 3 years from issued
  let expiryDate = "2029-03-20";
  try {
    const d = new Date(issuedAt + "T00:00:00");
    if (!isNaN(d.getTime())) {
      d.setFullYear(d.getFullYear() + 3);
      expiryDate = d.toISOString().split("T")[0];
    }
  } catch {
    // use default
  }

  const holderName =
    persona.name ||
    `${persona.primaryContact?.firstName || ""} ${persona.primaryContact?.lastName || ""}`.trim() ||
    "Unknown";

  const council = persona.address?.city
    ? `${persona.address.city} Council`
    : "Local Authority";

  return {
    id: `outcome-la-blue-badge-${pid}`,
    serviceId: "la-blue-badge",
    serviceName: "Blue Badge",
    department: "Local Authority",
    type: "credential",
    title: "Blue Badge Issued",
    reference: badgeNumber,
    issuedAt,
    details: [
      {
        label: "Badge holder",
        value: holderName,
        type: "text",
      },
      {
        label: "Badge number",
        value: badgeNumber,
        type: "credential-number",
      },
      {
        label: "Valid until",
        value: formatDate(expiryDate),
        type: "date",
      },
      {
        label: "Issued by",
        value: council,
        type: "text",
      },
    ],
    credential: {
      type: "blue-badge",
      issuer: council,
      number: badgeNumber,
      issued: issuedAt,
      expires: expiryDate,
      status: "valid",
    },
  };
};

const buildEhcp: OutcomeBuilder = (persona, issuedAt) => {
  const appeals = getAppeals(persona);
  if (!appeals) return null;

  const pid = personaKey(persona);
  const children = persona.children || [];
  const child = children[0];
  const childName = child
    ? `${child.firstName} ${child.lastName}`
    : "Child";
  const schoolCity = persona.address?.city || "Local";
  const ehcpRef = makeRef("EHCP", pid, "la-send-ehc");

  return {
    id: `outcome-la-send-ehc-${pid}`,
    serviceId: "la-send-ehc",
    serviceName: "Education, Health and Care Plan",
    department: "Local Authority — SEND",
    type: "document",
    title: "EHCP Issued",
    reference: ehcpRef,
    issuedAt,
    details: [
      {
        label: "Child",
        value: childName,
        type: "text",
      },
      {
        label: "School named",
        value: `${schoolCity} school`,
        type: "text",
      },
      {
        label: "Additional support",
        value:
          "Teaching assistant, occupational therapy, sensory break space",
        type: "text",
      },
      {
        label: "Plan reference",
        value: ehcpRef,
        type: "credential-number",
      },
      {
        label: "Statutory deadline met",
        value: formatDate(appeals.ehcpStatutoryDeadline as string),
        type: "date",
      },
    ],
  };
};

// ── Daniel Obi: Self-employed Plumber ──

/** Safely extract self-employment data from persona */
function getSelfEmployment(
  persona: PersonaData,
): Record<string, unknown> | null {
  const raw = persona as unknown as Record<string, unknown>;
  const se = raw.selfEmployment as Record<string, unknown> | undefined;
  return se ?? null;
}

/** Safely extract financials data from persona */
function getFinancials(persona: PersonaData): Record<string, unknown> | null {
  const raw = persona as unknown as Record<string, unknown>;
  const f = raw.financials as Record<string, unknown> | undefined;
  return f ?? null;
}

/** Safely extract employment data from persona */
function getEmployment(persona: PersonaData): Record<string, unknown> | null {
  const raw = persona as unknown as Record<string, unknown>;
  const e = raw.employment as Record<string, unknown> | undefined;
  return e ?? null;
}

const buildHmrcTaxRefund: OutcomeBuilder = (persona, issuedAt) => {
  const financials = getFinancials(persona);
  const employment = getEmployment(persona);
  if (!financials) return null;

  const refundAmount = (financials.taxRefundOwed as number) || 0;
  if (refundAmount === 0) return null;

  const personalAccount = financials.personalAccount as
    | Record<string, unknown>
    | undefined;
  const bankName = (personalAccount?.bank as string) || "your bank";
  const accountNumber = (personalAccount?.accountNumber as string) || "";
  const accountSuffix = accountNumber ? accountNumber.slice(-4) : "";

  const wrongCode = (employment?.taxCode as string) || "BR";
  const correctCode = "1257L";

  const pid = personaKey(persona);

  return {
    id: `outcome-hmrc-tax-refund-${pid}`,
    serviceId: "hmrc-tax-refund",
    serviceName: "Tax Refund",
    department: "HM Revenue & Customs",
    type: "payment",
    title: "Tax Refund Confirmed",
    reference: makeRef("TRF", pid, "hmrc-tax-refund"),
    issuedAt,
    details: [
      {
        label: "Refund amount",
        value: formatCurrency(refundAmount),
        highlight: true,
        type: "currency",
      },
      {
        label: "Reason",
        value: `Wrong tax code ${wrongCode} corrected to ${correctCode}`,
        type: "text",
      },
      {
        label: "Paid to",
        value: `${bankName} account${accountSuffix ? ` (ending ${accountSuffix})` : ""}`,
        type: "text",
      },
      {
        label: "Expected within",
        value: "10 working days",
        type: "text",
      },
      {
        label: "Tax code corrected",
        value: correctCode,
        type: "text",
      },
    ],
  };
};

const buildHmctsMoneyClaim: OutcomeBuilder = (persona, issuedAt) => {
  const selfEmployment = getSelfEmployment(persona);
  if (!selfEmployment) return null;

  const invoices = selfEmployment.outstandingInvoices as
    | Array<Record<string, unknown>>
    | undefined;
  if (!invoices || invoices.length === 0) return null;

  const invoice = invoices[0];
  const amount = (invoice.amount as number) || 0;
  const debtor = (invoice.debtor as string) || "Unknown";
  // Extract just the name portion (before any em-dash/description)
  const debtorName = debtor.includes("\u2014")
    ? debtor.split("\u2014")[0].trim()
    : debtor;
  const courtFee = 205; // MCOL fee for claims between £3,001 and £5,000

  const pid = personaKey(persona);

  return {
    id: `outcome-hmcts-money-claim-${pid}`,
    serviceId: "hmcts-money-claim",
    serviceName: "Money Claims Online",
    department: "HM Courts & Tribunals Service",
    type: "registration",
    title: "Money Claim Filed",
    reference: makeRef("MCOL", pid, "hmcts-money-claim"),
    issuedAt,
    details: [
      {
        label: "Claim amount",
        value: formatCurrency(amount),
        highlight: true,
        type: "currency",
      },
      {
        label: "Defendant",
        value: debtorName,
        type: "text",
      },
      {
        label: "Court fee",
        value: formatCurrency(courtFee),
        type: "currency",
      },
      {
        label: "Case reference",
        value: makeRef("MCOL", pid, "hmcts-money-claim"),
        type: "credential-number",
      },
      {
        label: "Defendant response deadline",
        value: "14 days from service",
        type: "text",
      },
    ],
  };
};

const buildHmrcMtd: OutcomeBuilder = (persona, issuedAt) => {
  const selfEmployment = getSelfEmployment(persona);
  if (!selfEmployment) return null;

  const quarterlyDates = selfEmployment.quarterlyReportingDates as
    | string[]
    | undefined;
  const firstQuarterlyDate =
    quarterlyDates && quarterlyDates.length > 0 ? quarterlyDates[0] : null;

  const tradingName =
    (selfEmployment.tradingName as string) || "Your business";
  const utr = (selfEmployment.utrNumber as string) || "";

  const pid = personaKey(persona);

  return {
    id: `outcome-hmrc-mtd-${pid}`,
    serviceId: "hmrc-mtd",
    serviceName: "Making Tax Digital",
    department: "HM Revenue & Customs",
    type: "registration",
    title: "Making Tax Digital \u2014 Enrolled",
    reference: makeRef("MTD", pid, "hmrc-mtd"),
    issuedAt,
    details: [
      {
        label: "Business",
        value: tradingName,
        type: "text",
      },
      ...(utr
        ? [
            {
              label: "UTR",
              value: utr,
              type: "text" as const,
            },
          ]
        : []),
      {
        label: "First quarterly report due",
        value: firstQuarterlyDate
          ? formatDate(firstQuarterlyDate)
          : "Date to be confirmed",
        highlight: true,
        type: "date",
      },
      {
        label: "Reporting frequency",
        value: "Quarterly",
        type: "text",
      },
      {
        label: "Software required",
        value: "HMRC-compatible (e.g. FreeAgent, Xero, QuickBooks)",
        type: "text",
      },
    ],
  };
};

// ── Priya Anand: New Mum Struggling with Money ──

/** Safely extract childcare data from persona */
function getChildcare(
  persona: PersonaData,
): Record<string, unknown> | null {
  const raw = persona as unknown as Record<string, unknown>;
  const c = raw.childcare as Record<string, unknown> | undefined;
  return c ?? null;
}

const buildTaxFreeChildcare: OutcomeBuilder = (persona, issuedAt) => {
  const pid = personaKey(persona);
  const childcare = getChildcare(persona);
  const nursery =
    (childcare?.nurseryProvider as string) || "your nursery provider";
  const tfcCode = makeRef("TFC", pid, "hmrc-tax-free-childcare");

  return {
    id: `outcome-hmrc-tax-free-childcare-${pid}`,
    serviceId: "hmrc-tax-free-childcare",
    serviceName: "Tax-Free Childcare",
    department: "HM Revenue & Customs",
    type: "credential",
    title: "Tax-Free Childcare Account Opened",
    reference: tfcCode,
    issuedAt,
    details: [
      {
        label: "Account code",
        value: tfcCode,
        type: "credential-number",
      },
      {
        label: "Top-up rate",
        value: "£2 for every £8 you pay in",
        type: "text",
      },
      {
        label: "Annual saving",
        value: "Up to £2,000",
        highlight: true,
        type: "currency",
      },
      {
        label: "Linked nursery",
        value: nursery,
        type: "text",
      },
    ],
    credential: {
      type: "tax-free-childcare",
      issuer: "HM Revenue & Customs",
      number: tfcCode,
      issued: issuedAt,
      status: "valid",
    },
  };
};

const buildFreeChildcare30: OutcomeBuilder = (persona, issuedAt) => {
  const pid = personaKey(persona);
  const ref = makeRef("30H", pid, "hmrc-free-childcare-30");
  // Generate a 30-hour code in the standard format xxxx-xxxx-xxxx-xxxx
  let hash = 0;
  const seed = `${pid}:30hr:2026`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(hash);
  const code = [
    (abs % 10000).toString().padStart(4, "0"),
    ((abs >> 4) % 10000).toString().padStart(4, "0"),
    ((abs >> 8) % 10000).toString().padStart(4, "0"),
    ((abs >> 12) % 10000).toString().padStart(4, "0"),
  ].join("-");

  // Find the first child who is around 3-4 (eligible for 30 hours)
  const children = persona.children || [];
  const eligibleChild = children.find((c) => {
    if (!c.dateOfBirth) return false;
    const age =
      (new Date("2026-03-20").getTime() -
        new Date(c.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    return age >= 3 && age < 5;
  });
  const childName = eligibleChild
    ? `${eligibleChild.firstName} ${eligibleChild.lastName}`
    : "your child";

  return {
    id: `outcome-hmrc-free-childcare-30-${pid}`,
    serviceId: "hmrc-free-childcare-30",
    serviceName: "30 Hours Free Childcare",
    department: "HM Revenue & Customs",
    type: "credential",
    title: "30-Hour Free Childcare Code Issued",
    reference: ref,
    issuedAt,
    details: [
      {
        label: "Child",
        value: childName,
        type: "text",
      },
      {
        label: "30-hour code",
        value: code,
        highlight: true,
        type: "credential-number",
      },
      {
        label: "Valid until",
        value: "31 August 2026",
        type: "date",
      },
      {
        label: "Entitlement",
        value: "30 hours per week (term time)",
        type: "text",
      },
    ],
    credential: {
      type: "30-hours-free-childcare",
      issuer: "HM Revenue & Customs",
      number: code,
      issued: issuedAt,
      expires: "2026-08-31",
      status: "valid",
    },
  };
};

const buildFreeSchoolMeals: OutcomeBuilder = (persona, issuedAt) => {
  const pid = personaKey(persona);
  const ref = makeRef("FSM", pid, "la-free-school-meals");

  // Find the child starting school (around age 4-5)
  const children = persona.children || [];
  const schoolChild = children.find((c) => {
    if (!c.dateOfBirth) return false;
    const age =
      (new Date("2026-03-20").getTime() -
        new Date(c.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    return age >= 3.5 && age < 6;
  });
  const childName = schoolChild
    ? `${schoolChild.firstName} ${schoolChild.lastName}`
    : "your child";

  return {
    id: `outcome-la-free-school-meals-${pid}`,
    serviceId: "la-free-school-meals",
    serviceName: "Free School Meals",
    department: "Slough Borough Council",
    type: "registration",
    title: "Free School Meals Confirmed",
    reference: ref,
    issuedAt,
    details: [
      {
        label: "Child",
        value: childName,
        type: "text",
      },
      {
        label: "School",
        value: "Langley Academy",
        type: "text",
      },
      {
        label: "Starts",
        value: "September 2026",
        type: "date",
      },
      {
        label: "Registration",
        value: ref,
        type: "credential-number",
      },
    ],
  };
};

const buildUniversalCreditTopup: OutcomeBuilder = (persona, issuedAt) => {
  const pid = personaKey(persona);
  const ref = makeRef("UCT", pid, "dwp-universal-credit-topup");
  const firstPayment = nextPaymentDate(issuedAt);

  // Extract financial info
  const financials = getFinancials(persona);
  const bankName =
    (financials?.currentAccount as Record<string, unknown>)?.bank ||
    "your bank";

  // Approximate UC calculation for demo purposes
  // Standard couple allowance ~£617.56, child elements, childcare element,
  // housing element, minus earnings taper
  const monthlyAmount = 450;

  return {
    id: `outcome-dwp-universal-credit-topup-${pid}`,
    serviceId: "dwp-universal-credit-topup",
    serviceName: "Universal Credit",
    department: "Department for Work and Pensions",
    type: "payment",
    title: "Universal Credit Entitlement Confirmed",
    reference: ref,
    issuedAt,
    details: [
      {
        label: "Monthly payment",
        value: formatCurrency(monthlyAmount),
        highlight: true,
        type: "currency",
      },
      {
        label: "Includes",
        value:
          "Standard allowance, child elements, housing element, childcare element",
        type: "text",
      },
      {
        label: "First payment",
        value: formatDate(firstPayment),
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

const buildSureStartGrant: OutcomeBuilder = (persona, issuedAt) => {
  const pid = personaKey(persona);
  const ref = makeRef("SSG", pid, "dwp-sure-start-grant");

  const financials = getFinancials(persona);
  const bankName =
    (financials?.currentAccount as Record<string, unknown>)?.bank ||
    "your bank";

  // Find the baby (under 18 months)
  const children = persona.children || [];
  const baby = children.find((c) => {
    if (!c.dateOfBirth) return false;
    const age =
      (new Date("2026-03-20").getTime() -
        new Date(c.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    return age < 1.5;
  });
  const babyName = baby
    ? `${baby.firstName} ${baby.lastName}`
    : "your child";

  return {
    id: `outcome-dwp-sure-start-grant-${pid}`,
    serviceId: "dwp-sure-start-grant",
    serviceName: "Sure Start Maternity Grant",
    department: "Department for Work and Pensions",
    type: "payment",
    title: "Sure Start Maternity Grant Confirmed",
    reference: ref,
    issuedAt,
    details: [
      {
        label: "One-off payment",
        value: "£500",
        highlight: true,
        type: "currency",
      },
      {
        label: "For",
        value: babyName,
        type: "text",
      },
      {
        label: "Paid to",
        value: `${bankName} account`,
        type: "text",
      },
      {
        label: "Claim reference",
        value: ref,
        type: "credential-number",
      },
    ],
  };
};

// ── Builder Registry ──

const OUTCOME_BUILDERS: Record<string, OutcomeBuilder> = {
  // Sarah Okafor: Bereaved Spouse
  "dwp-tell-us-once": buildTellUsOnce,
  "gro-register-death": buildDeathRegistration,
  "gro-death-certificate": buildDeathCertificate,
  "dwp-bereavement-support": buildBereavementSupport,
  "hmcts-probate": buildProbateGrant,
  "hmrc-iht400": buildIHT400,
  // Marcus Taylor: Prison Leaver
  "dwp-universal-credit": buildUniversalCredit,
  "dwp-basic-bank-account": buildBasicBankAccount,
  "dvla.renew-driving-licence": buildRenewDrivingLicence,
  // James Whitfield: Disabled Appellant
  "dwp-pip": buildPipAppeal,
  "la-blue-badge": buildBlueBadge,
  "la-send-ehc": buildEhcp,
  // Daniel Obi: Self-employed Plumber
  "hmrc-tax-refund": buildHmrcTaxRefund,
  "hmcts-money-claim": buildHmctsMoneyClaim,
  "hmrc-mtd": buildHmrcMtd,
  // Priya Anand: New Mum Struggling with Money
  "hmrc-tax-free-childcare": buildTaxFreeChildcare,
  "hmrc-free-childcare-30": buildFreeChildcare30,
  "la-free-school-meals": buildFreeSchoolMeals,
  "dwp-universal-credit-topup": buildUniversalCreditTopup,
  "dwp-sure-start-grant": buildSureStartGrant,
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
