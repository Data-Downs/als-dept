# Brief: Unified Citizen Data Model

> **Purpose**: Implementation specification for evolving the citizen data model across `@als/personal-data`, the citizen app, and the legibility studio.
>
> **Context**: A three-way reconciliation of (1) the GDS "Data needs for GOV.UK Agents" spreadsheet (99 requirements), (2) the current TypeScript data model spread across 3 files, and (3) the 8 persona extension designs has identified significant gaps. This brief specifies how to close them.
>
> **Reconciliation source**: `Data-Reconciliation-GDS-vs-ALS-Model.xlsx` (private, not in repo)

---

## 1. Problem Statement

The current data model has three issues:

1. **Fragmented** — citizen data is defined across `apps/citizen/lib/types.ts` (PersonaData), `packages/personal-data/src/data-model.ts` (VerifiedData, SubmittedData, InferredData), and `packages/identity/src/credential-types.ts` (TestUser). These overlap and diverge. There is no single source of truth.

2. **Missing source attribution** — no field tracks which government department holds the data. The GDS spreadsheet has a `Source of data` column (HMRC, DWP, Home Office, DVLA, etc.) that we need in our model. The legibility studio needs to show "HMRC holds your income data" and the citizen app needs to know which department to query.

3. **Missing 66 fields** — the persona extensions (bereavement, immigration, justiceHistory, childcare, appeals, selfEmployment, firstTimer, growingFamily) are designed on the personas page but not yet implemented in TypeScript. Another 33 GDS requirements have no model representation at all.

---

## 2. Target Architecture

### 2.1 Single data model file

Consolidate into one authoritative file:

```
packages/personal-data/src/citizen-data-model.ts
```

This replaces the current split across `data-model.ts`, `types.ts` PersonaData, and `credential-types.ts` TestUser. The other files should re-export from this one for backwards compatibility.

### 2.2 Every field gets metadata

Every data field in the model must carry:

```typescript
interface DataFieldMeta {
  /** Which government department(s) are the authoritative source */
  sources: DataSource[];
  /** Topic classification for grouping and display */
  topic: DataTopic;
  /** Trust tier: how confident are we in this data? */
  tier: DataTier;
  /** GDS requirement ID if this maps to the GDS spreadsheet */
  gdsRequirementId?: string;
}

type DataTier = "verified" | "submitted" | "inferred";

type DataTopic =
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

type DataSource =
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
```

### 2.3 Field registry pattern

Rather than scattering metadata in comments, use a runtime-queryable registry:

```typescript
/** Master registry of all citizen data fields */
const FIELD_REGISTRY: Record<string, DataFieldMeta> = {
  "primaryContact.firstName":     { sources: ["User"], topic: "identity", tier: "verified", gdsRequirementId: "REQ.ID36" },
  "primaryContact.dateOfBirth":   { sources: ["User"], topic: "identity", tier: "verified", gdsRequirementId: "REQ.ID22" },
  "primaryContact.nationalInsuranceNumber": { sources: ["DWP", "HMRC"], topic: "finance", tier: "verified", gdsRequirementId: "REQ.ID52" },
  "address.postcode":             { sources: ["HMRC", "DVLA", "Local Authority"], topic: "housing", tier: "verified", gdsRequirementId: "REQ.ID71" },
  "employment.income":            { sources: ["HMRC"], topic: "finance", tier: "verified", gdsRequirementId: "REQ.ID42" },
  "vehicles[0].registrationNumber": { sources: ["DVLA"], topic: "driving", tier: "verified", gdsRequirementId: "REQ.ID94" },
  "vehicles[0].motExpiry":        { sources: ["DVLA"], topic: "driving", tier: "verified", gdsRequirementId: "REQ.ID48" },
  "bereavement.dateOfDeath":      { sources: ["General Register Office"], topic: "legal", tier: "verified" },
  "bereavement.probateStatus":    { sources: ["HMCTS"], topic: "legal", tier: "verified" },
  "immigration.status":           { sources: ["Home Office"], topic: "immigration", tier: "verified" },
  "immigration.rightToWork":      { sources: ["Home Office"], topic: "immigration", tier: "verified" },
  "justiceHistory.licenceConditions": { sources: ["HMPPS"], topic: "justice", tier: "verified" },
  "childcare.taxFreeChildcareAccount": { sources: ["HMRC"], topic: "finance", tier: "verified", gdsRequirementId: "REQ.ID85" },
  "appeals.pipMandatoryRecon":    { sources: ["DWP"], topic: "disability", tier: "verified" },
  "selfEmployment.utrNumber":     { sources: ["HMRC"], topic: "business", tier: "verified", gdsRequirementId: "REQ.ID90" },
  "firstTimer.passportStatus":    { sources: ["HM Passport Office"], topic: "identity", tier: "verified" },
  "growingFamily.hicbcRisk":      { sources: ["HMRC"], topic: "finance", tier: "inferred" },
  // ... full registry to be populated from reconciliation spreadsheet
};
```

This registry enables:
- `getFieldsBySource("HMRC")` → all fields HMRC holds
- `getFieldsByTopic("driving")` → all driving-related fields
- `getFieldsByTier("verified")` → all high-trust fields
- Legibility studio can render "Data held by department" views
- Citizen app can show "Where this data comes from" in consent flows

---

## 3. New Interfaces to Add

### 3.1 Persona-specific data blocks

Add these to the unified `CitizenProfile` interface. Each is optional — only present for personas that need it.

```typescript
interface CitizenProfile {
  // ... existing fields (primaryContact, address, employment, etc.) ...

  /** Bereavement context — Sarah Okafor */
  bereavement?: {
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
  };

  /** Immigration context — Amina Hassan, Fatima & Tomasz Nowak */
  immigration?: {
    status: "refugee" | "settled" | "pre_settled" | "leave_to_remain" | "visa" | "citizen" | "other";
    homeOfficeRef?: string;
    brpNumber?: string;
    brpExpiry?: string;
    eVisaMigrationDate?: string;
    rightToWork: boolean;
    rightToRent: boolean;
    languageProficiency?: "basic" | "intermediate" | "fluent" | "native";
    accommodationType?: string;
    ninoStatus?: "received" | "applied" | "not_applied";
  };

  /** Justice history — Marcus Taylor */
  justiceHistory?: {
    releaseDate: string;
    sentenceLength: string;
    offenceCategory: string;
    licenceConditions: string[];
    licenceEndDate: string;
    probationOfficer?: string;
    reportingSchedule?: string;
    restrictions?: string[];
    dbsDisclosureStatus: "undisclosed" | "basic" | "standard" | "enhanced";
    approvedPremisesDeadline?: string;
  };

  /** Childcare and early years — Priya Anand */
  childcare?: {
    nurseryProvider?: string;
    nurseryCostMonthly?: number;
    thirtyHourCode?: string;
    thirtyHourCodeExpiry?: string;
    taxFreeChildcareAccount: boolean;
    taxFreeChildcareBalance?: number;
    fsmEligibility: boolean;
    schoolRegistrationStatus?: "not_started" | "applied" | "offered" | "accepted";
  };

  /** Appeals and tribunals — James Whitfield */
  appeals?: {
    pipMandatoryRecon?: { status: "pending" | "upheld" | "overturned"; date: string };
    tribunalAppealRef?: string;
    tribunalHearingDate?: string;
    ehcpApplicationDate?: string;
    ehcpStatutoryDeadline?: string;
    ehcpCurrentWeek?: number;
    sendTribunalStatus?: "not_started" | "filed" | "hearing_scheduled" | "decided";
    legalAidEligibility?: boolean;
    evidenceChecklist?: Array<{ item: string; status: "needed" | "obtained" | "submitted" }>;
  };

  /** Self-employment — Daniel Obi */
  selfEmployment?: {
    tradingName?: string;
    utrNumber?: string;
    turnover: number;
    expenses: number;
    netProfit: number;
    mtdStatus: "not_required" | "required_not_enrolled" | "enrolled" | "compliant";
    mtdDeadline?: string;
    outstandingInvoices?: Array<{ debtor: string; amount: number; dueDate: string; monthsOverdue: number }>;
    quarterlyReportingDates?: string[];
    saFilingHistory?: Array<{ year: string; filedDate: string; onTime: boolean }>;
  };

  /** First-time government user — Zara Begum */
  firstTimer?: {
    educationStatus?: { qualifications: string; universityOffer?: string; ucasRef?: string };
    studentFinanceStatus?: "not_applied" | "applied" | "approved" | "receiving";
    parentalIncomeRequired?: boolean;
    niNumberStatus: "received" | "missing" | "applied";
    provisionalLicence?: { number: string; issueDate: string };
    drivingTestBooking?: { ref: string; date: string; centre: string };
    payeDetails?: { employer: string; taxCode: string; starterChecklistStatus: "correct" | "wrong" | "unknown" };
    passportStatus: "none" | "child_expired" | "adult_applied" | "adult_valid";
    institutionalLiteracy: "low" | "medium" | "high";
  };

  /** Growing family with multiple children — Fatima & Tomasz Nowak */
  growingFamily?: {
    children: Array<{
      name: string;
      age: number;
      school?: string;
      yearGroup?: string;
      specialNeeds?: { condition: string; ehcpStatus?: string };
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
    secondaryTransferStatus?: "not_applicable" | "preferences_submitted" | "offered" | "accepted";
    childBenefitClaims?: { childCount: number; weeklyAmount: number };
    hicbcRisk?: { highestEarnerIncome: number; thresholdBreached: boolean; estimatedCharge?: number };
    householdIncomeBreakdown?: Array<{ earner: string; amount: number; source: string }>;
    immigrationStatusPerMember?: Array<{ name: string; status: string; eVisaLinked: boolean; brpExpiry?: string }>;
    carersAllowanceEligibility?: { eligible: boolean; interactionWithUC?: string };
    rightToWorkShareCode?: { code: string; expiryDate: string };
  };
}
```

### 3.2 GDS gap fields to add

These fields from the GDS spreadsheet are currently missing entirely and should be added to the base `CitizenProfile`:

```typescript
interface CitizenProfile {
  // ... add to existing base fields ...

  /** GOV.UK One Login identifier */
  oneLoginId?: string;

  /** Passport details */
  passport?: {
    number?: string;
    expiryDate?: string;
    status: "valid" | "expired" | "none";
  };

  /** NHS number — verified health identifier */
  nhsNumber?: string;

  /** Nationality */
  nationality?: string;

  /** Unique Learner Number (education) */
  uniqueLearnerNumber?: string;

  /** Council tax status */
  councilTaxStatus?: { band?: string; paymentStatus?: string };

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

  /** Notification preferences */
  notificationPreferences?: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };

  /** Title (Mr, Mrs, Dr, etc.) */
  title?: string;

  /** Communication preferences and context */
  chatHistory?: { sessionCount: number; lastSessionDate: string };
  topicPreferences?: string[];
}
```

---

## 4. Source Attribution in Persona JSON Files

Each persona JSON file in `data/simulated/users/` must be extended with a `_fieldSources` block that maps field paths to their department source for that specific persona. This allows the same field (e.g. address) to come from different departments for different people.

```json
{
  "personaId": "sarah-okafor",
  "personaName": "Sarah Okafor",
  "_fieldSources": {
    "primaryContact.firstName": { "source": "User", "tier": "verified", "topic": "identity" },
    "primaryContact.nationalInsuranceNumber": { "source": "DWP", "tier": "verified", "topic": "finance" },
    "address": { "source": "HMRC", "tier": "verified", "topic": "housing" },
    "employment.income": { "source": "HMRC", "tier": "verified", "topic": "finance" },
    "bereavement.probateStatus": { "source": "HMCTS", "tier": "verified", "topic": "legal" },
    "bereavement.ihtLiability": { "source": "HMRC", "tier": "verified", "topic": "finance" },
    "bereavement.dateOfDeath": { "source": "General Register Office", "tier": "verified", "topic": "legal" }
  }
}
```

For Daniel Obi, the same address field might source from Companies House (sole trader registration). For Amina, it comes from Home Office (dispersal accommodation). The `_fieldSources` block is per-persona, not global.

### Variation rules

When generating `_fieldSources` for each persona:

- **Sarah**: address from HMRC (tax records), income from HMRC, bereavement fields from HMCTS/GRO
- **Amina**: address from Home Office, immigration fields from Home Office, NI from DWP
- **Marcus**: address from HMPPS (approved premises), justice fields from HMPPS, DBS from Home Office
- **Priya**: address from DWP (UC claim), childcare fields from HMRC/DfE, income from HMRC
- **James**: address from DWP (ESA claim), health from NHS, appeals from DWP/HMCTS, EHCP from Local Authority
- **Daniel**: address from HMRC (SA return), self-employment from HMRC, vehicles from DVLA
- **Zara**: address from User (parents' address), education from DfE, driving from DVLA, passport from HM Passport Office
- **Nowaks**: address from Local Authority (council housing), immigration from Home Office, EHCP from Local Authority, driving from DVLA

---

## 5. Changes Required by Package

### 5.1 `packages/personal-data/`

| File | Action |
|------|--------|
| `src/citizen-data-model.ts` | **CREATE** — new unified model file with `CitizenProfile`, `DataFieldMeta`, `FIELD_REGISTRY`, all types from sections 2 and 3 above |
| `src/data-model.ts` | **MODIFY** — keep existing interfaces but re-export from `citizen-data-model.ts`. Add deprecation comments pointing to new file |
| `src/submitted-store.ts` | **MODIFY** — update `PROPERTY_CATEGORY` map to include all new categories: `immigration`, `justice`, `bereavement`, `childcare`, `appeals`, `selfEmployment`, `firstTimer`, `growingFamily`, `driving`, `education`, `legal` |
| `src/field-registry.ts` | **CREATE** — export `FIELD_REGISTRY` and helper functions: `getFieldsBySource()`, `getFieldsByTopic()`, `getFieldsByTier()`, `getFieldMetaForPath()` |
| `src/index.ts` | **MODIFY** — export new types and registry |

### 5.2 `apps/citizen/`

| File | Action |
|------|--------|
| `lib/types.ts` | **MODIFY** — import `CitizenProfile` from `@als/personal-data` and make `PersonaData` extend it (or alias it). Remove duplicated field definitions. Keep app-specific UI types (ChatMessage, AgentTask, etc.) |
| `lib/service-data.ts` | **MODIFY** — import the 8 new persona JSON files |
| `lib/persona-meta.ts` | **MODIFY** — add entries for `zara-begum` and `fatima-nowak` with colours (#28a197 and #4c2c92) |
| `components/Dashboard.tsx` | **MODIFY** — update `isServiceRelevant()` to check new field blocks: `immigration`, `justiceHistory`, `bereavement`, `selfEmployment`, `childcare`, `appeals`, `firstTimer`, `growingFamily` |
| `components/ConsentFlow.tsx` (or equivalent) | **MODIFY** — use `FIELD_REGISTRY` to display "This data comes from [HMRC]" in consent screens |

### 5.3 `packages/identity/`

| File | Action |
|------|--------|
| `src/credential-types.ts` | **MODIFY** — `TestUser` should extend or align with `CitizenProfile`. Remove fields that duplicate the unified model. Keep authentication-specific fields (`credentials`, `verificationLevel`) |

### 5.4 `packages/schemas/`

No structural changes needed. The `CapabilityManifest` input/output schemas already reference field names — these should use the same field paths as `FIELD_REGISTRY` for consistency.

### 5.5 `apps/legibility-studio/`

| Area | Action |
|------|--------|
| Data source view | **NEW FEATURE** — add a view that shows, for a given persona, which departments hold which data. Reads `_fieldSources` from persona JSON. Groups by department, shows field names and topics |
| Consent audit view | **ENHANCE** — when showing consent grants, include the source department and topic from `FIELD_REGISTRY` |
| Service artefact view | **ENHANCE** — when displaying a service's `input_schema`, cross-reference with `FIELD_REGISTRY` to show which department provides each required input |

### 5.6 `data/simulated/users/`

| File | Action |
|------|--------|
| `sarah-okafor.json` | **CREATE** — full persona with `bereavement` block and `_fieldSources` |
| `amina-hassan.json` | **CREATE** — full persona with `immigration` block and `_fieldSources` |
| `marcus-taylor.json` | **CREATE** — full persona with `justiceHistory` block and `_fieldSources` |
| `priya-anand.json` | **CREATE** — full persona with `childcare` block and `_fieldSources` |
| `james-whitfield.json` | **CREATE** — full persona with `appeals` block and `_fieldSources` |
| `daniel-obi.json` | **CREATE** — full persona with `selfEmployment` block and `_fieldSources` |
| `zara-begum.json` | **CREATE** — full persona with `firstTimer` block and `_fieldSources` |
| `fatima-nowak.json` | **CREATE** — full persona with `growingFamily` block and `_fieldSources` |

Each persona JSON should include all base fields (primaryContact, address, employment, financials, vehicles, children, benefits, healthInfo) populated with realistic data from the persona designs in `docs/personas.html`, PLUS the persona-specific block, PLUS the `_fieldSources` attribution map.

---

## 6. Implementation Order

1. **Create `citizen-data-model.ts`** with all types and the `FIELD_REGISTRY` — this is the foundation everything else depends on
2. **Create `field-registry.ts`** with query helper functions
3. **Update `submitted-store.ts`** category map
4. **Create the 8 persona JSON files** in `data/simulated/users/` with full data and `_fieldSources`
5. **Update `apps/citizen/lib/types.ts`** to import from the unified model
6. **Update `apps/citizen/lib/persona-meta.ts`** and `service-data.ts`** for new personas
7. **Update `Dashboard.tsx`** relevance logic
8. **Update `credential-types.ts`** to align with unified model
9. **Add legibility studio data source view**
10. **Run `npm test`** — fix any breakage from type changes

---

## 7. Testing Requirements

- All existing tests must pass after refactor (type aliases provide backwards compatibility)
- New tests for `FIELD_REGISTRY` query functions
- New tests for each persona JSON loading correctly
- Dashboard tests for new persona relevance checks
- Evidence/submitted-store tests for new categories
- Legibility studio tests for data source rendering

---

## 8. What NOT to Change

- **Service artefacts** (`data/services/*/manifest.json`, `policy.json`, etc.) — these are service-side, not citizen-side
- **Orchestrator** (`packages/runtime/`) — no structural changes; it reads persona data through the same interface
- **Evidence/traces** (`packages/evidence/`) — trace events don't change; they record what happened, not who the citizen is
- **MCP server** (`packages/mcp-server/`) — serves service tools, not citizen data

---

## 9. Reconciliation Numbers

| Metric | Count |
|--------|-------|
| GDS data requirements | 99 |
| Currently modelled fields | 47 (across 3 files) |
| Fully covered by current model | 19 |
| Partially covered | 7 |
| Covered by persona extensions (not yet implemented) | 12 |
| Service config (belongs in artefacts, not persona) | 24 |
| Event/trace data (belongs in evidence system) | 4 |
| Genuine gaps requiring new fields | 33 |
| New persona-specific field blocks | 8 |
| New fields in persona extensions | 66 |
| Current model fields needing source metadata added | 29 |
| Distinct source departments in final model | 22 |
| Distinct topic classifications | 14 |
