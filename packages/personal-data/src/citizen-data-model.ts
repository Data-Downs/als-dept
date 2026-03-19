/**
 * Unified Citizen Data Model
 *
 * Single source of truth for all citizen data fields across the ALS platform.
 * Replaces the fragmented definitions in data-model.ts (PersonalDataProfile),
 * types.ts (PersonaData), and credential-types.ts (TestUser).
 *
 * Every field carries metadata (source department, topic, trust tier) via
 * the companion FIELD_REGISTRY in field-registry.ts.
 *
 * See docs/BRIEF-unified-data-model.md for the full specification.
 */

// ── Source Attribution Types ──

/** Which government department or body is the authoritative source */
export type DataSource =
  | "HMRC"
  | "DWP"
  | "Home Office"
  | "HM Passport Office"
  | "DVLA"
  | "DVSA"
  | "DfE"
  | "SLC"
  | "HMPPS"
  | "HMCTS"
  | "DBS"
  | "LAA"
  | "NHS"
  | "Companies House"
  | "Charity Commission"
  | "Local Authority"
  | "General Register Office"
  | "GDS"
  | "GOV.UK App"
  | "GOV.UK Pay"
  | "User"
  | "Agent inference"
  | "UCAS";

/** Topic classification for grouping and display */
export type DataTopic =
  | "identity"
  | "finance"
  | "employment"
  | "health"
  | "disability"
  | "education"
  | "immigration"
  | "justice"
  | "driving"
  | "parenting"
  | "housing"
  | "business"
  | "legal"
  | "general";

/** Trust tier: how confident are we in this data? */
export type DataTier = "verified" | "submitted" | "inferred";

/** Metadata for a single data field in the registry */
export interface DataFieldMeta {
  /** Which government department(s) are the authoritative source */
  sources: DataSource[];
  /** Topic classification for grouping and display */
  topic: DataTopic;
  /** Trust tier: how confident are we in this data? */
  tier: DataTier;
  /** GDS requirement ID if this maps to the GDS spreadsheet */
  gdsRequirementId?: string;
}

// ── Per-persona source attribution (stored in JSON files) ──

export interface FieldSourceAttribution {
  source: DataSource;
  tier: DataTier;
  topic: DataTopic;
}

// ── Core Profile ──

export interface CitizenProfile {
  personaId: string;
  personaName: string;
  description: string;

  /** GOV.UK One Login identifier */
  oneLoginId?: string;

  /** Title (Mr, Mrs, Dr, etc.) */
  title?: string;

  /** Nationality */
  nationality?: string;

  primaryContact: {
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    nationalInsuranceNumber?: string;
    email?: string;
    phone?: string;
  };

  partner?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationalInsuranceNumber?: string;
    email?: string;
    phone?: string;
    occupation?: string;
  };

  address: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country?: string;
    residingSince?: string;
    housingStatus?: string;
  };

  /** Passport details */
  passport?: {
    number?: string;
    expiryDate?: string;
    status: "valid" | "expired" | "none";
  };

  /** NHS number */
  nhsNumber?: string;

  /** Unique Learner Number (education) */
  uniqueLearnerNumber?: string;

  // ── Employment ──

  employment?: Record<string, unknown>;
  spouseEmployment?: Record<string, unknown>;

  /** Employment history */
  employmentHistory?: Array<{
    employer: string;
    startDate: string;
    endDate?: string;
    payeRef?: string;
  }>;

  /** Workplace details */
  workplace?: {
    name?: string;
    address?: string;
    contact?: string;
  };

  // ── Financial ──

  financials?: Record<string, unknown>;

  /** Council tax status */
  councilTaxStatus?: {
    band?: string;
    paymentStatus?: string;
  };

  /** NI contribution record */
  niRecord?: {
    qualifyingYears: number;
    gaps: Array<{ year: string; shortfall: number }>;
    voluntaryContributionCost?: number;
  };

  /** State pension forecast */
  statePensionForecast?: {
    weeklyAmount: number;
    pensionAge: number;
    forecastDate: string;
  };

  // ── Family & Dependants ──

  children?: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    childBenefitNumber?: string;
  }>;

  pregnancy?: {
    dueDate: string;
    hospital?: string;
    midwife?: string;
    firstBaby?: boolean;
    expectedArrival?: string;
  };

  family?: {
    supportNetwork?: string[];
    notes?: string;
  };

  spouse?: Record<string, unknown>;
  deceased?: Record<string, unknown>;

  // ── Assets & Property ──

  vehicles?: Vehicle[];
  businessAssets?: Record<string, unknown>;

  housing?: {
    type?: string;
    landlord?: string;
    leaseEnd?: string;
    mortgageProvider?: string;
    mortgageBalance?: number;
    monthlyPayment?: number;
  };

  // ── Benefits & Entitlements ──

  benefits?: {
    currentlyReceiving?: Array<{
      type: string;
      amount: number;
      frequency: string;
      startDate?: string;
      reason?: string;
    }>;
    potentiallyEligibleFor?: string[];
    previousClaims?: Array<Record<string, unknown>>;
  };

  // ── Health ──

  healthInfo?: Record<string, unknown>;

  // ── Communication & Preferences ──

  communicationStyle?: {
    tone: string;
    techSavvy: string;
    primaryConcerns: string[];
    typicalPhrases: string[];
  };

  /** Notification preferences */
  notificationPreferences?: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };

  /** Chat history summary */
  chatHistory?: {
    sessionCount: number;
    lastSessionDate: string;
  };

  /** Topic preferences */
  topicPreferences?: string[];

  // ── Wallet Credentials ──

  credentials?: WalletCredential[];

  // ── Legacy fields for backwards compatibility with TestUser ──

  /** @deprecated Use primaryContact.firstName + lastName */
  name?: string;
  /** @deprecated Use primaryContact.dateOfBirth */
  date_of_birth?: string;
  /** @deprecated Derive from primaryContact.dateOfBirth */
  age?: number;
  /** @deprecated Use primaryContact.nationalInsuranceNumber */
  national_insurance_number?: string;
  /** @deprecated Use employment */
  employment_status?: string;
  /** @deprecated Use employment */
  employer?: string;
  /** @deprecated Use employment */
  self_employed?: boolean;
  /** @deprecated Use financials */
  income?: number;
  /** @deprecated Use financials */
  savings?: number;
  /** @deprecated Use financials */
  bank_account?: boolean;
  /** @deprecated Use statePensionForecast */
  over_70?: boolean;
  /** @deprecated Use address */
  no_fixed_address?: boolean;
  /** @deprecated Use niRecord */
  pension_qualifying_years?: number;
  /** @deprecated Use address */
  jurisdiction?: string;
  /** @deprecated Use persona-meta.ts colour */
  color?: string;
  /** @deprecated Use personaId */
  id?: string;

  // ── Persona-Specific Extension Blocks ──

  /** Bereavement context — Sarah Okafor */
  bereavement?: BereavementData;

  /** Immigration context — Amina Hassan, Fatima & Tomasz Nowak */
  immigration?: ImmigrationData;

  /** Justice history — Marcus Taylor */
  justiceHistory?: JusticeHistoryData;

  /** Childcare and early years — Priya Anand */
  childcare?: ChildcareData;

  /** Appeals and tribunals — James Whitfield */
  appeals?: AppealsData;

  /** Self-employment — Daniel Obi */
  selfEmployment?: SelfEmploymentData;

  /** First-time government user — Zara Begum */
  firstTimer?: FirstTimerData;

  /** Growing family with multiple children — Fatima & Tomasz Nowak */
  growingFamily?: GrowingFamilyData;

  // ── Relationships & Delegation ──

  /** Relationships with other citizens */
  relationships?: FamilyRelationship[];

  /** Household membership */
  householdId?: string;

  /** Delegated actions log — actions taken on behalf of this person */
  delegatedActions?: DelegatedAction[];

  // ── Source Attribution ──

  /** Per-field source attribution — which department holds each piece of data */
  _fieldSources?: Record<string, FieldSourceAttribution>;
}

// ── Extension Block Interfaces ──

export interface BereavementData {
  deceasedName: string;
  dateOfDeath: string;
  relationship: string;
  estateValue?: number;
  willExists: boolean;
  executorStatus: "named" | "pending" | "not_executor";
  probateStatus: "not_started" | "applied" | "granted";
  tellUsOnceRef?: string;
  ihtLiability?: number;
  pensionProviders?: string[];
}

export interface ImmigrationData {
  status:
    | "refugee"
    | "settled"
    | "pre_settled"
    | "leave_to_remain"
    | "visa"
    | "citizen"
    | "other";
  homeOfficeRef?: string;
  brpNumber?: string;
  brpExpiry?: string;
  eVisaMigrationDate?: string;
  rightToWork: boolean;
  rightToRent: boolean;
  languageProficiency?: "basic" | "intermediate" | "fluent" | "native";
  accommodationType?: string;
  ninoStatus?: "received" | "applied" | "not_applied";
}

export interface JusticeHistoryData {
  releaseDate: string;
  sentenceLength: string;
  offenceCategory: string;
  licenceConditions: string[];
  licenceEndDate: string;
  probationOfficer?: string;
  reportingSchedule?: string;
  restrictions?: string[];
  dbsDisclosureStatus:
    | "undisclosed"
    | "basic"
    | "standard"
    | "enhanced";
  approvedPremisesDeadline?: string;
}

export interface ChildcareData {
  nurseryProvider?: string;
  nurseryCostMonthly?: number;
  thirtyHourCode?: string;
  thirtyHourCodeExpiry?: string;
  taxFreeChildcareAccount: boolean;
  taxFreeChildcareBalance?: number;
  fsmEligibility: boolean;
  schoolRegistrationStatus?:
    | "not_started"
    | "applied"
    | "offered"
    | "accepted";
}

export interface AppealsData {
  pipMandatoryRecon?: {
    status: "pending" | "upheld" | "overturned";
    date: string;
  };
  tribunalAppealRef?: string;
  tribunalHearingDate?: string;
  ehcpApplicationDate?: string;
  ehcpStatutoryDeadline?: string;
  ehcpCurrentWeek?: number;
  sendTribunalStatus?:
    | "not_started"
    | "filed"
    | "hearing_scheduled"
    | "decided";
  legalAidEligibility?: boolean;
  evidenceChecklist?: Array<{
    item: string;
    status: "needed" | "obtained" | "submitted";
  }>;
}

export interface SelfEmploymentData {
  tradingName?: string;
  utrNumber?: string;
  turnover: number;
  expenses: number;
  netProfit: number;
  mtdStatus:
    | "not_required"
    | "required_not_enrolled"
    | "enrolled"
    | "compliant";
  mtdDeadline?: string;
  outstandingInvoices?: Array<{
    debtor: string;
    amount: number;
    dueDate: string;
    monthsOverdue: number;
  }>;
  quarterlyReportingDates?: string[];
  saFilingHistory?: Array<{
    year: string;
    filedDate: string;
    onTime: boolean;
  }>;
}

export interface FirstTimerData {
  educationStatus?: {
    qualifications: string;
    universityOffer?: string;
    ucasRef?: string;
  };
  studentFinanceStatus?:
    | "not_applied"
    | "applied"
    | "approved"
    | "receiving";
  parentalIncomeRequired?: boolean;
  niNumberStatus: "received" | "missing" | "applied";
  provisionalLicence?: {
    number: string;
    issueDate: string;
  };
  drivingTestBooking?: {
    ref: string;
    date: string;
    centre: string;
  };
  payeDetails?: {
    employer: string;
    taxCode: string;
    starterChecklistStatus: "correct" | "wrong" | "unknown";
  };
  passportStatus: "none" | "child_expired" | "adult_applied" | "adult_valid";
  institutionalLiteracy: "low" | "medium" | "high";
}

export interface GrowingFamilyData {
  children: Array<{
    name: string;
    age: number;
    school?: string;
    yearGroup?: string;
    specialNeeds?: {
      condition: string;
      ehcpStatus?: string;
    };
    fsmStatus: boolean;
  }>;
  ehcpDetails?: {
    childName: string;
    condition: string;
    applicationDate: string;
    currentWeek: number;
    epAssessmentStatus: "not_scheduled" | "scheduled" | "completed";
    preferredProvision?: string;
    statutoryDeadline: string;
  };
  secondaryTransferStatus?:
    | "not_applicable"
    | "preferences_submitted"
    | "offered"
    | "accepted";
  childBenefitClaims?: {
    childCount: number;
    weeklyAmount: number;
  };
  hicbcRisk?: {
    highestEarnerIncome: number;
    thresholdBreached: boolean;
    estimatedCharge?: number;
  };
  householdIncomeBreakdown?: Array<{
    earner: string;
    amount: number;
    source: string;
  }>;
  immigrationStatusPerMember?: Array<{
    name: string;
    status: string;
    eVisaLinked: boolean;
    brpExpiry?: string;
  }>;
  carersAllowanceEligibility?: {
    eligible: boolean;
    interactionWithUC?: string;
  };
  rightToWorkShareCode?: {
    code: string;
    expiryDate: string;
  };
}

// ── Shared Sub-types ──

export interface Vehicle {
  make: string;
  model: string;
  year: number;
  color?: string;
  registrationNumber: string;
  owner?: string;
  motExpiry?: string;
  taxExpiry?: string;
  insuranceExpiry?: string;
  businessUse?: boolean;
  annualMileage?: number;
  notes?: string;
}

export interface WalletCredential {
  type: string;
  issuer: string;
  number?: string;
  issued?: string;
  expires?: string;
  status: "valid" | "expired" | "revoked" | "suspended";
  claims?: Record<string, unknown>;
}

// ── Relationship & Delegation Types ──

export type RelationshipType =
  | "spouse"
  | "partner"
  | "parent_of"
  | "child_of"
  | "guardian_of"
  | "executor_of"
  | "carer_of"
  | "attorney_of"
  | "representative_of";

export type PermissionScope =
  | "view_status"
  | "view_data"
  | "submit_on_behalf"
  | "receive_alerts"
  | "manage_consent"
  | "make_payments"
  | "appeal_decisions"
  | "correspond"
  | "full_authority";

/** A relationship between two citizens */
export interface FamilyRelationship {
  id: string;
  /** The person who holds this relationship (e.g., the parent) */
  fromUserId: string;
  /** The person this relationship is with (e.g., the child) */
  toUserId: string;
  /** Type of relationship */
  type: RelationshipType;
  /** Whether this relationship is legally verified or self-declared */
  verification: "verified" | "declared";
  /** Source of verification (e.g., "General Register Office", "Court Order") */
  verificationSource?: string;
  /** When the relationship was established in the system */
  createdAt: string;
  /** Whether the relationship is currently active */
  active: boolean;
  /** Permissions granted in this direction */
  permissions: DelegationPermission[];
}

/** A specific permission grant within a relationship */
export interface DelegationPermission {
  scope: PermissionScope;
  /** Who granted this permission */
  grantedBy: string;
  /** When it was granted */
  grantedAt: string;
  /** Optional expiry (e.g., Power of Attorney until a date) */
  expiresAt?: string;
  /** Whether the other party can revoke this */
  revocable: boolean;
  /** Optional restriction to specific services */
  serviceFilter?: string[];
}

/** A household grouping — connects related citizens */
export interface Household {
  id: string;
  name: string;
  members: HouseholdMemberRef[];
  createdAt: string;
}

export interface HouseholdMemberRef {
  userId: string;
  role: "primary" | "partner" | "child" | "dependent" | "other";
  joinedAt: string;
}

/** An action taken by one person on behalf of another */
export interface DelegatedAction {
  id: string;
  /** Who performed the action */
  actorUserId: string;
  /** On whose behalf */
  subjectUserId: string;
  /** The relationship that authorised this action */
  relationshipId: string;
  /** What was done */
  action: string;
  /** Which service */
  serviceId: string;
  /** Timestamp */
  performedAt: string;
  /** Whether the subject has been notified */
  subjectNotified: boolean;
  /** Notification timestamp */
  notifiedAt?: string;
}
