/**
 * Card Registry — Maps (interactionType, stateId) → CardDefinition[]
 *
 * Deterministic card resolution: given a service's interaction type and
 * current state, returns the cards that should be rendered. No LLM involvement.
 *
 * Services can override with custom card definitions in their artefacts (future).
 */

import type { CardDefinition, CardFieldDef } from "./card-types";

// ── Interaction Types (mirrored from legibility-studio for package independence) ──

export const INTERACTION_TYPES = [
  "license",
  "register",
  "portal",
  "application",
  "informational_hub",
  "appointment_booker",
  "task_list",
  "payment_service",
  // ── New typology-specific interaction types (Phase 1 expansion) ──
  "benefit",
  "entitlement",
  "grant",
  "legal_process",
] as const;

export type InteractionType = (typeof INTERACTION_TYPES)[number];

// ── State-to-Card Mapping ──

export interface StateCardMapping {
  stateId: string;
  cards: CardDefinition[];
}

export interface InteractionCardSet {
  interactionType: InteractionType;
  mappings: StateCardMapping[];
}

// ── Reusable Field Definitions ──

const TENURE_FIELD: CardFieldDef = {
  key: "tenure_type",
  label: "What is your housing situation?",
  type: "radio",
  required: true,
  category: "housing",
  options: [
    { value: "private_renter", label: "Private renter" },
    { value: "council_tenant", label: "Council tenant" },
    { value: "homeowner", label: "Homeowner" },
    { value: "living_with_family", label: "Living with family" },
  ],
};

const MONTHLY_RENT_FIELD: CardFieldDef = {
  key: "monthly_rent",
  label: "Monthly rent (£)",
  type: "currency",
  required: true,
  placeholder: "e.g. 650",
  category: "housing",
  validation: { min: 0, max: 10000 },
  showWhen: {
    field: "tenure_type",
    values: ["private_renter", "council_tenant"],
  },
};

const SORT_CODE_FIELD: CardFieldDef = {
  key: "sort_code",
  label: "Sort code",
  type: "sort-code",
  required: true,
  placeholder: "e.g. 12-34-56",
  category: "financial",
  validation: {
    pattern: "^\\d{2}-?\\d{2}-?\\d{2}$",
    message: "Enter a valid 6-digit sort code",
  },
};

const ACCOUNT_NUMBER_FIELD: CardFieldDef = {
  key: "account_number",
  label: "Account number",
  type: "account-number",
  required: true,
  placeholder: "e.g. 12345678",
  category: "financial",
  validation: {
    pattern: "^\\d{6,8}$",
    message: "Enter a 6-8 digit account number",
  },
};

const BANK_NAME_FIELD: CardFieldDef = {
  key: "bank_name",
  label: "Bank name",
  type: "text",
  required: true,
  placeholder: "e.g. Barclays",
  category: "financial",
};

// ── Card Definitions ──

const HOUSEHOLD_DETAILS_CARD: CardDefinition = {
  cardType: "household-details",
  title: "Your housing situation",
  description:
    "We need to know about your housing to calculate your entitlement.",
  fields: [TENURE_FIELD, MONTHLY_RENT_FIELD],
  submitLabel: "Confirm housing details",
  dataCategory: "housing",
};

const FINANCIAL_DETAILS_CARD: CardDefinition = {
  cardType: "financial-details",
  title: "Your income details",
  description: "Tell us about your income sources.",
  fields: [
    {
      key: "employment_status",
      label: "Employment status",
      type: "radio",
      required: true,
      category: "employment",
      options: [
        { value: "employed", label: "Employed" },
        { value: "self_employed", label: "Self-employed" },
        { value: "unemployed", label: "Unemployed" },
        { value: "unable_to_work", label: "Unable to work" },
      ],
    },
    {
      key: "monthly_income",
      label: "Monthly income (£)",
      type: "currency",
      required: false,
      placeholder: "e.g. 1200",
      category: "financial",
      validation: { min: 0 },
      showWhen: {
        field: "employment_status",
        values: ["employed", "self_employed"],
      },
    },
    {
      key: "savings_amount",
      label: "Total savings (£)",
      type: "currency",
      required: false,
      placeholder: "e.g. 500",
      category: "financial",
      validation: { min: 0 },
    },
  ],
  submitLabel: "Confirm income details",
  dataCategory: "financial",
};

const BANK_ACCOUNT_CARD: CardDefinition = {
  cardType: "bank-account-selector",
  title: "Payment account",
  description: "Choose which account you'd like payments sent to.",
  fields: [BANK_NAME_FIELD, SORT_CODE_FIELD, ACCOUNT_NUMBER_FIELD],
  submitLabel: "Confirm bank account",
  dataCategory: "financial",
};

const LICENSE_DETAILS_CARD: CardDefinition = {
  cardType: "license-details",
  title: "Licence details",
  description: "Confirm the details for your licence.",
  fields: [
    {
      key: "licence_type",
      label: "Licence type",
      type: "select",
      required: true,
      category: "licence",
      options: [
        { value: "standard", label: "Standard" },
        { value: "premium", label: "Premium" },
      ],
    },
    {
      key: "licence_duration",
      label: "Duration",
      type: "select",
      required: true,
      category: "licence",
      options: [
        { value: "1_day", label: "1 day" },
        { value: "1_year", label: "1 year" },
        { value: "3_year", label: "3 years" },
        { value: "lifetime", label: "Lifetime" },
      ],
    },
    {
      key: "start_date",
      label: "Start date",
      type: "date",
      required: true,
      category: "licence",
    },
  ],
  submitLabel: "Confirm licence details",
  dataCategory: "licence",
};

const PAYMENT_CARD: CardDefinition = {
  cardType: "payment-card",
  title: "Make payment",
  description: "Confirm your payment details.",
  fields: [
    {
      key: "payment_method",
      label: "Payment method",
      type: "radio",
      required: true,
      category: "payment",
      options: [
        { value: "apple_pay", label: "Apple Pay" },
        { value: "debit_card", label: "Debit card" },
        { value: "credit_card", label: "Credit card" },
        { value: "direct_debit", label: "Direct debit" },
      ],
    },
  ],
  submitLabel: "Confirm payment",
  dataCategory: "payment",
};

const REGISTRATION_DETAILS_CARD: CardDefinition = {
  cardType: "registration-details",
  title: "Registration details",
  description: "Provide the details needed for your registration.",
  fields: [
    {
      key: "registration_reference",
      label: "Reference number (if you have one)",
      type: "text",
      required: false,
      placeholder: "e.g. REF-12345",
      category: "registration",
    },
  ],
  submitLabel: "Submit registration details",
  dataCategory: "registration",
};

const PORTAL_ACTION_CARD: CardDefinition = {
  cardType: "portal-action",
  title: "What would you like to do?",
  description: "Choose an action to perform on your account.",
  fields: [
    {
      key: "action_type",
      label: "Action",
      type: "radio",
      required: true,
      category: "portal",
      options: [
        { value: "report_change", label: "Report a change of circumstances" },
        { value: "upload_document", label: "Upload a document" },
        { value: "send_message", label: "Send a message to your work coach" },
        { value: "view_statement", label: "View your payment statement" },
      ],
    },
    {
      key: "action_details",
      label: "Details",
      type: "text",
      required: false,
      placeholder: "Any additional details...",
      category: "portal",
    },
  ],
  submitLabel: "Continue",
  dataCategory: "portal",
};

const CHANGE_OF_CIRCUMSTANCES_CARD: CardDefinition = {
  cardType: "change-of-circumstances",
  title: "Report a change",
  description: "Tell us what has changed.",
  fields: [
    {
      key: "change_type",
      label: "What has changed?",
      type: "radio",
      required: true,
      category: "portal",
      options: [
        { value: "address", label: "Address" },
        { value: "income", label: "Income" },
        { value: "household", label: "Household members" },
        { value: "health", label: "Health condition" },
        { value: "other", label: "Something else" },
      ],
    },
    {
      key: "change_details",
      label: "Tell us more",
      type: "text",
      required: true,
      placeholder: "Describe the change...",
      category: "portal",
    },
  ],
  submitLabel: "Report change",
  dataCategory: "portal",
};

const SLOT_PICKER_CARD: CardDefinition = {
  cardType: "slot-picker",
  title: "Choose an appointment",
  description: "Select a date and time for your appointment.",
  fields: [
    {
      key: "appointment_date",
      label: "Preferred date",
      type: "date",
      required: true,
      category: "appointment",
    },
    {
      key: "appointment_time",
      label: "Preferred time",
      type: "select",
      required: true,
      category: "appointment",
      options: [
        { value: "09:00", label: "9:00 AM" },
        { value: "10:00", label: "10:00 AM" },
        { value: "11:00", label: "11:00 AM" },
        { value: "13:00", label: "1:00 PM" },
        { value: "14:00", label: "2:00 PM" },
        { value: "15:00", label: "3:00 PM" },
      ],
    },
    {
      key: "appointment_location",
      label: "Location",
      type: "select",
      required: true,
      category: "appointment",
      options: [
        { value: "nearest", label: "Nearest available" },
        { value: "specific", label: "Specific location" },
      ],
    },
  ],
  submitLabel: "Book appointment",
  dataCategory: "appointment",
};

const PAYMENT_AMOUNT_CARD: CardDefinition = {
  cardType: "payment-amount",
  title: "Amount due",
  description: "Review the amount you need to pay.",
  fields: [
    {
      key: "amount_due",
      label: "Amount",
      type: "readonly",
      required: false,
      category: "payment",
    },
  ],
  submitLabel: "Proceed to payment",
  dataCategory: "payment",
};

const CHECKLIST_PROGRESS_CARD: CardDefinition = {
  cardType: "checklist-progress",
  title: "Your progress",
  description: "Check off each step as you complete it.",
  fields: [
    {
      key: "steps_completed",
      label: "Steps",
      type: "checklist",
      required: false,
      category: "task_list",
      options: [
        { value: "step_1", label: "Step 1" },
        { value: "step_2", label: "Step 2" },
        { value: "step_3", label: "Step 3" },
      ],
    },
  ],
  submitLabel: "Update progress",
  dataCategory: "task_list",
};

const DECISION_HELPER_CARD: CardDefinition = {
  cardType: "decision-helper",
  title: "Your options",
  description: "Review the available options and choose one.",
  fields: [
    {
      key: "selected_option",
      label: "Choose an option",
      type: "radio",
      required: true,
      category: "informational",
      options: [
        { value: "option_a", label: "Option A" },
        { value: "option_b", label: "Option B" },
        { value: "need_more_info", label: "I need more information" },
      ],
    },
  ],
  submitLabel: "Continue",
  dataCategory: "informational",
};

const DOCUMENT_UPLOAD_CARD: CardDefinition = {
  cardType: "document-upload",
  title: "Upload supporting document",
  description:
    "Upload a document such as a P45, photo ID, or utility bill. We'll extract the key details for you to confirm.",
  fields: [
    {
      key: "document_file",
      label: "Choose a file",
      type: "file",
      required: true,
      category: "documents",
    },
  ],
  submitLabel: "Confirm extracted details",
  dataCategory: "documents",
};

// ── Typology-Specific Card Definitions (Phase 1) ──

const INCOME_ASSESSMENT_CARD: CardDefinition = {
  cardType: "income-assessment",
  title: "Income and circumstances",
  description:
    "We need to understand your financial situation to assess your benefit entitlement.",
  fields: [
    {
      key: "employment_status",
      label: "Employment status",
      type: "radio",
      required: true,
      category: "employment",
      options: [
        { value: "employed", label: "Employed" },
        { value: "self_employed", label: "Self-employed" },
        { value: "unemployed", label: "Unemployed" },
        { value: "unable_to_work", label: "Unable to work" },
        { value: "carer", label: "Full-time carer" },
      ],
    },
    {
      key: "monthly_income",
      label: "Monthly income before tax (£)",
      type: "currency",
      required: false,
      placeholder: "e.g. 1200",
      category: "financial",
      validation: { min: 0 },
      showWhen: {
        field: "employment_status",
        values: ["employed", "self_employed"],
      },
    },
    {
      key: "housing_costs",
      label: "Monthly housing costs (£)",
      type: "currency",
      required: true,
      placeholder: "e.g. 650",
      category: "housing",
      validation: { min: 0, max: 10000 },
    },
    {
      key: "dependants",
      label: "Number of dependants",
      type: "number",
      required: true,
      placeholder: "e.g. 2",
      category: "household",
      validation: { min: 0, max: 20 },
    },
  ],
  submitLabel: "Confirm income details",
  dataCategory: "financial",
};

const PAYMENT_SCHEDULE_CARD: CardDefinition = {
  cardType: "payment-schedule",
  title: "Payment details",
  description: "Choose how you'd like to receive your benefit payments.",
  fields: [
    BANK_NAME_FIELD,
    SORT_CODE_FIELD,
    ACCOUNT_NUMBER_FIELD,
    {
      key: "payment_frequency",
      label: "Payment frequency",
      type: "radio",
      required: true,
      category: "payment",
      options: [
        { value: "weekly", label: "Weekly" },
        { value: "fortnightly", label: "Fortnightly" },
        { value: "monthly", label: "Monthly" },
      ],
    },
  ],
  submitLabel: "Confirm payment details",
  dataCategory: "financial",
};

const EMPLOYER_VERIFICATION_CARD: CardDefinition = {
  cardType: "employer-verification",
  title: "Employer details",
  description: "We need your employer's details to verify your entitlement.",
  fields: [
    {
      key: "employer_name",
      label: "Employer name",
      type: "text",
      required: true,
      placeholder: "e.g. Acme Ltd",
      category: "employment",
    },
    {
      key: "employer_address",
      label: "Employer address",
      type: "text",
      required: true,
      placeholder: "e.g. 1 High Street, London",
      category: "employment",
    },
    {
      key: "start_date",
      label: "Employment start date",
      type: "date",
      required: true,
      category: "employment",
    },
    {
      key: "weekly_earnings",
      label: "Average weekly earnings (£)",
      type: "currency",
      required: true,
      placeholder: "e.g. 450",
      category: "financial",
      validation: { min: 0 },
    },
  ],
  submitLabel: "Confirm employer details",
  dataCategory: "employment",
};

const ENTITLEMENT_CONFIRMATION_CARD: CardDefinition = {
  cardType: "entitlement-confirmation",
  title: "Your entitlement",
  description:
    "Based on the information provided, here is your statutory entitlement.",
  fields: [
    {
      key: "entitlement_amount",
      label: "Entitlement amount",
      type: "readonly",
      required: false,
      category: "entitlement",
    },
    {
      key: "entitlement_period",
      label: "Entitlement period",
      type: "readonly",
      required: false,
      category: "entitlement",
    },
  ],
  submitLabel: "Accept entitlement",
  dataCategory: "entitlement",
};

const FUNDING_CONDITIONS_CARD: CardDefinition = {
  cardType: "funding-conditions",
  title: "Grant conditions",
  description: "Review and accept the conditions attached to this funding.",
  fields: [
    {
      key: "project_description",
      label: "Brief project description",
      type: "text",
      required: true,
      placeholder: "e.g. Bathroom adaptation for wheelchair access",
      category: "grant",
    },
    {
      key: "estimated_cost",
      label: "Estimated cost (£)",
      type: "currency",
      required: true,
      placeholder: "e.g. 8000",
      category: "financial",
      validation: { min: 0 },
    },
    {
      key: "accept_conditions",
      label: "I accept the grant conditions",
      type: "checkbox",
      required: true,
      category: "grant",
    },
  ],
  submitLabel: "Accept conditions and proceed",
  dataCategory: "grant",
};

const SOLICITOR_DETAILS_CARD: CardDefinition = {
  cardType: "solicitor-details",
  title: "Legal representative",
  description:
    "If you have a solicitor or legal advisor acting on your behalf, provide their details here. This is optional.",
  fields: [
    {
      key: "has_solicitor",
      label: "Do you have a solicitor or legal advisor?",
      type: "radio",
      required: true,
      category: "legal",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No — I am acting on my own behalf" },
      ],
    },
    {
      key: "solicitor_name",
      label: "Solicitor or firm name",
      type: "text",
      required: false,
      placeholder: "e.g. Smith & Partners LLP",
      category: "legal",
      showWhen: { field: "has_solicitor", values: ["yes"] },
    },
    {
      key: "solicitor_reference",
      label: "Solicitor reference (if known)",
      type: "text",
      required: false,
      placeholder: "e.g. SP/2026/12345",
      category: "legal",
      showWhen: { field: "has_solicitor", values: ["yes"] },
    },
  ],
  submitLabel: "Confirm legal representation",
  dataCategory: "legal",
};

const WITNESS_ATTESTATION_CARD: CardDefinition = {
  cardType: "witness-attestation",
  title: "Witness or certificate provider",
  description:
    "Some legal processes require a witness or certificate provider to confirm your identity and intentions.",
  fields: [
    {
      key: "witness_name",
      label: "Full name of witness / certificate provider",
      type: "text",
      required: true,
      placeholder: "e.g. Dr Jane Smith",
      category: "legal",
    },
    {
      key: "witness_relationship",
      label: "Their relationship to you",
      type: "text",
      required: true,
      placeholder: "e.g. GP, solicitor, family friend (known 2+ years)",
      category: "legal",
    },
    {
      key: "witness_contact",
      label: "Contact details",
      type: "text",
      required: true,
      placeholder: "e.g. phone number or email",
      category: "legal",
    },
  ],
  submitLabel: "Confirm witness details",
  dataCategory: "legal",
};

// ── Template Card Definitions (generic, per-interaction-type) ──

const APPLICATION_ELIGIBILITY_CARD: CardDefinition = {
  cardType: "application-eligibility",
  title: "Your circumstances",
  description: "We need some details to assess your application.",
  fields: [
    {
      key: "employment_status",
      label: "Employment status",
      type: "radio",
      required: true,
      category: "employment",
      options: [
        { value: "employed", label: "Employed" },
        { value: "self_employed", label: "Self-employed" },
        { value: "unemployed", label: "Unemployed" },
        { value: "retired", label: "Retired" },
        { value: "student", label: "Student" },
        { value: "unable_to_work", label: "Unable to work" },
      ],
    },
    {
      key: "monthly_income",
      label: "Monthly household income (£)",
      type: "currency",
      required: false,
      placeholder: "e.g. 1200",
      category: "financial",
      validation: { min: 0 },
      showWhen: {
        field: "employment_status",
        values: ["employed", "self_employed"],
      },
    },
  ],
  submitLabel: "Confirm details",
  dataCategory: "employment",
};

const REGISTRATION_EVENT_CARD: CardDefinition = {
  cardType: "registration-event",
  title: "Event details",
  description: "Provide the details of the event you are registering.",
  fields: [
    {
      key: "event_date",
      label: "Date of event",
      type: "date",
      required: true,
      category: "registration",
    },
    {
      key: "event_location",
      label: "Location",
      type: "text",
      required: true,
      placeholder: "e.g. St Mary's Hospital, London",
      category: "registration",
    },
    {
      key: "additional_notes",
      label: "Additional information",
      type: "text",
      required: false,
      placeholder: "Any other relevant details",
      category: "registration",
    },
  ],
  submitLabel: "Submit registration details",
  dataCategory: "registration",
};

/**
 * Template card registry — interaction-type-appropriate cards for graph services.
 * These are more generic than the static registry (which is tuned for hand-crafted services).
 */
const TEMPLATE_CARD_REGISTRY: InteractionCardSet[] = [
  {
    interactionType: "application",
    mappings: [
      { stateId: "document-submitted", cards: [DOCUMENT_UPLOAD_CARD] },
      { stateId: "details-submitted", cards: [APPLICATION_ELIGIBILITY_CARD] },
    ],
  },
  {
    interactionType: "register",
    mappings: [
      { stateId: "details-submitted", cards: [REGISTRATION_EVENT_CARD] },
    ],
  },
  {
    interactionType: "license",
    mappings: [
      { stateId: "document-submitted", cards: [DOCUMENT_UPLOAD_CARD] },
      { stateId: "details-confirmed", cards: [LICENSE_DETAILS_CARD] },
      { stateId: "payment-made", cards: [PAYMENT_CARD] },
    ],
  },
  {
    interactionType: "payment_service",
    mappings: [
      { stateId: "amount-calculated", cards: [PAYMENT_AMOUNT_CARD] },
      { stateId: "payment-made", cards: [PAYMENT_CARD] },
    ],
  },
  {
    interactionType: "appointment_booker",
    mappings: [{ stateId: "slot-selected", cards: [SLOT_PICKER_CARD] }],
  },
  {
    interactionType: "portal",
    mappings: [{ stateId: "action-performed", cards: [PORTAL_ACTION_CARD] }],
  },
  {
    interactionType: "task_list",
    mappings: [
      { stateId: "step-1-complete", cards: [CHECKLIST_PROGRESS_CARD] },
      { stateId: "step-2-complete", cards: [CHECKLIST_PROGRESS_CARD] },
      { stateId: "step-3-complete", cards: [CHECKLIST_PROGRESS_CARD] },
    ],
  },
  {
    interactionType: "informational_hub",
    mappings: [
      { stateId: "information-provided", cards: [DECISION_HELPER_CARD] },
    ],
  },
  // ── Typology-specific interaction types (Phase 1) ──
  {
    interactionType: "benefit",
    mappings: [
      { stateId: "income-assessed", cards: [INCOME_ASSESSMENT_CARD] },
      { stateId: "document-submitted", cards: [DOCUMENT_UPLOAD_CARD] },
      { stateId: "details-submitted", cards: [APPLICATION_ELIGIBILITY_CARD] },
      { stateId: "payment-details-collected", cards: [PAYMENT_SCHEDULE_CARD] },
    ],
  },
  {
    interactionType: "entitlement",
    mappings: [
      { stateId: "employer-verified", cards: [EMPLOYER_VERIFICATION_CARD] },
      { stateId: "document-submitted", cards: [DOCUMENT_UPLOAD_CARD] },
      {
        stateId: "entitlement-confirmed",
        cards: [ENTITLEMENT_CONFIRMATION_CARD],
      },
    ],
  },
  {
    interactionType: "grant",
    mappings: [
      { stateId: "document-submitted", cards: [DOCUMENT_UPLOAD_CARD] },
      { stateId: "details-submitted", cards: [APPLICATION_ELIGIBILITY_CARD] },
      { stateId: "conditions-reviewed", cards: [FUNDING_CONDITIONS_CARD] },
    ],
  },
  {
    interactionType: "legal_process",
    mappings: [
      {
        stateId: "solicitor-details-collected",
        cards: [SOLICITOR_DETAILS_CARD],
      },
      { stateId: "witness-attested", cards: [WITNESS_ATTESTATION_CARD] },
      { stateId: "document-submitted", cards: [DOCUMENT_UPLOAD_CARD] },
      { stateId: "details-submitted", cards: [APPLICATION_ELIGIBILITY_CARD] },
    ],
  },
];

// ── Static Interaction Type → State → Cards Mappings (hand-crafted services) ──

const CARD_REGISTRY: InteractionCardSet[] = [
  {
    interactionType: "application",
    mappings: [
      // UC-specific states (hand-crafted state model — uses these unique state IDs)
      {
        stateId: "personal-details-collected",
        cards: [HOUSEHOLD_DETAILS_CARD],
      },
      {
        stateId: "income-details-collected",
        cards: [BANK_ACCOUNT_CARD],
      },
    ],
  },
  {
    interactionType: "license",
    mappings: [
      {
        stateId: "details-confirmed",
        cards: [LICENSE_DETAILS_CARD],
      },
      {
        stateId: "photo-submitted",
        cards: [DOCUMENT_UPLOAD_CARD],
      },
      {
        stateId: "payment-made",
        cards: [PAYMENT_CARD],
      },
    ],
  },
  {
    interactionType: "register",
    mappings: [
      {
        stateId: "details-submitted",
        cards: [REGISTRATION_DETAILS_CARD],
      },
    ],
  },
  {
    interactionType: "portal",
    mappings: [
      {
        stateId: "action-performed",
        cards: [PORTAL_ACTION_CARD],
      },
      {
        stateId: "change-reported",
        cards: [CHANGE_OF_CIRCUMSTANCES_CARD],
      },
    ],
  },
  {
    interactionType: "appointment_booker",
    mappings: [
      {
        stateId: "slot-selected",
        cards: [SLOT_PICKER_CARD],
      },
    ],
  },
  {
    interactionType: "payment_service",
    mappings: [
      {
        stateId: "amount-calculated",
        cards: [PAYMENT_AMOUNT_CARD],
      },
      {
        stateId: "payment-made",
        cards: [PAYMENT_CARD],
      },
    ],
  },
  {
    interactionType: "task_list",
    mappings: [
      {
        stateId: "step-1-complete",
        cards: [CHECKLIST_PROGRESS_CARD],
      },
      {
        stateId: "step-2-complete",
        cards: [CHECKLIST_PROGRESS_CARD],
      },
      {
        stateId: "step-3-complete",
        cards: [CHECKLIST_PROGRESS_CARD],
      },
    ],
  },
  {
    interactionType: "informational_hub",
    mappings: [
      {
        stateId: "information-provided",
        cards: [DECISION_HELPER_CARD],
      },
    ],
  },
];

// ── Proposal G: Canonical Data Schemas per Typology ──

/**
 * Each typology has characteristic data needs. These canonical schemas define
 * the fields that services of a given type typically require. They can be used
 * to auto-populate card fields, pre-fill forms, and validate completeness.
 */

export interface TypologyDataField {
  key: string;
  label: string;
  type: CardFieldDef["type"];
  category: string;
  required: boolean;
  /** Description of why this field is needed for this typology */
  rationale: string;
  prefillFrom?: string;
}

export interface TypologyDataSchema {
  typology: string;
  description: string;
  fields: TypologyDataField[];
}

export const TYPOLOGY_DATA_SCHEMAS: Record<string, TypologyDataSchema> = {
  benefit: {
    typology: "benefit",
    description:
      "Benefits require income, housing, and household data to assess entitlement and calculate payments.",
    fields: [
      {
        key: "employment_status",
        label: "Employment status",
        type: "radio",
        category: "employment",
        required: true,
        rationale: "Determines benefit rate and work-related requirements",
      },
      {
        key: "monthly_income",
        label: "Monthly income (£)",
        type: "currency",
        category: "financial",
        required: true,
        rationale: "Income-tested benefits need gross income for assessment",
      },
      {
        key: "savings_amount",
        label: "Total savings (£)",
        type: "currency",
        category: "financial",
        required: true,
        rationale: "Capital threshold affects eligibility (e.g. £16k for UC)",
      },
      {
        key: "housing_costs",
        label: "Monthly housing costs (£)",
        type: "currency",
        category: "housing",
        required: true,
        rationale: "Housing element calculation",
      },
      {
        key: "tenure_type",
        label: "Housing tenure",
        type: "radio",
        category: "housing",
        required: true,
        rationale: "Determines housing element eligibility",
      },
      {
        key: "dependants",
        label: "Number of dependants",
        type: "number",
        category: "household",
        required: true,
        rationale: "Child element and childcare costs calculation",
      },
      {
        key: "bank_sort_code",
        label: "Sort code",
        type: "sort-code",
        category: "financial",
        required: true,
        rationale: "Payment delivery",
        prefillFrom: "financials.sortCode",
      },
      {
        key: "bank_account_number",
        label: "Account number",
        type: "account-number",
        category: "financial",
        required: true,
        rationale: "Payment delivery",
        prefillFrom: "financials.accountNumber",
      },
    ],
  },
  entitlement: {
    typology: "entitlement",
    description:
      "Entitlements require employer and earnings verification to confirm statutory rights.",
    fields: [
      {
        key: "employer_name",
        label: "Employer name",
        type: "text",
        category: "employment",
        required: true,
        rationale: "Employer verification for statutory pay/leave",
      },
      {
        key: "employer_address",
        label: "Employer address",
        type: "text",
        category: "employment",
        required: true,
        rationale: "Employer contact for verification",
      },
      {
        key: "employment_start_date",
        label: "Employment start date",
        type: "date",
        category: "employment",
        required: true,
        rationale: "Qualifying period calculation",
      },
      {
        key: "weekly_earnings",
        label: "Average weekly earnings (£)",
        type: "currency",
        category: "financial",
        required: true,
        rationale: "Lower earnings limit check and payment calculation",
      },
      {
        key: "qualifying_event_date",
        label: "Date of qualifying event",
        type: "date",
        category: "entitlement",
        required: true,
        rationale:
          "Start date for entitlement period (e.g. baby due date, adoption date)",
      },
    ],
  },
  obligation: {
    typology: "obligation",
    description:
      "Obligations require deadline dates, reference numbers, and amount calculations.",
    fields: [
      {
        key: "reference_number",
        label: "Reference number",
        type: "text",
        category: "obligation",
        required: true,
        rationale:
          "Identifies the specific obligation (e.g. tax reference, vehicle registration)",
      },
      {
        key: "deadline_date",
        label: "Deadline date",
        type: "date",
        category: "obligation",
        required: true,
        rationale: "Compliance deadline for the obligation",
      },
      {
        key: "amount_due",
        label: "Amount due (£)",
        type: "currency",
        category: "payment",
        required: false,
        rationale: "Payment amount if obligation involves a fee",
      },
      {
        key: "payment_method",
        label: "Payment method",
        type: "radio",
        category: "payment",
        required: false,
        rationale: "How the citizen wishes to pay",
      },
    ],
  },
  registration: {
    typology: "registration",
    description:
      "Registrations require event details, dates, and participant information.",
    fields: [
      {
        key: "event_date",
        label: "Date of event",
        type: "date",
        category: "registration",
        required: true,
        rationale:
          "The date of the event being registered (birth, death, marriage)",
      },
      {
        key: "event_location",
        label: "Location of event",
        type: "text",
        category: "registration",
        required: true,
        rationale: "Where the event took place (hospital, venue, address)",
      },
      {
        key: "participant_name",
        label: "Full name of person involved",
        type: "text",
        category: "registration",
        required: true,
        rationale: "Primary person for the registration record",
      },
      {
        key: "informant_name",
        label: "Name of informant",
        type: "text",
        category: "registration",
        required: true,
        rationale: "Person reporting/registering the event",
        prefillFrom: "primaryContact.firstName",
      },
      {
        key: "registration_district",
        label: "Registration district",
        type: "text",
        category: "registration",
        required: true,
        rationale: "Local register office jurisdiction",
      },
    ],
  },
  application: {
    typology: "application",
    description:
      "Applications require identity confirmation, eligibility details, and supporting documents.",
    fields: [
      {
        key: "full_name",
        label: "Full name",
        type: "text",
        category: "identity",
        required: true,
        rationale: "Identity confirmation for application",
        prefillFrom: "primaryContact.firstName",
      },
      {
        key: "date_of_birth",
        label: "Date of birth",
        type: "date",
        category: "identity",
        required: true,
        rationale: "Identity and eligibility verification",
        prefillFrom: "primaryContact.dateOfBirth",
      },
      {
        key: "address_line1",
        label: "Address",
        type: "text",
        category: "address",
        required: true,
        rationale: "Contact and delivery address",
        prefillFrom: "address.line1",
      },
      {
        key: "postcode",
        label: "Postcode",
        type: "text",
        category: "address",
        required: true,
        rationale: "Address verification",
        prefillFrom: "address.postcode",
      },
      {
        key: "supporting_document",
        label: "Supporting document",
        type: "file",
        category: "documents",
        required: false,
        rationale: "Photo ID, proof of address, or other evidence",
      },
    ],
  },
  document: {
    typology: "document",
    description:
      "Document services require identity verification and delivery preferences.",
    fields: [
      {
        key: "document_type",
        label: "Document required",
        type: "select",
        category: "document",
        required: true,
        rationale: "Identifies which certificate or document is needed",
      },
      {
        key: "full_name",
        label: "Full name (as it should appear)",
        type: "text",
        category: "identity",
        required: true,
        rationale: "Name for the document",
        prefillFrom: "primaryContact.firstName",
      },
      {
        key: "delivery_address",
        label: "Delivery address",
        type: "text",
        category: "address",
        required: true,
        rationale: "Where to send the physical document",
        prefillFrom: "address.line1",
      },
      {
        key: "delivery_preference",
        label: "Delivery speed",
        type: "radio",
        category: "delivery",
        required: true,
        rationale: "Standard vs priority delivery",
      },
    ],
  },
  legal_process: {
    typology: "legal_process",
    description:
      "Legal processes require detailed personal information, legal representation details, and witness attestations.",
    fields: [
      {
        key: "full_name",
        label: "Full legal name",
        type: "text",
        category: "identity",
        required: true,
        rationale: "Legal name for court/registry documents",
        prefillFrom: "primaryContact.firstName",
      },
      {
        key: "date_of_birth",
        label: "Date of birth",
        type: "date",
        category: "identity",
        required: true,
        rationale: "Identity verification for legal proceedings",
        prefillFrom: "primaryContact.dateOfBirth",
      },
      {
        key: "has_solicitor",
        label: "Do you have legal representation?",
        type: "radio",
        category: "legal",
        required: true,
        rationale: "Determines whether solicitor details are needed",
      },
      {
        key: "solicitor_name",
        label: "Solicitor or firm name",
        type: "text",
        category: "legal",
        required: false,
        rationale: "Legal representative contact details",
      },
      {
        key: "witness_name",
        label: "Witness / certificate provider name",
        type: "text",
        category: "legal",
        required: false,
        rationale: "Required for attestation on many legal documents",
      },
      {
        key: "court_or_registry",
        label: "Court or registry",
        type: "text",
        category: "legal",
        required: false,
        rationale: "Jurisdiction for the legal process",
      },
    ],
  },
  grant: {
    typology: "grant",
    description:
      "Grants require project details, cost estimates, and acceptance of funding conditions.",
    fields: [
      {
        key: "project_description",
        label: "Project description",
        type: "text",
        category: "grant",
        required: true,
        rationale: "What the funding will be used for",
      },
      {
        key: "estimated_cost",
        label: "Estimated cost (£)",
        type: "currency",
        category: "financial",
        required: true,
        rationale: "Total cost of the project or works",
      },
      {
        key: "funding_requested",
        label: "Funding amount requested (£)",
        type: "currency",
        category: "financial",
        required: true,
        rationale: "How much grant funding is being sought",
      },
      {
        key: "property_address",
        label: "Property address (if applicable)",
        type: "text",
        category: "address",
        required: false,
        rationale: "Location of works for property-related grants",
        prefillFrom: "address.line1",
      },
      {
        key: "accept_conditions",
        label: "Accept grant conditions",
        type: "checkbox",
        category: "grant",
        required: true,
        rationale: "Formal acceptance of funding terms",
      },
    ],
  },
};

/**
 * Resolve the canonical data schema for a given service typology (serviceType).
 * Returns null if no schema is defined for the type.
 */
export function resolveTypologyDataSchema(
  serviceType: string | null | undefined,
): TypologyDataSchema | null {
  if (!serviceType) return null;
  return TYPOLOGY_DATA_SCHEMAS[serviceType.toLowerCase()] || null;
}

/**
 * Get the canonical field keys that a typology expects, useful for checking
 * data completeness against a citizen's profile.
 */
export function getRequiredFieldsForTypology(serviceType: string): string[] {
  const schema = TYPOLOGY_DATA_SCHEMAS[serviceType.toLowerCase()];
  if (!schema) return [];
  return schema.fields.filter((f) => f.required).map((f) => f.key);
}

// ── Fallback Informational Card ──
// When card resolution fails (no matching interaction type, no matching state),
// fall back to a minimal card that links citizens to GOV.UK or a call centre
// rather than showing nothing.

const FALLBACK_INFORMATIONAL_CARD: CardDefinition = {
  cardType: "fallback-informational",
  title: "Continue on GOV.UK",
  description:
    "This step may need to be completed on the GOV.UK website or by contacting the service directly.",
  fields: [
    {
      key: "next_action",
      label: "How would you like to continue?",
      type: "radio",
      required: true,
      category: "informational",
      options: [
        { value: "govuk_website", label: "Go to the GOV.UK page for this service" },
        { value: "call_centre", label: "Call the service helpline" },
        { value: "continue_chat", label: "Continue in this conversation" },
      ],
    },
  ],
  submitLabel: "Continue",
  dataCategory: "informational",
};

// ── Resolver ──

/** Look up cards from a registry array */
function findInRegistry(
  registry: InteractionCardSet[],
  interactionType: string,
  stateId: string,
): CardDefinition[] | null {
  const cardSet = registry.find((cs) => cs.interactionType === interactionType);
  if (!cardSet) return null;
  const mapping = cardSet.mappings.find((m) => m.stateId === stateId);
  return mapping ? mapping.cards : null;
}

/**
 * Resolve which cards to show for a given interaction type and state.
 * Uses only the static registry (for backward compatibility).
 */
export function resolveCards(
  interactionType: string,
  stateId: string,
  _serviceId?: string,
): CardDefinition[] {
  return findInRegistry(CARD_REGISTRY, interactionType, stateId) ?? [];
}

/**
 * Resolve cards with 3-level resolution chain:
 *
 * 1. Per-service DB overrides (from Studio)
 * 2. Template cards (interaction-type-appropriate for graph services)
 * 3. Static registry fallback (hand-crafted service cards)
 *
 * The 3 hand-crafted services (UC, driving, pension) hit level 3 because
 * they don't have DB overrides and their static registry entries are
 * more specific than template cards.
 */
export function resolveCardsWithOverrides(
  interactionType: string,
  stateId: string,
  serviceId?: string,
  serviceOverrides?: StateCardMapping[] | null,
  options?: { useFallback?: boolean },
): CardDefinition[] {
  // 1. Per-service DB overrides
  if (serviceOverrides && serviceOverrides.length > 0) {
    const override = serviceOverrides.find((m) => m.stateId === stateId);
    if (override) return override.cards;
  }

  // 2. Static registry (hand-crafted service-specific cards — UC, driving, pension)
  const staticCards = findInRegistry(CARD_REGISTRY, interactionType, stateId);
  if (staticCards) return staticCards;

  // 3. Template cards fallback (generic interaction-type-appropriate for graph services)
  const templateCards = findInRegistry(
    TEMPLATE_CARD_REGISTRY,
    interactionType,
    stateId,
  );
  if (templateCards) return templateCards;

  // 4. Fallback informational card — links to GOV.UK or call centre
  //    Used when interaction type inference fell through to a default or
  //    no template matched the state. Better than showing nothing.
  if (options?.useFallback) {
    return [FALLBACK_INFORMATIONAL_CARD];
  }

  return [];
}

/**
 * Infer interaction type from a service's serviceType field.
 * Duplicated here to avoid cross-package dependency on legibility-studio.
 */
export function inferInteractionType(
  serviceType: string | null | undefined,
): InteractionType {
  if (!serviceType) return "application";

  const mapping: Record<string, InteractionType> = {
    // ── 1:1 typology mappings (Phase 1 — no more collapse) ──
    benefit: "benefit",
    entitlement: "entitlement",
    grant: "grant",
    legal_process: "legal_process",
    // ── Direct mappings (unchanged) ──
    registration: "register",
    obligation: "payment_service",
    licence: "license",
    license: "license",
    document: "license",
    information: "informational_hub",
    appointment: "appointment_booker",
    test: "appointment_booker",
    payment: "payment_service",
    tax: "payment_service",
    portal: "portal",
    // ── Generic application fallthrough for unknown types ──
    application: "application",
  };

  return mapping[serviceType.toLowerCase()] || "application";
}
