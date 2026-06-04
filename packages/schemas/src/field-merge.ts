/**
 * field-merge.ts — Canonical field deduplication across services.
 *
 * When a plan spans several services, many ask for the same logical data under
 * different field keys (deceased's name, citizen NI number, …). This maps the
 * service-specific keys to canonical fields so a citizen is asked once and the
 * answer fans out — the "87 → a handful" collapse. Pure: callers pass the
 * already-resolved consent data, so both the app and the web renderer compute
 * the identical canonical set.
 */

/** Canonical field → its human label and the service-specific aliases. */
export const FIELD_ALIASES: Record<
  string,
  { label: string; aliases: string[] }
> = {
  deceased_name: {
    label: "Full name of the person who died",
    aliases: [
      "deceased_full_name",
      "deceased_surname",
      "partner_full_name",
      "partner_name",
    ],
  },
  deceased_dob: {
    label: "Date of birth of the person who died",
    aliases: ["deceased_date_of_birth", "partner_date_of_birth"],
  },
  deceased_date_of_death: {
    label: "Date of death",
    aliases: ["date_of_death", "partner_date_of_death", "deceased_date_of_death"],
  },
  deceased_ni: {
    label: "National Insurance number of the person who died",
    aliases: [
      "deceased_national_insurance_number",
      "partner_ni_number",
      "partner_ni_contributions_history",
    ],
  },
  deceased_address: {
    label: "Last address of the person who died",
    aliases: ["deceased_usual_address", "deceased_address"],
  },
  deceased_marital_status: {
    label: "Marital status of the person who died",
    aliases: ["deceased_marital_status", "marital_status"],
  },
  deceased_occupation: {
    label: "Occupation of the person who died",
    aliases: ["deceased_occupation"],
  },
  deceased_nhs_number: {
    label: "NHS number of the person who died",
    aliases: ["deceased_nhs_number"],
  },
  deceased_place_of_death: {
    label: "Place of death",
    aliases: ["deceased_place_of_death"],
  },
  citizen_name: {
    label: "Your full name",
    aliases: ["full_name", "spouse_name", "executor_name", "account_holder_name"],
  },
  citizen_dob: {
    label: "Your date of birth",
    aliases: ["date_of_birth", "spouse_date_of_birth"],
  },
  citizen_ni: {
    label: "Your National Insurance number",
    aliases: [
      "national_insurance_number",
      "spouse_national_insurance_number",
      "ni_number",
      "nino",
    ],
  },
  citizen_address: {
    label: "Your current address",
    aliases: ["address", "current_address", "spouse_address", "executor_address"],
  },
  citizen_contact: {
    label: "Your contact details",
    aliases: [
      "informant_contact_details",
      "spouse_contact_details",
      "executor_contact_details",
      "phone",
      "email",
    ],
  },
  relationship: {
    label: "Your relationship to the person who died",
    aliases: ["relationship_to_deceased"],
  },
  marriage_certificate: {
    label: "Marriage or civil partnership certificate",
    aliases: ["marriage_certificate", "civil_partnership_certificate"],
  },
  bank_sort_code: { label: "Bank sort code", aliases: ["sort_code"] },
  bank_account_number: {
    label: "Bank account number",
    aliases: ["account_number"],
  },
  death_registration: {
    label: "Death registration reference",
    aliases: [
      "reference_number",
      "death_registration_date",
      "death_registration_district",
    ],
  },
  cause_of_death: {
    label: "Cause of death (from medical certificate)",
    aliases: ["cause_of_death", "medical_certificate_reference"],
  },
  doctor_details: {
    label: "Doctor's details",
    aliases: ["doctor_name", "doctor_gmc_number"],
  },
  passport_number: {
    label: "Passport number of the person who died",
    aliases: ["passport_number"],
  },
  driving_licence_number: {
    label: "Driving licence number of the person who died",
    aliases: ["driving_licence_number"],
  },
  vehicle_registrations: {
    label: "Vehicle registration numbers",
    aliases: ["vehicle_registration_numbers"],
  },
  current_benefits: {
    label: "Current benefits being received",
    aliases: [
      "current_benefits_list",
      "benefit_amounts",
      "benefit_types",
      "child_benefit_record",
      "child_benefit_eligibility",
    ],
  },
  pension_details: {
    label: "Pension details",
    aliases: [
      "pension_scheme_details",
      "state_pension_status",
      "partner_employment_history",
    ],
  },
  council_details: {
    label: "Council details",
    aliases: [
      "council_name",
      "housing_benefit_status",
      "council_tax_reduction_status",
      "blue_badge_number",
    ],
  },
  children_details: {
    label: "Children's names and ages",
    aliases: ["children_names_and_ages"],
  },
  pregnancy: {
    label: "Pregnancy status",
    aliases: ["pregnancy_declaration", "expected_due_date"],
  },
  identification_document: {
    label: "Your identification document",
    aliases: ["identification_document"],
  },
  institution: {
    label: "Institution details (if applicable)",
    aliases: ["institution_name", "institution_address"],
  },
  child_name: {
    label: "Child's full name",
    aliases: ["child_full_name", "child_name"],
  },
  child_dob: {
    label: "Child's date of birth",
    aliases: ["child_date_of_birth", "child_dob"],
  },
  parent_details: {
    label: "Parent details",
    aliases: ["mother_name", "father_name", "parent_name"],
  },
  employment_status: {
    label: "Employment status",
    aliases: ["employment_status", "employment_history"],
  },
  income: {
    label: "Income details",
    aliases: ["income", "monthly_income", "annual_income", "household_income"],
  },
  housing_costs: {
    label: "Housing costs",
    aliases: ["housing_costs", "rent_amount", "mortgage_amount"],
  },
};

const REVERSE_LOOKUP: Record<string, string> = {};
for (const [canonical, { aliases }] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) REVERSE_LOOKUP[alias] = canonical;
  REVERSE_LOOKUP[canonical] = canonical;
}

/** Map a service-specific field key to its canonical key (identity if unknown). */
export function canonicalFieldKey(fieldKey: string): string {
  return REVERSE_LOOKUP[fieldKey] || fieldKey;
}

export interface MergedField {
  canonicalKey: string;
  humanLabel: string;
  neededBy: Array<{ serviceId: string; fieldKey: string }>;
}

export interface MergedFieldSummary {
  fields: MergedField[];
  promptSummary: string;
}

/** The data each service shares, already resolved from its consent grants. */
export interface ServiceConsentFields {
  serviceId: string;
  dataShared: string[];
}

/**
 * Merge data-shared fields across services, deduplicating by canonical field.
 * Pure — callers resolve consent first. Returns the merged fields (most-shared
 * first) and a prompt-ready summary splitting shared vs service-specific data.
 */
export function mergeConsentFields(
  services: ServiceConsentFields[],
): MergedFieldSummary {
  const fieldMap = new Map<string, MergedField>();

  for (const { serviceId, dataShared } of services) {
    for (const fieldKey of dataShared) {
      const canonical = canonicalFieldKey(fieldKey);
      const existing = fieldMap.get(canonical);
      if (existing) {
        if (!existing.neededBy.some((n) => n.serviceId === serviceId)) {
          existing.neededBy.push({ serviceId, fieldKey });
        }
      } else {
        const label =
          FIELD_ALIASES[canonical]?.label ||
          fieldKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        fieldMap.set(canonical, {
          canonicalKey: canonical,
          humanLabel: label,
          neededBy: [{ serviceId, fieldKey }],
        });
      }
    }
  }

  const fields = Array.from(fieldMap.values()).sort(
    (a, b) => b.neededBy.length - a.neededBy.length,
  );

  const lines: string[] = [];
  const shared = fields.filter((f) => f.neededBy.length > 1);
  const unique = fields.filter((f) => f.neededBy.length === 1);

  if (shared.length > 0) {
    lines.push("SHARED DATA (ask ONCE, used by multiple services):");
    for (const f of shared) {
      const svcs = f.neededBy
        .map((n) => n.serviceId.replace(/^[a-z]+-/, "").replace(/-/g, " "))
        .join(", ");
      lines.push(`• ${f.humanLabel} → ${svcs}`);
    }
  }
  if (unique.length > 0) {
    lines.push("");
    lines.push("SERVICE-SPECIFIC DATA (only needed for one service):");
    for (const f of unique) {
      const svc = f.neededBy[0].serviceId
        .replace(/^[a-z]+-/, "")
        .replace(/-/g, " ");
      lines.push(`• ${f.humanLabel} → ${svc} only`);
    }
  }

  return { fields, promptSummary: lines.join("\n") };
}
