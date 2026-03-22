/**
 * Field Merger — deduplicates data fields across multiple services.
 *
 * When a life event involves 3-8 services, many of them need the same data
 * (deceased's name, date of death, citizen's NI number, etc.) but use different
 * field keys. This module maps all service-specific keys to canonical fields
 * so the agent can ask once and fan out to all services.
 */

import { getServiceArtefact } from "./service-data";

// ── Field Alias Map ──
// Groups of field keys that refer to the same logical piece of data.
// The canonical key is the map key; the aliases are service-specific variants.

const FIELD_ALIASES: Record<string, { label: string; aliases: string[] }> = {
  // Deceased person
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
    aliases: [
      "date_of_death",
      "partner_date_of_death",
      "deceased_date_of_death",
    ],
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

  // Citizen (the person using the service)
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
    aliases: [
      "address",
      "current_address",
      "spouse_address",
      "executor_address",
    ],
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

  // Relationship
  relationship: {
    label: "Your relationship to the person who died",
    aliases: ["relationship_to_deceased"],
  },
  marriage_certificate: {
    label: "Marriage or civil partnership certificate",
    aliases: ["marriage_certificate", "civil_partnership_certificate"],
  },

  // Financial
  bank_sort_code: {
    label: "Bank sort code",
    aliases: ["sort_code"],
  },
  bank_account_number: {
    label: "Bank account number",
    aliases: ["account_number"],
  },

  // Death registration
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

  // Documents
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

  // Benefits
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

  // Local authority
  council_details: {
    label: "Council details",
    aliases: [
      "council_name",
      "housing_benefit_status",
      "council_tax_reduction_status",
      "blue_badge_number",
    ],
  },

  // Children
  children_details: {
    label: "Children's names and ages",
    aliases: ["children_names_and_ages"],
  },

  // Pregnancy
  pregnancy: {
    label: "Pregnancy status",
    aliases: ["pregnancy_declaration", "expected_due_date"],
  },

  // Identification
  identification_document: {
    label: "Your identification document",
    aliases: ["identification_document"],
  },

  // Institution (care home, hospital, etc.)
  institution: {
    label: "Institution details (if applicable)",
    aliases: ["institution_name", "institution_address"],
  },

  // New baby life event
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

  // Employment
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

// Build reverse lookup: field key → canonical key
const REVERSE_LOOKUP: Record<string, string> = {};
for (const [canonical, { aliases }] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) {
    REVERSE_LOOKUP[alias] = canonical;
  }
  // The canonical key itself is also a valid field name
  REVERSE_LOOKUP[canonical] = canonical;
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

/**
 * Merge data_shared fields across multiple services, deduplicating by
 * canonical field. Returns a merged field list and a prompt-ready summary.
 */
export async function mergeServiceFields(
  serviceIds: string[],
): Promise<MergedFieldSummary> {
  const fieldMap = new Map<string, MergedField>();

  for (const serviceId of serviceIds) {
    const consentRaw = await getServiceArtefact(serviceId, "consent");
    if (!consentRaw) continue;

    const consent = consentRaw as {
      grants?: Array<{ data_shared?: string[] }>;
    };
    if (!consent.grants) continue;

    for (const grant of consent.grants) {
      if (!grant.data_shared) continue;
      for (const fieldKey of grant.data_shared) {
        const canonical = REVERSE_LOOKUP[fieldKey] || fieldKey;
        const existing = fieldMap.get(canonical);
        if (existing) {
          // Only add if this service isn't already listed
          if (!existing.neededBy.some((n) => n.serviceId === serviceId)) {
            existing.neededBy.push({ serviceId, fieldKey });
          }
        } else {
          const label =
            FIELD_ALIASES[canonical]?.label ||
            fieldKey
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
          fieldMap.set(canonical, {
            canonicalKey: canonical,
            humanLabel: label,
            neededBy: [{ serviceId, fieldKey }],
          });
        }
      }
    }
  }

  const fields = Array.from(fieldMap.values()).sort(
    (a, b) => b.neededBy.length - a.neededBy.length,
  );

  // Build prompt summary — shared fields first, then service-specific
  const lines: string[] = [];
  const shared = fields.filter((f) => f.neededBy.length > 1);
  const unique = fields.filter((f) => f.neededBy.length === 1);

  if (shared.length > 0) {
    lines.push("SHARED DATA (ask ONCE, used by multiple services):");
    for (const f of shared) {
      const services = f.neededBy
        .map((n) => n.serviceId.replace(/^[a-z]+-/, "").replace(/-/g, " "))
        .join(", ");
      lines.push(`• ${f.humanLabel} → ${services}`);
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

  return {
    fields,
    promptSummary: lines.join("\n"),
  };
}
