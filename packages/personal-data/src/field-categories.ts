/**
 * Field Categories — maps consent data_shared field names to ConsentDataCategory.
 *
 * Used by the consent resolution engine to match service consent grants
 * against citizen standing preferences by data category.
 */

import type { ConsentDataCategory, ConsentGrant } from "@als/schemas";

/**
 * Map field names (as used in consent.json data_shared arrays) to consent categories.
 * Falls back to keyword matching for fields not explicitly mapped.
 */
const FIELD_TO_CATEGORY: Record<string, ConsentDataCategory> = {
  // Identity
  full_name: "identity",
  name: "identity",
  first_name: "identity",
  last_name: "identity",
  date_of_birth: "identity",
  dob: "identity",
  national_insurance_number: "identity",
  ni_number: "identity",
  nino: "identity",
  nationality: "identity",
  passport_number: "identity",
  passport_photo: "identity",
  biometric_data: "identity",
  photo: "identity",
  driving_licence_number: "identity",
  place_of_birth: "identity",
  gender: "identity",

  // Contact
  email: "contact",
  email_address: "contact",
  phone: "contact",
  phone_number: "contact",
  mobile_number: "contact",
  address: "contact",
  address_line_1: "contact",
  address_line_2: "contact",
  address_city: "contact",
  address_postcode: "contact",
  postcode: "contact",
  current_address: "contact",
  previous_address: "contact",

  // Financial
  income: "financial",
  annual_income: "financial",
  employment_income: "financial",
  household_income: "financial",
  savings: "financial",
  bank_account: "financial",
  bank_account_number: "financial",
  bank_sort_code: "financial",
  bank_details: "financial",
  bank_statements: "financial",
  tax_records: "financial",
  tax_code: "financial",
  paye_data: "financial",
  self_assessment: "financial",
  pension_amount: "financial",
  pension_contributions: "financial",
  council_tax_band: "financial",
  council_tax_reference: "financial",
  rent_amount: "financial",
  mortgage_amount: "financial",
  payment_details: "financial",

  // Health
  nhs_number: "health",
  medical_conditions: "health",
  health_conditions: "health",
  disability_status: "health",
  disability_details: "health",
  prescriptions: "health",
  gp_details: "health",
  tb_test_results: "health",
  vaccination_records: "health",
  pregnancy_status: "health",
  pregnancy_due_date: "health",
  expected_due_date: "health",

  // Housing
  housing_status: "housing",
  housing_type: "housing",
  tenancy_type: "housing",
  tenancy_agreement: "housing",
  rent_details: "housing",
  landlord_details: "housing",
  property_type: "housing",
  occupants: "housing",
  housing_costs: "housing",
  housing_benefit: "housing",
  number_of_bedrooms: "housing",

  // Employment
  employment_status: "employment",
  employer_name: "employment",
  employer: "employment",
  employer_details: "employment",
  employment_history: "employment",
  hours_worked: "employment",
  job_title: "employment",
  occupation: "employment",
  work_capability: "employment",
  cscs_card: "employment",
  dbs_check: "employment",
  education_status: "employment",
  qualifications: "employment",
  course_details: "employment",

  // Legal
  criminal_record: "legal",
  criminal_record_check: "legal",
  conviction_history: "legal",
  court_orders: "legal",
  probation_status: "legal",
  licence_conditions: "legal",
  visa_status: "legal",
  visa_history: "legal",
  immigration_status: "legal",
  travel_history: "legal",
  right_to_work: "legal",
  sponsor_details: "legal",
  marriage_certificate: "legal",
  death_certificate: "legal",
  birth_certificate: "legal",
  will_details: "legal",
  power_of_attorney: "legal",
};

/** Keyword patterns for fallback categorisation */
const KEYWORD_PATTERNS: Array<{ pattern: RegExp; category: ConsentDataCategory }> = [
  { pattern: /name|birth|passport|identity|biometric|photo|licence_number/i, category: "identity" },
  { pattern: /address|email|phone|contact|postcode/i, category: "contact" },
  { pattern: /income|tax|bank|pay|salary|pension|financial|savings|mortgage|rent_amount/i, category: "financial" },
  { pattern: /health|medical|nhs|disability|prescription|gp|pregnancy/i, category: "health" },
  { pattern: /housing|tenancy|landlord|property|occupant|bedroom/i, category: "housing" },
  { pattern: /employ|employer|work|job|occupation|education|qualification|hours/i, category: "employment" },
  { pattern: /criminal|court|legal|visa|immigration|probation|conviction|marriage|death|birth_cert/i, category: "legal" },
];

/** Categorise a single field name from consent.json data_shared */
export function categoriseField(field: string): ConsentDataCategory {
  const normalised = field.toLowerCase().replace(/[- ]/g, "_");

  // Exact match first
  if (FIELD_TO_CATEGORY[normalised]) {
    return FIELD_TO_CATEGORY[normalised];
  }

  // Keyword fallback
  for (const { pattern, category } of KEYWORD_PATTERNS) {
    if (pattern.test(normalised)) {
      return category;
    }
  }

  // Default to identity (safest — highest protection)
  return "identity";
}

/** Categorise all fields in a consent grant → unique categories */
export function categoriseGrant(grant: ConsentGrant): ConsentDataCategory[] {
  const categories = new Set<ConsentDataCategory>();
  for (const field of grant.data_shared) {
    categories.add(categoriseField(field));
  }
  return Array.from(categories);
}
