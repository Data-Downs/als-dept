/**
 * State Instruction Templates — per interaction type.
 *
 * Provides deterministic LLM guidance for graph-only services that don't have
 * hand-crafted state-instructions.json. Templates use {placeholders} resolved
 * at runtime from graph node data.
 *
 * Loading chain (in chat route):
 *   1. Try service-specific file: data/services/{slug}/state-instructions.json
 *   2. Try bundled data (service-store / Cloudflare)
 *   3. Template fallback: infer interactionType → resolve template with service context
 */

import type { StateModelDefinition, StateInstructions } from "./index";
import type { InteractionType } from "./card-registry";

// ── Template context (resolved from graph node at runtime) ──

export interface TemplateContext {
  serviceName: string;
  department: string;
  govukUrl: string;
  eligibilitySummary: string;
  serviceId: string;
}

// ── Template type ──

export interface StateInstructionTemplate {
  version: string;
  instructions: Record<string, string>;
  forcedTransitions?: Record<string, string>;
  autoTransitions?: Array<{
    fromState: string;
    trigger: string;
    pattern: string;
  }>;
}

// ── Shared instruction fragments ──

const SHARED = {
  notStarted: (type: string) =>
    `The citizen has just started the {serviceName} ${type} with {department}.

CRITICAL — IDENTITY IS ALREADY VERIFIED:
The citizen is already authenticated via GOV.UK One Login. Identity verification is COMPLETE.
Do NOT mention identity verification, One Login, or "verifying who you are" — it is DONE.

WHAT TO DO IN THIS RESPONSE:
1. Welcome them warmly
2. Briefly explain what {serviceName} is (1-2 sentences)
3. Present the eligibility summary: {eligibilitySummary}
4. If eligible, explain that you need their consent to share certain data with {department} before proceeding
5. Tell them that interactive consent cards will appear below for them to review and approve

Set "stateTransition" to "check-eligibility" in the JSON block.
Do NOT skip ahead — complete this step only.
Do NOT include any tasks in the JSON block — the eligibility check is automatic, not a task.`,

  identityVerified: `Identity has already been verified via GOV.UK One Login — do NOT mention identity verification again.
Check eligibility and present the results using the POLICY EVALUATION section above.
If eligible, explain that consent is needed next — interactive consent cards will appear below.
Set "stateTransition" to "check-eligibility" in the JSON block.
Do NOT include any tasks in the JSON block.
Do NOT discuss later steps yet.`,

  eligibilityChecked: `Eligibility has already been checked and results were presented.
The citizen is now reviewing consent cards that appeared below your previous message.

If the citizen's message contains consent decisions (granted/denied) OR indicates agreement to proceed (e.g. "yes", "go ahead", "I consent", "proceed"):
  - Acknowledge their consent, thank them
  - Present their personal details for confirmation using ACTUAL data from the DATA ON FILE section: full name, DOB, NI number, address
  - Ask "Does everything look correct?"
  - Set "stateTransition" to "grant-consent" in the JSON block

If the citizen asks a question or provides other information:
  - Answer their question helpfully
  - Gently remind them to review and approve the consent cards below before proceeding
  - Do NOT set a stateTransition

Do NOT re-explain eligibility — it's already done.
Do NOT mention identity verification — it's already done.
Do NOT include any tasks in the JSON block.`,

  rejected: (entity: string) =>
    `The ${entity} was not successful. Explain why clearly and sympathetically.
Mention:
- The citizen may be able to request a review of the decision
- They can contact {department} directly for more information
- GOV.UK page for reference: {govukUrl}
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.`,

  handedOff: `This case has been referred to a human advisor for further review.
Explain why, and provide:
- The citizen should contact {department} directly
- GOV.UK page for reference: {govukUrl}
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.`,
};

// ── Application template (benefit, grant, etc.) ──

const APPLICATION_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": SHARED.notStarted("application"),
    "identity-verified": SHARED.identityVerified,
    "eligibility-checked": SHARED.eligibilityChecked,
    "consent-given": `Consent has been granted and personal details have been confirmed from records.
Thank the citizen for granting consent. Confirm you have their personal details on file (name, DOB, NI number, address — list them briefly).
Explain that you now need them to upload a supporting document (such as a P45, photo ID, or utility bill) for their {serviceName} application.
A document upload card will appear below automatically for them to use.
Set "stateTransition" to "upload-document" in the JSON block.
Do NOT include any tasks in the JSON block — the system provides the upload card automatically.`,
    "document-submitted": `A supporting document has been uploaded and its details extracted automatically.
Acknowledge the upload and explain that the key information has been read from their document.
The extracted fields are shown below for the citizen to review and confirm.
Once they confirm, explain that you will move on to collect any remaining details for their {serviceName} application.
Do NOT include any tasks in the JSON block.`,
    "details-submitted": `Details have been submitted.
Acknowledge the information the citizen provided. Summarise the key details back to them.
Explain that {department} will now assess their application.
Set "stateTransition" to "begin-assessment" in the JSON block.
Do NOT fabricate timelines or reference numbers — say "{department} will confirm."`,
    assessment: `The application is being assessed by {department}.
Tell the citizen:
- Their application has been submitted to {department} for assessment
- They will be contacted with the outcome
- Processing times vary — {department} will confirm the timeline
Set "stateTransition" to "make-decision" in the JSON block.`,
    decision: `A decision has been made on the application.
If approved: Congratulate the citizen and explain next steps. Set "stateTransition" to "approve".
If rejected: Explain the reason sympathetically. Set "stateTransition" to "reject-application".
Do NOT fabricate specific amounts, dates, or reference numbers — say "{department} will confirm these details."`,
    completed: `The application has been approved! Congratulate them warmly.
Explain:
- {department} will confirm specific details (amounts, dates, reference numbers) directly
- The citizen should check their email and post for official correspondence
- They can visit {govukUrl} for more information
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "payment_amount": "393.45", "payment_frequency": "monthly", "first_payment_date": "2026-04-24" }`,
    rejected: SHARED.rejected("application"),
    "handed-off": SHARED.handedOff,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
    "identity-verified": "check-eligibility",
  },
  autoTransitions: [
    {
      fromState: "eligibility-checked",
      trigger: "grant-consent",
      pattern:
        "I have reviewed all consent|consent.*granted|granted.*consent|please proceed|I consent|go ahead|yes.*proceed|agree|done|let's go|ready|start|apply",
    },
    {
      fromState: "document-submitted",
      trigger: "submit-details",
      pattern:
        "everything.*correct|looks correct|details.*correct|yes.*correct|confirm|that's right|all correct|details are correct",
    },
  ],
};

// ── License template ──

const LICENSE_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": SHARED.notStarted("licence application"),
    "identity-verified": SHARED.identityVerified,
    "eligibility-checked": SHARED.eligibilityChecked,
    "consent-given": `Consent has been granted. Confirm you have their personal details on file.
Explain that you need them to upload a supporting document (such as photo ID or a utility bill) for their {serviceName} licence application.
A document upload card will appear below automatically for them to use.
Set "stateTransition" to "upload-document" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "document-submitted": `A supporting document has been uploaded and its details extracted automatically.
Acknowledge the upload and explain that the key information has been read from their document.
The extracted fields are shown below for the citizen to review and confirm.
Once they confirm, explain that you will move on to confirm the remaining details for their {serviceName} licence.
Do NOT include any tasks in the JSON block.`,
    "details-confirmed": `Details have been confirmed.
Explain that payment is needed to complete the {serviceName} application.
A payment form will appear below.
Do NOT include any tasks in the JSON block — the system provides the payment card automatically.`,
    "payment-made": `Payment has been processed.
Tell the citizen their {serviceName} application is being processed by {department}.
Explain:
- {department} will issue the licence once processing is complete
- They will be contacted with delivery details
Set "stateTransition" to "issue-licence" in the JSON block.
Do NOT fabricate specific dates or reference numbers.`,
    issued: `The licence has been issued! Congratulate them.
Explain:
- {department} will send the licence to their registered address
- They can visit {govukUrl} to check status
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "licence_number": "...", "valid_until": "..." }`,
    refused: SHARED.rejected("licence application"),
    "handed-off": SHARED.handedOff,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
    "identity-verified": "check-eligibility",
  },
  autoTransitions: [
    {
      fromState: "eligibility-checked",
      trigger: "grant-consent",
      pattern:
        "I have reviewed all consent|consent.*granted|granted.*consent|please proceed|I consent|go ahead|yes.*proceed|agree|done|let's go|ready",
    },
    {
      fromState: "document-submitted",
      trigger: "confirm-details",
      pattern:
        "everything.*correct|looks correct|details.*correct|yes.*correct|confirm|that's right|all correct|details are correct",
    },
  ],
};

// ── Register template ──

const REGISTER_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": SHARED.notStarted("registration"),
    "identity-verified": SHARED.identityVerified,
    "eligibility-checked": SHARED.eligibilityChecked,
    "consent-given": `Consent has been granted. Confirm you have their personal details on file.
Explain that you now need to collect the details required for their {serviceName} registration.
An interactive form will appear below for them to fill in.
Do NOT include any tasks in the JSON block.`,
    "details-submitted": `Details have been submitted.
Acknowledge the information provided. Summarise the key details back to them.
Tell them {department} will process their registration.
Set "stateTransition" to "confirm-registration" in the JSON block.`,
    registered: `The registration is complete! Confirm their {serviceName} registration.
Explain:
- {department} will send confirmation to their registered details
- They can visit {govukUrl} for more information
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "credential_number": "...", "registration_date": "..." }`,
    rejected: SHARED.rejected("registration"),
    "handed-off": SHARED.handedOff,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
    "identity-verified": "check-eligibility",
  },
  autoTransitions: [
    {
      fromState: "eligibility-checked",
      trigger: "grant-consent",
      pattern:
        "I have reviewed all consent|consent.*granted|granted.*consent|please proceed|I consent|go ahead|yes.*proceed|agree|done|let's go|ready",
    },
    {
      fromState: "consent-given",
      trigger: "submit-details",
      pattern:
        "everything.*correct|looks correct|details.*correct|yes.*correct|confirm|that's right|all correct",
    },
  ],
};

// ── Portal template ──

const PORTAL_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": `The citizen wants to access {serviceName} via {department}.

CRITICAL — IDENTITY IS ALREADY VERIFIED:
The citizen is already authenticated via GOV.UK One Login. Identity verification is COMPLETE.
Do NOT mention identity verification.

WHAT TO DO:
1. Welcome them
2. Explain what they can do on {serviceName}
3. Explain that you need their consent to access their account on their behalf
4. Tell them consent cards will appear below

Set "stateTransition" to "grant-consent" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "identity-verified": `Identity verified. Now request consent to access the portal on their behalf.
Consent cards will appear below.
Set "stateTransition" to "grant-consent" in the JSON block.`,
    "consent-given": `Consent granted. Accessing the citizen's {serviceName} account.
Explain what's available and ask what they'd like to do.
An action picker will appear below.
Do NOT include any tasks in the JSON block.`,
    "account-accessed": `The citizen's account has been accessed.
Help them perform the action they selected. Provide relevant information from their account.
When the action is complete, set "stateTransition" to "perform-action" in the JSON block.`,
    "action-performed": `The action has been performed. Confirm what was done.
Ask if there's anything else they'd like to do, or set "stateTransition" to "complete".`,
    completed: `All actions are complete.
Summarise what was done in this session.
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "payment_amount": "393.45", "payment_frequency": "monthly" }`,
    "handed-off": SHARED.handedOff,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
  },
  autoTransitions: [
    {
      fromState: "identity-verified",
      trigger: "grant-consent",
      pattern: "I consent|go ahead|yes|proceed|agree",
    },
  ],
};

// ── Payment Service template ──

const PAYMENT_SERVICE_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": SHARED.notStarted("payment"),
    "identity-verified": SHARED.identityVerified,
    "eligibility-checked": SHARED.eligibilityChecked,
    "consent-given": `Consent has been granted.
Explain that {department} will now calculate the amount due for {serviceName}.
Set "stateTransition" to "calculate-amount" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "amount-calculated": `The amount has been calculated.
Present the amount to the citizen (use data from the system, do NOT fabricate amounts).
Explain payment options and that a payment form will appear below.
Do NOT include any tasks in the JSON block — the system provides the payment card automatically.`,
    "payment-made": `Payment has been processed successfully.
Thank the citizen. Explain:
- {department} will send a confirmation receipt
- They can visit {govukUrl} for reference
Set "stateTransition" to "complete" in the JSON block.`,
    completed: `Payment is complete! Confirm the payment.
Explain:
- {department} will send official confirmation
- They can visit {govukUrl} for more information
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "amount_paid": "150.00", "payment_reference": "..." }`,
    "handed-off": SHARED.handedOff,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
    "identity-verified": "check-eligibility",
  },
  autoTransitions: [
    {
      fromState: "eligibility-checked",
      trigger: "grant-consent",
      pattern:
        "I have reviewed all consent|consent.*granted|please proceed|I consent|go ahead|yes.*proceed|agree|done|ready",
    },
  ],
};

// ── Appointment Booker template ──

const APPOINTMENT_BOOKER_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": SHARED.notStarted("appointment booking"),
    "identity-verified": SHARED.identityVerified,
    "eligibility-checked": SHARED.eligibilityChecked,
    "consent-given": `Consent has been granted.
Explain that they can now select an appointment slot for {serviceName}.
A slot picker card will appear below.
Do NOT include any tasks in the JSON block — the system provides the slot picker automatically.`,
    "slot-selected": `The citizen has selected an appointment slot.
Confirm the date, time, and location they chose.
Ask them to confirm the booking.
When confirmed, set "stateTransition" to "confirm-booking" in the JSON block.`,
    "booking-confirmed": `The appointment has been booked!
Tell the citizen:
- The date, time, and location of their appointment
- What to bring (ID, relevant documents)
- How to cancel or reschedule if needed
- {department} will send a confirmation
Set "stateTransition" to "attend" when the appointment is attended.
Do NOT include any tasks in the JSON block.`,
    attended: `The appointment has been attended.
Confirm that their {serviceName} appointment is complete.
This is the FINAL message — do NOT ask follow-up questions.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "appointment_date": "2026-04-10", "location": "..." }`,
    cancelled: `The appointment has been cancelled.
Confirm the cancellation and explain how to rebook if needed.
This is the FINAL message — do NOT ask follow-up questions.`,
    "handed-off": SHARED.handedOff,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
    "identity-verified": "check-eligibility",
  },
  autoTransitions: [
    {
      fromState: "eligibility-checked",
      trigger: "grant-consent",
      pattern:
        "I have reviewed all consent|consent.*granted|please proceed|I consent|go ahead|yes.*proceed|agree|done|ready",
    },
    {
      fromState: "slot-selected",
      trigger: "confirm-booking",
      pattern: "confirm|yes|book it|go ahead|that works|perfect",
    },
  ],
};

// ── Task List template ──

const TASK_LIST_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": `The citizen wants to work through {serviceName} with {department}.

CRITICAL — IDENTITY IS ALREADY VERIFIED:
The citizen is already authenticated via GOV.UK One Login.
Do NOT mention identity verification.

WHAT TO DO:
1. Welcome them
2. Explain what {serviceName} involves — it's a step-by-step process
3. Explain that consent is needed before proceeding
4. Consent cards will appear below

Set "stateTransition" to "grant-consent" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "identity-verified": `Identity verified. Request consent to proceed.
Consent cards will appear below.
Set "stateTransition" to "grant-consent" in the JSON block.`,
    "consent-given": `Consent granted.
Present the first step of {serviceName} to the citizen.
Explain what they need to do for Step 1.
A checklist card will appear below to track progress.
When Step 1 is complete, set "stateTransition" to "complete-step-1" in the JSON block.`,
    "step-1-complete": `Step 1 is complete. Well done!
Present Step 2 and explain what the citizen needs to do next.
When Step 2 is complete, set "stateTransition" to "complete-step-2" in the JSON block.`,
    "step-2-complete": `Step 2 is complete. Good progress!
Present Step 3 and explain what the citizen needs to do next.
When Step 3 is complete, set "stateTransition" to "complete-step-3" in the JSON block.`,
    "step-3-complete": `Step 3 is complete.
Congratulate the citizen — all steps are done!
Set "stateTransition" to "finish" in the JSON block.`,
    "all-steps-complete": `All steps are complete! Congratulate them warmly.
Summarise what they've accomplished.
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "steps_completed": "3", "completion_date": "2026-03-20" }`,
    "handed-off": SHARED.handedOff,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
  },
  autoTransitions: [
    {
      fromState: "identity-verified",
      trigger: "grant-consent",
      pattern: "I consent|go ahead|yes|proceed|agree",
    },
  ],
};

// ── Informational Hub template (no identity, no consent) ──

const INFORMATIONAL_HUB_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": `The citizen is looking for information about {serviceName}.

This is an INFORMATIONAL service — there is no application, no identity check, no consent required.

WHAT TO DO:
1. Welcome them
2. Briefly explain what {serviceName} covers
3. Ask what specific information they're looking for
4. Reference {govukUrl} as the official source

Set "stateTransition" to "start-browsing" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    browsing: `The citizen is browsing information about {serviceName}.
Answer their questions using the information available.
When you've provided the key information they need, set "stateTransition" to "provide-information" in the JSON block.
If they need a specific transactional service, mention it and offer to refer them.`,
    "information-provided": `Key information has been provided.
Ask if the citizen needs anything else or would like to be referred to a related service.
If they want a related service: set "stateTransition" to "refer-to-service".
If they're satisfied: set "stateTransition" to "complete".`,
    "referred-to-service": `The citizen has been referred to a related transactional service.
Explain which service they should use and how to access it.
Provide the relevant GOV.UK link.
This is the FINAL message — do NOT ask follow-up questions.`,
    completed: `The information session is complete.
Summarise the key points discussed.
Remind them they can visit {govukUrl} for the full official guidance.
This is the FINAL message — do NOT ask follow-up questions.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "topics_covered": "...", "referred_service": "..." }`,
  },
  forcedTransitions: {},
  autoTransitions: [],
};

// ── Terminal State Configuration ──

export interface TerminalStateConfig {
  /** SVG path data for the icon */
  icon: string;
  /** Display title (e.g. "Application complete") */
  title: string;
  /** Short description for the receipt card */
  description: string;
  /** Next steps text shown to the citizen */
  nextSteps: string;
  /** Border/accent color (GOV.UK palette) */
  borderColor: string;
  /** Tailwind border class */
  borderClass: string;
  /** Box shadow style */
  shadowStyle: string;
  /** Tailwind icon background class */
  iconBgClass: string;
  /** Tailwind title text class */
  titleClass: string;
  /** Whether this is a "success" terminal (show related services) */
  isSuccess: boolean;
}

export const TERMINAL_STATE_CONFIG: Record<string, TerminalStateConfig> = {
  // ── Success terminals ──
  completed: {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Service complete",
    description: "Your request has been processed successfully.",
    nextSteps:
      "You will receive official confirmation from the relevant department.",
    borderColor: "#00703c",
    borderClass: "border-green-200",
    shadowStyle: "0 2px 8px rgba(0,112,60,0.08)",
    iconBgClass: "bg-green-100",
    titleClass: "text-green-700",
    isSuccess: true,
  },
  "claim-active": {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Application complete",
    description: "Your claim is now active and being processed.",
    nextSteps:
      "DWP will contact you with next steps. Check your journal regularly.",
    borderColor: "#00703c",
    borderClass: "border-green-200",
    shadowStyle: "0 2px 8px rgba(0,112,60,0.08)",
    iconBgClass: "bg-green-100",
    titleClass: "text-green-700",
    isSuccess: true,
  },
  issued: {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Licence issued",
    description: "Your licence has been issued successfully.",
    nextSteps: "The licence will be sent to your registered address.",
    borderColor: "#00703c",
    borderClass: "border-green-200",
    shadowStyle: "0 2px 8px rgba(0,112,60,0.08)",
    iconBgClass: "bg-green-100",
    titleClass: "text-green-700",
    isSuccess: true,
  },
  registered: {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Registration complete",
    description: "Your registration has been confirmed.",
    nextSteps: "You will receive official confirmation of your registration.",
    borderColor: "#00703c",
    borderClass: "border-green-200",
    shadowStyle: "0 2px 8px rgba(0,112,60,0.08)",
    iconBgClass: "bg-green-100",
    titleClass: "text-green-700",
    isSuccess: true,
  },
  "all-steps-complete": {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "All steps complete",
    description: "You have successfully completed all required steps.",
    nextSteps: "No further action is needed from you at this time.",
    borderColor: "#00703c",
    borderClass: "border-green-200",
    shadowStyle: "0 2px 8px rgba(0,112,60,0.08)",
    iconBgClass: "bg-green-100",
    titleClass: "text-green-700",
    isSuccess: true,
  },
  attended: {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Appointment complete",
    description: "Your appointment has been attended successfully.",
    nextSteps: "Any follow-up actions will be communicated by the department.",
    borderColor: "#00703c",
    borderClass: "border-green-200",
    shadowStyle: "0 2px 8px rgba(0,112,60,0.08)",
    iconBgClass: "bg-green-100",
    titleClass: "text-green-700",
    isSuccess: true,
  },
  "referred-to-service": {
    icon: "M13 7l5 5m0 0l-5 5m5-5H6",
    title: "Referred to service",
    description: "You have been referred to the appropriate service.",
    nextSteps:
      "Follow the link provided to continue with the referred service.",
    borderColor: "#1d70b8",
    borderClass: "border-blue-200",
    shadowStyle: "0 2px 8px rgba(29,112,184,0.08)",
    iconBgClass: "bg-blue-100",
    titleClass: "text-blue-700",
    isSuccess: true,
  },
  // ── Failure/rejection terminals ──
  rejected: {
    icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Application unsuccessful",
    description: "Unfortunately your application was not successful.",
    nextSteps:
      "You may be able to request a review of the decision or contact the department directly.",
    borderColor: "#d4351c",
    borderClass: "border-red-200",
    shadowStyle: "0 2px 8px rgba(212,53,28,0.08)",
    iconBgClass: "bg-red-100",
    titleClass: "text-red-700",
    isSuccess: false,
  },
  refused: {
    icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Licence refused",
    description: "Your licence application was not successful.",
    nextSteps:
      "You may be able to request a review of the decision or contact the department directly.",
    borderColor: "#d4351c",
    borderClass: "border-red-200",
    shadowStyle: "0 2px 8px rgba(212,53,28,0.08)",
    iconBgClass: "bg-red-100",
    titleClass: "text-red-700",
    isSuccess: false,
  },
  cancelled: {
    icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Appointment cancelled",
    description: "Your appointment has been cancelled.",
    nextSteps: "You can rebook your appointment when you are ready.",
    borderColor: "#d4351c",
    borderClass: "border-red-200",
    shadowStyle: "0 2px 8px rgba(212,53,28,0.08)",
    iconBgClass: "bg-red-100",
    titleClass: "text-red-700",
    isSuccess: false,
  },
  // ── Typology-specific terminals (Phase 1) ──
  "benefit-active": {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Benefit active",
    description: "Your benefit claim is now active and payments will begin.",
    nextSteps:
      "The department will confirm your payment amounts and schedule. Report any changes in circumstances promptly.",
    borderColor: "#00703c",
    borderClass: "border-green-200",
    shadowStyle: "0 2px 8px rgba(0,112,60,0.08)",
    iconBgClass: "bg-green-100",
    titleClass: "text-green-700",
    isSuccess: true,
  },
  confirmed: {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Entitlement confirmed",
    description: "Your statutory entitlement has been confirmed.",
    nextSteps:
      "Official confirmation will be sent to you and your employer where applicable.",
    borderColor: "#00703c",
    borderClass: "border-green-200",
    shadowStyle: "0 2px 8px rgba(0,112,60,0.08)",
    iconBgClass: "bg-green-100",
    titleClass: "text-green-700",
    isSuccess: true,
  },
  approved: {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Grant approved",
    description: "Your grant application has been approved.",
    nextSteps:
      "The department will confirm the grant amount and disbursement schedule. The conditions you accepted remain in effect.",
    borderColor: "#00703c",
    borderClass: "border-green-200",
    shadowStyle: "0 2px 8px rgba(0,112,60,0.08)",
    iconBgClass: "bg-green-100",
    titleClass: "text-green-700",
    isSuccess: true,
  },
  // ── Handoff terminal ──
  "handed-off": {
    icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
    title: "Referred to advisor",
    description:
      "This case has been referred to a human advisor for further review.",
    nextSteps:
      "A member of staff will be in touch. Please have your reference number ready.",
    borderColor: "#f47738",
    borderClass: "border-orange-200",
    shadowStyle: "0 2px 8px rgba(244,119,56,0.08)",
    iconBgClass: "bg-orange-100",
    titleClass: "text-orange-700",
    isSuccess: false,
  },
};

// ── Proposal B: Type-Specific Terminal Config Overrides ──

/**
 * Per-interaction-type overrides for terminal state rendering.
 * When an interaction type has an override for a terminal state,
 * it replaces the generic config from TERMINAL_STATE_CONFIG.
 */
export const TERMINAL_CONFIG_OVERRIDES: Partial<
  Record<InteractionType, Partial<Record<string, Partial<TerminalStateConfig>>>>
> = {
  benefit: {
    "benefit-active": {
      title: "Benefit active",
      description:
        "Your benefit claim is now active and payments will begin shortly.",
      nextSteps:
        "The department will confirm your exact payment amounts and schedule. Remember to report any changes in circumstances promptly — this protects your payments.",
    },
    rejected: {
      title: "Claim unsuccessful",
      description:
        "Unfortunately your benefit claim was not successful at this time.",
      nextSteps:
        "You have the right to request a mandatory reconsideration within one month. If still unhappy, you can appeal to an independent tribunal. Contact your local Citizens Advice for free support.",
    },
    "handed-off": {
      title: "Referred to caseworker",
      description:
        "Your case has been referred to a dedicated caseworker who will support you personally.",
      nextSteps:
        "A caseworker will contact you — this is a real person, not a bot. Have your National Insurance number ready. You can also contact the department directly.",
    },
  },
  entitlement: {
    confirmed: {
      title: "Entitlement confirmed",
      description:
        "Your statutory entitlement has been verified and confirmed.",
      nextSteps:
        "Official confirmation will be sent to you. Your employer will be notified where applicable. You do not need to take any further action.",
    },
    rejected: {
      title: "Entitlement not confirmed",
      description:
        "Based on the information provided, your entitlement could not be confirmed.",
      nextSteps:
        "Check if you qualify under alternative criteria. You may wish to contact the department or seek advice from Citizens Advice. Your employer's HR department may also be able to help.",
    },
  },
  grant: {
    approved: {
      title: "Grant approved",
      description:
        "Your grant application has been approved and funding will be arranged.",
      nextSteps:
        "The department will confirm the grant amount and disbursement schedule. The conditions you accepted remain in effect throughout the grant period. Keep all receipts for audit purposes.",
    },
    rejected: {
      title: "Grant application unsuccessful",
      description: "Unfortunately your grant application was not successful.",
      nextSteps:
        "You may be able to reapply if your circumstances change. Contact the department for feedback on your application. Alternative funding sources may be available — ask your local council.",
    },
  },
  legal_process: {
    completed: {
      title: "Legal process complete",
      description:
        "Your legal process has been completed successfully. All documentation will be filed officially.",
      nextSteps:
        "Official documents will be sent to your registered address and to your solicitor (if appointed). Keep all paperwork in a safe place — you may need it in future. If you have questions, consult your solicitor or contact the relevant court.",
    },
    rejected: {
      title: "Application not accepted",
      description:
        "Your legal application was not accepted. This does not prevent you from reapplying.",
      nextSteps:
        "You have the right to appeal through the appropriate court or tribunal — time limits are strict, so seek legal advice promptly. Free legal advice is available from Citizens Advice, Law Centres, or the Legal Aid helpline.",
    },
    "handed-off": {
      title: "Referred for specialist review",
      description:
        "Your case requires specialist legal review and has been referred accordingly.",
      nextSteps:
        "A specialist advisor will review your case. If you have a solicitor, they will be notified. For free legal advice: Citizens Advice (0800 144 8848), Law Centres Network, or the Legal Aid helpline.",
    },
  },
  payment_service: {
    completed: {
      title: "Payment complete",
      description: "Your payment has been processed successfully.",
      nextSteps:
        "A confirmation receipt will be sent to you. Keep this for your records. If you believe the amount was incorrect, contact the department within 30 days.",
    },
  },
  license: {
    issued: {
      title: "Licence issued",
      description: "Your licence has been issued successfully.",
      nextSteps:
        "Your licence will be sent to your registered address. You can check delivery status on GOV.UK. Remember to renew before it expires.",
    },
  },
  register: {
    registered: {
      title: "Registration complete",
      description: "Your registration has been confirmed and recorded.",
      nextSteps:
        "An official certificate or confirmation will be sent to you. Keep this safe — you may need it as proof of registration.",
    },
  },
  obligation: {
    completed: {
      title: "Obligation fulfilled",
      description:
        "This has been completed and the relevant department has been notified.",
      nextSteps:
        "You do not need to take any further action. Keep your confirmation reference for your records. If your circumstances change, you may need to notify the department again.",
    },
    "handed-off": {
      title: "Referred to the department",
      description:
        "This has been referred to the relevant department for processing.",
      nextSteps:
        "Someone from the department will handle this. If there is a deadline, they are aware of it. You can contact them directly if you need an update.",
    },
  },
};

/**
 * Resolve the terminal state config for a given state and (optionally) interaction type.
 * Uses type-specific overrides where available, falling back to the generic config.
 */
export function resolveTerminalConfig(
  stateId: string,
  interactionType?: string | null,
): TerminalStateConfig {
  const baseConfig =
    TERMINAL_STATE_CONFIG[stateId] || TERMINAL_STATE_CONFIG["completed"];

  if (!interactionType) return baseConfig;

  const typeOverrides =
    TERMINAL_CONFIG_OVERRIDES[interactionType as InteractionType];
  if (!typeOverrides) return baseConfig;

  const override = typeOverrides[stateId];
  if (!override) return baseConfig;

  return { ...baseConfig, ...override };
}

// ── Proposal C: Type-Specific Consent Framing ──

export interface ConsentFraming {
  /** Panel header text (e.g. "Consent Required") */
  panelTitle: string;
  /** Subheading text explaining what consent is for */
  panelDescription: string;
  /** Warning text when required consent is denied */
  requiredDenialWarning: string;
  /** Text for the required denial banner heading */
  requiredDenialTitle: string;
}

const DEFAULT_CONSENT_FRAMING: ConsentFraming = {
  panelTitle: "Consent Required",
  panelDescription: "Review and grant consent for your application.",
  requiredDenialWarning:
    "You have declined one or more required consents. Your application cannot proceed without these. Please change your decisions above to continue.",
  requiredDenialTitle: "Required consents declined",
};

/**
 * Type-specific consent framing — adjusts language to match the citizen experience lens.
 */
export const TYPOLOGY_CONSENT_FRAMING: Partial<
  Record<InteractionType, ConsentFraming>
> = {
  benefit: {
    panelTitle: "Data Sharing Consent",
    panelDescription:
      "To assess your benefit entitlement, we need your permission to access and share some of your information.",
    requiredDenialWarning:
      "These consents are needed to assess your benefit claim. Without them, we cannot check what support you may be entitled to. You can change your mind at any time.",
    requiredDenialTitle: "Required consents not yet given",
  },
  entitlement: {
    panelTitle: "Verification Consent",
    panelDescription:
      "To confirm your statutory entitlement, we need to verify some information with your employer and relevant departments.",
    requiredDenialWarning:
      "These consents are needed to verify your statutory entitlement. Without verification, your right cannot be confirmed. You can change your mind at any time.",
    requiredDenialTitle: "Required verifications not yet authorised",
  },
  grant: {
    panelTitle: "Data Sharing Consent",
    panelDescription:
      "To process your grant application, we need your permission to share information with the funding body.",
    requiredDenialWarning:
      "These consents are required for your grant application. The funding body needs this information to assess your application.",
    requiredDenialTitle: "Required consents not yet given",
  },
  legal_process: {
    panelTitle: "Information Sharing Consent",
    panelDescription:
      "Legal processes require certain information to be shared with the court or relevant authority. Review each item carefully — you may wish to consult a solicitor.",
    requiredDenialWarning:
      "These consents are legally required to progress your case. Without them, the process cannot continue. If you are unsure, we recommend seeking legal advice before deciding.",
    requiredDenialTitle: "Required consents not yet given",
  },
  payment_service: {
    panelTitle: "Data Access Consent",
    panelDescription:
      "To process your payment, we need to access your records and verify the amount due.",
    requiredDenialWarning:
      "These consents are needed to calculate and process your payment. Without them, your payment cannot be processed through this service.",
    requiredDenialTitle: "Required consents declined",
  },
  license: {
    panelTitle: "Consent Required",
    panelDescription:
      "To process your licence application, we need your permission to verify your details and share information with the issuing authority.",
    requiredDenialWarning:
      "These consents are required for your licence application to proceed.",
    requiredDenialTitle: "Required consents declined",
  },
  register: {
    panelTitle: "Consent Required",
    panelDescription:
      "To complete your registration, we need your permission to record and share certain information.",
    requiredDenialWarning:
      "These consents are required for your registration to proceed.",
    requiredDenialTitle: "Required consents declined",
  },
  obligation: {
    panelTitle: "Data sharing consent",
    panelDescription:
      "To complete this notification, we need your permission to share certain information with the relevant department. This is a legal requirement.",
    requiredDenialWarning:
      "These consents are needed to fulfil this obligation. Without them, the notification cannot be processed and you may need to contact the department directly.",
    requiredDenialTitle: "Required consents not yet given",
  },
};

/**
 * Resolve consent framing for a given interaction type.
 * Falls back to generic framing if no type-specific framing exists.
 */
export function resolveConsentFraming(
  interactionType?: string | null,
): ConsentFraming {
  if (!interactionType) return DEFAULT_CONSENT_FRAMING;
  return (
    TYPOLOGY_CONSENT_FRAMING[interactionType as InteractionType] ||
    DEFAULT_CONSENT_FRAMING
  );
}

// ── Proposal D: Type-Specific Escalation Paths ──

export interface EscalationConfig {
  /** Type of specialist the citizen should be routed to */
  specialistType: string;
  /** Human-readable label for the notice (e.g. "Referred to caseworker") */
  noticeLabel: string;
  /** Guidance shown to the citizen in the handoff notice */
  citizenGuidance: string;
  /** Additional resources/helplines to display */
  resources: Array<{ label: string; detail: string }>;
  /** Type-specific suggested actions for the receiving human agent */
  suggestedActions: string[];
}

const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  specialistType: "advisor",
  noticeLabel: "Handoff to human agent",
  citizenGuidance:
    "A summary of your conversation will be shared with the advisor so you don't have to repeat yourself.",
  resources: [],
  suggestedActions: [
    "Review conversation summary before connecting",
    "Confirm citizen's identity and details",
  ],
};

export const TYPOLOGY_ESCALATION_CONFIG: Partial<
  Record<InteractionType, EscalationConfig>
> = {
  benefit: {
    specialistType: "caseworker",
    noticeLabel: "Referred to a caseworker",
    citizenGuidance:
      "A dedicated caseworker will review your case. They are a real person who can help with your benefit claim. Have your National Insurance number ready when they contact you.",
    resources: [
      {
        label: "Citizens Advice",
        detail:
          "Free, confidential advice — citizensadvice.org.uk or 0800 144 8848",
      },
      {
        label: "Turn2us",
        detail: "Benefits calculator and grants — turn2us.org.uk",
      },
    ],
    suggestedActions: [
      "Review income assessment and eligibility data collected",
      "Check for alternative benefits the citizen may qualify for",
      "Consider whether a home visit or phone appointment is more appropriate",
      "Review any safeguarding flags from the conversation",
    ],
  },
  entitlement: {
    specialistType: "entitlement specialist",
    noticeLabel: "Referred to an entitlement specialist",
    citizenGuidance:
      "A specialist will verify your statutory entitlement. Your employer may also be contacted to confirm details. You do not need to do anything further at this stage.",
    resources: [
      {
        label: "ACAS",
        detail: "Employment rights advice — acas.org.uk or 0300 123 1100",
      },
      {
        label: "GOV.UK",
        detail: "Check your employment rights — gov.uk/employment-status",
      },
    ],
    suggestedActions: [
      "Verify employer details and earnings against RTI records",
      "Check qualifying period and earnings thresholds",
      "Contact employer HR department if verification is needed",
    ],
  },
  grant: {
    specialistType: "funding advisor",
    noticeLabel: "Referred to a funding advisor",
    citizenGuidance:
      "A funding advisor will review your grant application and help you understand the conditions. They can also suggest alternative funding sources if this grant isn't suitable.",
    resources: [
      {
        label: "Local council",
        detail:
          "Your local council may offer additional grants or funding support",
      },
    ],
    suggestedActions: [
      "Review project details and cost estimates submitted",
      "Check if citizen qualifies for other grants or funding streams",
      "Verify property ownership and planning permissions if applicable",
    ],
  },
  legal_process: {
    specialistType: "legal advisor",
    noticeLabel: "Referred for legal guidance",
    citizenGuidance:
      "Your case needs specialist legal attention. If you have a solicitor, they will be notified. If you don't have legal representation, free advice is available from the organisations listed below.",
    resources: [
      {
        label: "Citizens Advice",
        detail: "Free legal guidance — citizensadvice.org.uk or 0800 144 8848",
      },
      {
        label: "Law Centres Network",
        detail: "Free legal advice in your area — lawcentres.org.uk",
      },
      { label: "Legal Aid", detail: "Check if you qualify — gov.uk/legal-aid" },
      { label: "Court helpline", detail: "HMCTS — 0300 123 1024" },
    ],
    suggestedActions: [
      "Review all documents and witness attestations submitted",
      "Check if the citizen has legal representation — contact solicitor if so",
      "Ensure all time-sensitive deadlines are flagged",
      "Consider whether a face-to-face appointment is needed",
      "Review any power of attorney or capacity concerns",
    ],
  },
  payment_service: {
    specialistType: "payment support",
    noticeLabel: "Referred to payment support",
    citizenGuidance:
      "A payment specialist will help resolve your issue. If there is a dispute about the amount owed, they can review the calculation.",
    resources: [
      { label: "HMRC helpline", detail: "Tax queries — 0300 200 3300" },
    ],
    suggestedActions: [
      "Review amount calculation and any disputed figures",
      "Check payment history for partial payments or overpayments",
      "Verify the citizen's liability and assessment details",
    ],
  },
  license: {
    specialistType: "licensing support",
    noticeLabel: "Referred to licensing support",
    citizenGuidance:
      "A licensing specialist will review your application. If additional documents are needed, they will let you know.",
    resources: [],
    suggestedActions: [
      "Review submitted documents and photo/identity verification",
      "Check for any holds or restrictions on the citizen's record",
    ],
  },
  register: {
    specialistType: "registration officer",
    noticeLabel: "Referred to a registration officer",
    citizenGuidance:
      "A registration officer will complete your registration. You may need to attend in person — they will advise you.",
    resources: [],
    suggestedActions: [
      "Review event details and supporting documentation",
      "Check if in-person attendance is required for this registration type",
    ],
  },
  obligation: {
    specialistType: "compliance officer",
    noticeLabel: "Referred to the relevant department",
    citizenGuidance:
      "Someone from the department will handle this for you. If there is a deadline, they will take that into account. You do not need to take any further action unless they contact you.",
    resources: [
      {
        label: "GOV.UK",
        detail:
          "Check your obligations and deadlines — gov.uk",
      },
    ],
    suggestedActions: [
      "Check whether a deadline applies and whether it has been met",
      "Review submitted details for accuracy and completeness",
      "Verify whether any fee or penalty applies",
    ],
  },
};

/**
 * Resolve escalation config for a given interaction type.
 */
export function resolveEscalationConfig(
  interactionType?: string | null,
): EscalationConfig {
  if (!interactionType) return DEFAULT_ESCALATION_CONFIG;
  return (
    TYPOLOGY_ESCALATION_CONFIG[interactionType as InteractionType] ||
    DEFAULT_ESCALATION_CONFIG
  );
}

// ── Proposal E: Type-Aware Proactivity Rules ──

export interface ProactivityConfig {
  /** How this type should be proactively surfaced */
  mode: "suggest" | "warn" | "inform";
  /** Framing language for proactive surfacing */
  framingPrefix: string;
  /** Whether services of this type should be proactive by default */
  defaultProactive: boolean;
  /** Priority for ordering proactive suggestions (lower = higher priority) */
  priority: number;
  /** Icon hint for UI rendering */
  iconHint: "gift" | "alert" | "info" | "shield" | "clock" | "document";
  /** Colour accent for proactive cards (GOV.UK palette) */
  accentColor: string;
}

const DEFAULT_PROACTIVITY_CONFIG: ProactivityConfig = {
  mode: "inform",
  framingPrefix: "You may be interested in",
  defaultProactive: false,
  priority: 50,
  iconHint: "info",
  accentColor: "#1d70b8",
};

export const TYPOLOGY_PROACTIVITY_CONFIG: Partial<
  Record<InteractionType, ProactivityConfig>
> = {
  benefit: {
    mode: "suggest",
    framingPrefix: "Based on your circumstances, you may be entitled to",
    defaultProactive: true,
    priority: 10,
    iconHint: "gift",
    accentColor: "#00703c",
  },
  entitlement: {
    mode: "suggest",
    framingPrefix: "You have a statutory right to",
    defaultProactive: true,
    priority: 15,
    iconHint: "shield",
    accentColor: "#00703c",
  },
  grant: {
    mode: "suggest",
    framingPrefix: "You may be eligible for funding through",
    defaultProactive: true,
    priority: 20,
    iconHint: "gift",
    accentColor: "#00703c",
  },
  payment_service: {
    mode: "warn",
    framingPrefix: "You have an upcoming payment due for",
    defaultProactive: true,
    priority: 5,
    iconHint: "alert",
    accentColor: "#d4351c",
  },
  license: {
    mode: "warn",
    framingPrefix: "Your licence may need attention —",
    defaultProactive: true,
    priority: 25,
    iconHint: "clock",
    accentColor: "#f47738",
  },
  register: {
    mode: "inform",
    framingPrefix: "You may need to register for",
    defaultProactive: false,
    priority: 40,
    iconHint: "document",
    accentColor: "#1d70b8",
  },
  legal_process: {
    mode: "inform",
    framingPrefix: "You may need to begin a legal process for",
    defaultProactive: false,
    priority: 35,
    iconHint: "document",
    accentColor: "#912b88",
  },
  application: {
    mode: "suggest",
    framingPrefix: "You may want to apply for",
    defaultProactive: true,
    priority: 30,
    iconHint: "info",
    accentColor: "#1d70b8",
  },
  informational_hub: {
    mode: "inform",
    framingPrefix: "You might find it useful to read about",
    defaultProactive: false,
    priority: 60,
    iconHint: "info",
    accentColor: "#505a5f",
  },
  obligation: {
    mode: "warn",
    framingPrefix: "You may need to act on",
    defaultProactive: true,
    priority: 8,
    iconHint: "alert",
    accentColor: "#f47738",
  },
};

/**
 * Resolve proactivity config for a given interaction type.
 */
export function resolveProactivityConfig(
  interactionType?: string | null,
): ProactivityConfig {
  if (!interactionType) return DEFAULT_PROACTIVITY_CONFIG;
  return (
    TYPOLOGY_PROACTIVITY_CONFIG[interactionType as InteractionType] ||
    DEFAULT_PROACTIVITY_CONFIG
  );
}

// ── Proposal H: Typology-Level Policy Rules ──

/**
 * Policy rules that apply to ALL services of a given typology. These are
 * inherited by every service of that type and can be overridden at the
 * service level. This avoids duplicating rules like "all benefits require
 * income verification" across 22 separate service policy files.
 */

export interface TypologyPolicyRule {
  id: string;
  description: string;
  condition: {
    field: string;
    operator: ">=" | "<=" | "==" | "!=" | "exists" | "not-exists" | "in";
    value?: unknown;
  };
  reason_if_failed: string;
  /** If true, this rule can be overridden by a service-specific rule with the same id */
  overridable: boolean;
}

export interface TypologyPolicySet {
  typology: string;
  description: string;
  rules: TypologyPolicyRule[];
}

export const TYPOLOGY_POLICY_RULES: Record<string, TypologyPolicySet> = {
  benefit: {
    typology: "benefit",
    description: "Common eligibility rules for all benefit services",
    rules: [
      {
        id: "typo-benefit-uk-resident",
        description: "All benefit claimants must be UK residents",
        condition: {
          field: "jurisdiction",
          operator: "in",
          value: ["England", "Wales", "Scotland", "Northern Ireland"],
        },
        reason_if_failed: "You must be living in the UK to claim this benefit",
        overridable: false,
      },
      {
        id: "typo-benefit-age-minimum",
        description: "Most benefits require claimant to be 16+",
        condition: { field: "age", operator: ">=", value: 16 },
        reason_if_failed: "You must be at least 16 years old",
        overridable: true,
      },
      {
        id: "typo-benefit-income-declared",
        description: "Benefits require income declaration",
        condition: { field: "income_declared", operator: "exists" },
        reason_if_failed:
          "You must declare your income to proceed with a benefit claim",
        overridable: true,
      },
      {
        id: "typo-benefit-bank-account",
        description: "Benefits require a bank account for payment",
        condition: { field: "bank_account", operator: "exists" },
        reason_if_failed: "You need a bank account to receive benefit payments",
        overridable: true,
      },
    ],
  },
  entitlement: {
    typology: "entitlement",
    description: "Common rules for statutory entitlement services",
    rules: [
      {
        id: "typo-entitlement-employed",
        description: "Most entitlements require current or recent employment",
        condition: { field: "employment_status", operator: "exists" },
        reason_if_failed:
          "Your employment status must be confirmed to check statutory entitlement",
        overridable: true,
      },
      {
        id: "typo-entitlement-earnings-threshold",
        description: "Statutory entitlements require minimum earnings",
        condition: { field: "weekly_earnings", operator: ">=", value: 123 },
        reason_if_failed:
          "Your average weekly earnings must meet the lower earnings limit (currently £123/week)",
        overridable: true,
      },
      {
        id: "typo-entitlement-qualifying-period",
        description:
          "Most entitlements require a qualifying period of employment",
        condition: { field: "qualifying_weeks", operator: ">=", value: 26 },
        reason_if_failed:
          "You must have been employed for at least 26 weeks to qualify",
        overridable: true,
      },
    ],
  },
  obligation: {
    typology: "obligation",
    description: "Common rules for obligation/compliance services",
    rules: [
      {
        id: "typo-obligation-reference",
        description: "Obligations require a reference number",
        condition: { field: "reference_number", operator: "exists" },
        reason_if_failed: "You need your reference number to proceed",
        overridable: true,
      },
      {
        id: "typo-obligation-not-overdue",
        description: "Check whether the obligation is overdue",
        condition: { field: "days_until_deadline", operator: ">=", value: 0 },
        reason_if_failed:
          "This obligation is overdue — late penalties may apply",
        overridable: true,
      },
    ],
  },
  registration: {
    typology: "registration",
    description: "Common rules for registration services",
    rules: [
      {
        id: "typo-registration-event-date",
        description: "Registrations require an event date",
        condition: { field: "event_date", operator: "exists" },
        reason_if_failed:
          "You must provide the date of the event you wish to register",
        overridable: true,
      },
      {
        id: "typo-registration-within-deadline",
        description:
          "Most registrations must be completed within a statutory deadline",
        condition: { field: "days_since_event", operator: "<=", value: 42 },
        reason_if_failed:
          "The registration deadline may have passed — contact the register office for guidance",
        overridable: true,
      },
    ],
  },
  application: {
    typology: "application",
    description: "Common rules for application services",
    rules: [
      {
        id: "typo-application-identity",
        description: "Applications require identity verification",
        condition: { field: "identity_verified", operator: "==", value: true },
        reason_if_failed:
          "Your identity must be verified before submitting an application",
        overridable: false,
      },
    ],
  },
  document: {
    typology: "document",
    description: "Common rules for document/certificate services",
    rules: [
      {
        id: "typo-document-identity",
        description: "Document requests require identity verification",
        condition: { field: "identity_verified", operator: "==", value: true },
        reason_if_failed:
          "Your identity must be verified to request official documents",
        overridable: false,
      },
      {
        id: "typo-document-delivery-address",
        description: "Physical documents require a delivery address",
        condition: { field: "delivery_address", operator: "exists" },
        reason_if_failed: "You must provide an address for document delivery",
        overridable: true,
      },
    ],
  },
  legal_process: {
    typology: "legal_process",
    description: "Common rules for legal process services",
    rules: [
      {
        id: "typo-legal-identity",
        description: "Legal processes require verified identity",
        condition: { field: "identity_verified", operator: "==", value: true },
        reason_if_failed:
          "Your identity must be verified for legal proceedings",
        overridable: false,
      },
      {
        id: "typo-legal-age-minimum",
        description: "Legal capacity requires being 18+",
        condition: { field: "age", operator: ">=", value: 18 },
        reason_if_failed:
          "You must be at least 18 to initiate this legal process",
        overridable: true,
      },
    ],
  },
  grant: {
    typology: "grant",
    description: "Common rules for grant/funding services",
    rules: [
      {
        id: "typo-grant-uk-resident",
        description: "Grants are typically available to UK residents only",
        condition: {
          field: "jurisdiction",
          operator: "in",
          value: ["England", "Wales", "Scotland", "Northern Ireland"],
        },
        reason_if_failed: "This grant is only available to UK residents",
        overridable: true,
      },
      {
        id: "typo-grant-not-duplicate",
        description: "Cannot claim the same grant twice",
        condition: { field: "previous_grant_claim", operator: "not-exists" },
        reason_if_failed:
          "Records show a previous claim for this grant — duplicate claims are not permitted",
        overridable: true,
      },
    ],
  },
};

/**
 * Resolve typology-level policy rules for a given service type.
 * Returns the shared rules for that typology, excluding any whose IDs
 * appear in the service-specific override list.
 */
export function resolveTypologyPolicies(
  serviceType: string | null | undefined,
  serviceRuleIds?: string[],
): TypologyPolicyRule[] {
  if (!serviceType) return [];
  const policySet = TYPOLOGY_POLICY_RULES[serviceType.toLowerCase()];
  if (!policySet) return [];

  // If service has its own rules, filter out overridable typology rules
  // that the service explicitly overrides
  if (serviceRuleIds && serviceRuleIds.length > 0) {
    const overrideSet = new Set(serviceRuleIds);
    return policySet.rules.filter(
      (rule) => !rule.overridable || !overrideSet.has(rule.id),
    );
  }

  return policySet.rules;
}

/**
 * Compute the union of all terminal state IDs from STATE_MODEL_TEMPLATES.
 * Also includes any state in TERMINAL_STATE_CONFIG for belt-and-braces coverage.
 */
export function getAllTerminalStateIds(): Set<string> {
  const ids = new Set<string>(Object.keys(TERMINAL_STATE_CONFIG));
  for (const template of Object.values(STATE_MODEL_TEMPLATES)) {
    for (const state of template.states) {
      if (state.type === "terminal") {
        ids.add(state.id);
      }
    }
  }
  return ids;
}

// ── Benefit template (income-focused, payment schedule, caseworker escalation) ──

const BENEFIT_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": `The citizen has just started the {serviceName} benefit claim with {department}.

CRITICAL — IDENTITY IS ALREADY VERIFIED:
The citizen is already authenticated via GOV.UK One Login. Identity verification is COMPLETE.
Do NOT mention identity verification, One Login, or "verifying who you are" — it is DONE.

CITIZEN EXPERIENCE LENS: "Seek support"
The citizen may be in a vulnerable situation. Use warm, reassuring language. Avoid bureaucratic tone.
Frame the service as support they are entitled to, not something they must "prove" they deserve.

WHAT TO DO IN THIS RESPONSE:
1. Welcome them warmly and with empathy
2. Briefly explain what {serviceName} provides (1-2 sentences)
3. Present the eligibility summary: {eligibilitySummary}
4. If eligible, explain that you need their consent to share certain data with {department}
5. Tell them that interactive consent cards will appear below

Set "stateTransition" to "check-eligibility" in the JSON block.
Do NOT skip ahead — complete this step only.
Do NOT include any tasks in the JSON block.`,
    "identity-verified": SHARED.identityVerified,
    "eligibility-checked": SHARED.eligibilityChecked,
    "consent-given": `Consent has been granted and personal details confirmed.
Thank the citizen for granting consent. Confirm you have their details on file (name, DOB, NI number, address).
Explain that you now need to understand their income and circumstances to assess their {serviceName} entitlement.
An income assessment form will appear below automatically.
Set "stateTransition" to "assess-income" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "income-assessed": `Income and circumstances have been submitted.
Acknowledge the information provided. Explain that you may need a supporting document (payslips, bank statement, or similar).
A document upload card will appear below.
Set "stateTransition" to "upload-document" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "document-submitted": `A supporting document has been uploaded and details extracted.
Acknowledge the upload and show the extracted details for confirmation.
Once confirmed, explain you will collect any remaining details.
Do NOT include any tasks in the JSON block.`,
    "details-submitted": `Details have been submitted.
Summarise the key information back to the citizen. Explain that {department} will now assess their claim.
Set "stateTransition" to "begin-assessment" in the JSON block.
Do NOT fabricate timelines — say "{department} will confirm."`,
    assessment: `The benefit claim is being assessed by {department}.
Tell the citizen their claim has been submitted for assessment.
Set "stateTransition" to "make-decision" in the JSON block.`,
    decision: `A decision has been made on the benefit claim.
If approved: Congratulate the citizen warmly. Explain they need to set up payment details. Set "stateTransition" to "approve".
If rejected: Explain sympathetically. Mention mandatory reconsideration and appeal rights. Set "stateTransition" to "reject-claim".
Do NOT fabricate amounts — say "{department} will confirm."`,
    "payment-details-collected": `Payment details have been collected.
Confirm the bank details and payment frequency chosen. Explain that {department} will begin payments.
Set "stateTransition" to "activate-benefit" in the JSON block.`,
    "benefit-active": `The benefit is now active! Congratulate them warmly.
Explain:
- {department} will confirm the exact payment amounts and dates
- They should report any changes in circumstances promptly
- They can visit {govukUrl} for more information
- If they need help, they can contact {department} or speak to a caseworker
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "payment_amount": "393.45", "payment_frequency": "monthly", "first_payment_date": "2026-04-24" }`,
    rejected: `The benefit claim was not successful. Explain why clearly and sympathetically.
IMPORTANT — mention the citizen's rights:
- They have the right to request a MANDATORY RECONSIDERATION within one month
- If still unhappy, they can appeal to an independent tribunal
- They should contact {department} or a local advice service (Citizens Advice, etc.)
- GOV.UK page for reference: {govukUrl}
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.`,
    "handed-off": `This case has been referred to a caseworker at {department} for further review.
Explain why, and provide:
- A caseworker will be in touch — this is a person, not a bot
- The citizen should have their National Insurance number ready
- They can also contact {department} directly
- GOV.UK page for reference: {govukUrl}
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.`,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
    "identity-verified": "check-eligibility",
  },
  autoTransitions: [
    {
      fromState: "eligibility-checked",
      trigger: "grant-consent",
      pattern:
        "I have reviewed all consent|consent.*granted|granted.*consent|please proceed|I consent|go ahead|yes.*proceed|agree|done|let's go|ready|start|apply",
    },
    {
      fromState: "document-submitted",
      trigger: "submit-details",
      pattern:
        "everything.*correct|looks correct|details.*correct|yes.*correct|confirm|that's right|all correct|details are correct",
    },
  ],
};

// ── Entitlement template (employer verification, statutory rights) ──

const ENTITLEMENT_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": `The citizen has just started the {serviceName} entitlement claim with {department}.

CRITICAL — IDENTITY IS ALREADY VERIFIED:
The citizen is already authenticated via GOV.UK One Login. Identity verification is COMPLETE.
Do NOT mention identity verification, One Login, or "verifying who you are" — it is DONE.

CITIZEN EXPERIENCE LENS: "Claim a right"
The citizen has a statutory right to this entitlement. Frame it as confirming their right, not "applying" for something.
Use confident, empowering language: "You are entitled to..." not "You may be eligible for..."

WHAT TO DO IN THIS RESPONSE:
1. Welcome them
2. Explain what {serviceName} provides and that it is a statutory entitlement
3. Present the eligibility summary: {eligibilitySummary}
4. If eligible, explain that consent is needed to verify their entitlement with {department}
5. Consent cards will appear below

Set "stateTransition" to "check-eligibility" in the JSON block.
Do NOT skip ahead.
Do NOT include any tasks in the JSON block.`,
    "identity-verified": SHARED.identityVerified,
    "eligibility-checked": SHARED.eligibilityChecked,
    "consent-given": `Consent has been granted and personal details confirmed.
Thank the citizen. Explain that to verify their entitlement, you need their employer's details.
An employer verification form will appear below.
Set "stateTransition" to "verify-employer" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "employer-verified": `Employer details have been submitted.
Acknowledge the details. Explain that a supporting document may be needed (contract, payslip, etc.).
A document upload card will appear below.
Set "stateTransition" to "upload-document" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "document-submitted": `A supporting document has been uploaded and details extracted.
Acknowledge the upload. Show extracted details for confirmation.
Do NOT include any tasks in the JSON block.`,
    "entitlement-confirmed": `The entitlement has been verified and confirmed.
Present the entitlement details to the citizen (amount, period, conditions).
An entitlement confirmation card will appear below for them to accept.
Set "stateTransition" to "confirm-entitlement" in the JSON block.
Do NOT fabricate specific amounts — say "{department} will confirm exact figures."`,
    confirmed: `The entitlement has been confirmed! Tell the citizen clearly:
- Their statutory entitlement to {serviceName} has been confirmed
- {department} will send official confirmation
- They can visit {govukUrl} for more information
- Their employer will be notified where applicable
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "entitlement_amount": "184.03", "entitlement_period": "39 weeks", "payment_frequency": "weekly" }`,
    rejected: `The entitlement claim was not successful. Explain clearly and sympathetically.
Mention:
- The citizen may be able to request a review
- They should check if they qualify under alternative criteria
- They can contact {department} or seek advice from Citizens Advice
- GOV.UK page: {govukUrl}
This is the FINAL message.
Do NOT include any tasks in the JSON block.`,
    "handed-off": `This case has been referred to a human advisor for further review.
Explain why, and provide:
- The citizen should contact {department} directly
- They may wish to seek independent advice
- GOV.UK page for reference: {govukUrl}
This is the FINAL message.
Do NOT include any tasks in the JSON block.`,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
    "identity-verified": "check-eligibility",
  },
  autoTransitions: [
    {
      fromState: "eligibility-checked",
      trigger: "grant-consent",
      pattern:
        "I have reviewed all consent|consent.*granted|granted.*consent|please proceed|I consent|go ahead|yes.*proceed|agree|done|let's go|ready",
    },
    {
      fromState: "document-submitted",
      trigger: "confirm-entitlement",
      pattern:
        "everything.*correct|looks correct|details.*correct|yes.*correct|confirm|that's right|all correct",
    },
  ],
};

// ── Grant template (funding application with conditions) ──

const GRANT_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": `The citizen has just started the {serviceName} grant application with {department}.

CRITICAL — IDENTITY IS ALREADY VERIFIED:
The citizen is already authenticated via GOV.UK One Login. Identity verification is COMPLETE.
Do NOT mention identity verification.

CITIZEN EXPERIENCE LENS: "Seek support"
Grants are funding the citizen is applying for — often for adaptations, business support, or community projects.
Be encouraging but clear about the conditions that come with grant funding.

WHAT TO DO IN THIS RESPONSE:
1. Welcome them
2. Explain what {serviceName} provides and the type of funding available
3. Present the eligibility summary: {eligibilitySummary}
4. If eligible, explain consent is needed before proceeding
5. Consent cards will appear below

Set "stateTransition" to "check-eligibility" in the JSON block.
Do NOT skip ahead.
Do NOT include any tasks in the JSON block.`,
    "identity-verified": SHARED.identityVerified,
    "eligibility-checked": SHARED.eligibilityChecked,
    "consent-given": `Consent has been granted and personal details confirmed.
Thank the citizen. Explain that you need a supporting document for their {serviceName} application.
A document upload card will appear below.
Set "stateTransition" to "upload-document" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "document-submitted": `A supporting document has been uploaded and details extracted.
Acknowledge the upload. Show extracted details for confirmation.
Once confirmed, explain that remaining details are needed for the grant application.
Do NOT include any tasks in the JSON block.`,
    "details-submitted": `Details have been submitted.
Summarise the key information. Explain that the grant has specific conditions the citizen must review and accept.
A grant conditions card will appear below.
Set "stateTransition" to "review-conditions" in the JSON block.`,
    "conditions-reviewed": `The grant conditions have been reviewed and accepted.
Confirm the conditions accepted. Explain that {department} will now assess the application.
Set "stateTransition" to "begin-assessment" in the JSON block.`,
    assessment: `The grant application is being assessed by {department}.
Tell the citizen their application has been submitted. Processing times vary.
Set "stateTransition" to "make-decision" in the JSON block.`,
    decision: `A decision has been made on the grant application.
If approved: Congratulate the citizen. Explain the grant terms and next steps. Set "stateTransition" to "approve".
If rejected: Explain sympathetically. Set "stateTransition" to "reject-application".
Do NOT fabricate specific amounts.`,
    approved: `The grant has been approved! Congratulate them.
Explain:
- {department} will confirm the grant amount and disbursement schedule
- The conditions accepted earlier remain in effect
- They can visit {govukUrl} for more information
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "grant_amount": "5000.00", "payment_frequency": "lump sum" }`,
    rejected: SHARED.rejected("grant application"),
    "handed-off": SHARED.handedOff,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
    "identity-verified": "check-eligibility",
  },
  autoTransitions: [
    {
      fromState: "eligibility-checked",
      trigger: "grant-consent",
      pattern:
        "I have reviewed all consent|consent.*granted|granted.*consent|please proceed|I consent|go ahead|yes.*proceed|agree|done|let's go|ready",
    },
    {
      fromState: "document-submitted",
      trigger: "submit-details",
      pattern:
        "everything.*correct|looks correct|details.*correct|yes.*correct|confirm|that's right|all correct",
    },
  ],
};

// ── Legal Process template (careful pacing, solicitor details, human escalation) ──

const LEGAL_PROCESS_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": `The citizen has just started the {serviceName} legal process with {department}.

CRITICAL — IDENTITY IS ALREADY VERIFIED:
The citizen is already authenticated via GOV.UK One Login. Identity verification is COMPLETE.
Do NOT mention identity verification.

CITIZEN EXPERIENCE LENS: "Navigate complexity"
Legal processes are often stressful and unfamiliar. The citizen may be dealing with bereavement, incapacity, or family matters.
Use clear, calm, patient language. Explain legal terms when you use them. Never rush.
Explicitly mention that professional legal advice is available and may be wise.

WHAT TO DO IN THIS RESPONSE:
1. Welcome them with care and sensitivity
2. Explain what {serviceName} involves — be honest about the process being multi-step
3. Present the eligibility summary: {eligibilitySummary}
4. Mention that they may wish to seek legal advice before proceeding (this is NOT a requirement)
5. If eligible, explain that consent is needed before proceeding
6. Consent cards will appear below

Set "stateTransition" to "check-eligibility" in the JSON block.
Do NOT skip ahead — this is a process that should not be rushed.
Do NOT include any tasks in the JSON block.`,
    "identity-verified": SHARED.identityVerified,
    "eligibility-checked": SHARED.eligibilityChecked,
    "consent-given": `Consent has been granted and personal details confirmed.
Thank the citizen. Explain that the next step is to confirm whether they have legal representation.
This is optional — many people complete {serviceName} without a solicitor, but professional advice is recommended for complex cases.
A legal representative form will appear below.
Set "stateTransition" to "collect-solicitor-details" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "solicitor-details-collected": `Legal representation details have been provided (or the citizen confirmed they are acting alone).
Acknowledge their choice. If they have a solicitor, note the details.
Explain that a witness or certificate provider may be needed depending on the type of {serviceName}.
A witness attestation form will appear below.
Set "stateTransition" to "collect-witness" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "witness-attested": `Witness details have been provided.
Acknowledge the details. Explain that supporting documents are needed for the {serviceName} process.
A document upload card will appear below.
Set "stateTransition" to "upload-document" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "document-submitted": `Documents have been uploaded and details extracted.
Acknowledge the upload. Show extracted details for confirmation.
Take time to explain what happens next — do not rush through this.
Do NOT include any tasks in the JSON block.`,
    "details-submitted": `All details have been submitted.
Summarise the full submission back to the citizen clearly.
Explain that {department} will now review the submission. This may take some time for legal processes.
Set "stateTransition" to "begin-review" in the JSON block.
Do NOT fabricate timelines.`,
    review: `The submission is being reviewed by {department}.
Tell the citizen:
- Their submission is with {department} for review
- Legal processes can take longer than standard applications — this is normal
- They will be contacted if further information is needed
- Their solicitor (if appointed) will also be notified
Set "stateTransition" to "make-decision" in the JSON block.`,
    decision: `A decision has been made.
If approved: Explain the outcome clearly. Set "stateTransition" to "approve".
If referred: Explain that further legal steps are needed. Set "stateTransition" to "handoff".
If rejected: Explain sympathetically and mention appeal rights. Set "stateTransition" to "reject".`,
    completed: `The legal process is complete.
Explain:
- {department} will send official documentation
- The citizen should keep all paperwork safe
- If they have a solicitor, their solicitor will receive copies
- They can visit {govukUrl} for more information
- If they need further legal guidance, they should consult their solicitor or a legal advice service
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "case_reference": "...", "document_type": "..." }`,
    rejected: `The legal process was not successful. Explain clearly and sympathetically.
IMPORTANT — legal processes have specific appeal mechanisms:
- The citizen has the right to appeal through the appropriate court or tribunal
- They should seek legal advice before deciding whether to appeal
- Time limits for appeals are strict — mention this
- {department} will provide details of the appeal process
- GOV.UK page: {govukUrl}
This is the FINAL message.
Do NOT include any tasks in the JSON block.`,
    "handed-off": `This case has been referred for specialist legal review.
Explain why, and provide:
- A specialist advisor will review the case
- The citizen should consult their solicitor (if they have one)
- They can contact {department} directly
- For free legal advice: Citizens Advice, Law Centres Network, or the Legal Aid helpline
- GOV.UK page for reference: {govukUrl}
This is the FINAL message.
Do NOT include any tasks in the JSON block.`,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
    "identity-verified": "check-eligibility",
  },
  autoTransitions: [
    {
      fromState: "eligibility-checked",
      trigger: "grant-consent",
      pattern:
        "I have reviewed all consent|consent.*granted|granted.*consent|please proceed|I consent|go ahead|yes.*proceed|agree|done|let's go|ready",
    },
    {
      fromState: "document-submitted",
      trigger: "submit-details",
      pattern:
        "everything.*correct|looks correct|details.*correct|yes.*correct|confirm|that's right|all correct",
    },
  ],
};

// ── Obligation template (mandatory actions, deadline-driven, no eligibility gate) ──

const OBLIGATION_TEMPLATE: StateInstructionTemplate = {
  version: "1.0.0",
  instructions: {
    "not-started": `The citizen needs to complete {serviceName} with {department}.

CRITICAL — IDENTITY IS ALREADY VERIFIED:
The citizen is already authenticated via GOV.UK One Login. Identity verification is COMPLETE.
Do NOT mention identity verification, One Login, or "verifying who you are" — it is DONE.

CITIZEN EXPERIENCE LENS: "Fulfil an obligation"
This is something the citizen is required to do — it may have a deadline or legal requirement.
Be clear and direct about what is needed, but not alarming. Frame it as straightforward to complete.
If this obligation is being done as part of a life event (e.g. bereavement), be sensitive to the context.

WHAT TO DO IN THIS RESPONSE:
1. Explain clearly what {serviceName} involves and why it's needed (1-2 sentences)
2. If there is a deadline, mention it without urgency — "this is usually done within..."
3. Explain that you need their consent to share certain data with {department}
4. Tell them that interactive consent cards will appear below

Set "stateTransition" to "verify-identity" in the JSON block.
Do NOT skip ahead — complete this step only.
Do NOT include any tasks in the JSON block.`,
    "identity-verified": `Identity is verified. Move to consent.
Set "stateTransition" to "grant-consent" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "consent-given": `Consent has been granted.
Thank the citizen briefly. Explain that you now need the relevant details to complete {serviceName}.
A form card will appear below to collect the necessary information.
Set "stateTransition" to "submit-details" in the JSON block.
Do NOT include any tasks in the JSON block.`,
    "details-submitted": `Details have been submitted.
Confirm the information back to the citizen. Explain that {department} has been notified and the obligation is now fulfilled.
Set "stateTransition" to "confirm" in the JSON block.

IMPORTANT: Include an "outcomeHints" object in your JSON output with specific values you told the citizen. Only include values you actually discussed — do NOT fabricate. Example:
"outcomeHints": { "confirmation_reference": "NOT-2026-84921", "department_notified": "DVLA", "effective_date": "2026-04-17" }`,
    completed: `The obligation has been fulfilled.
Confirm clearly that {serviceName} is done. Reassure the citizen they do not need to take any further action on this.
If this is part of a life event, mention what might come next.
Visit {govukUrl} for reference.
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.`,
    "handed-off": `This case has been referred to {department} for further review.
Explain why, and provide:
- Someone from {department} will be in touch
- The citizen can also contact {department} directly
- GOV.UK page for reference: {govukUrl}
This is the FINAL message — do NOT ask follow-up questions.
Do NOT include any tasks in the JSON block.`,
  },
  forcedTransitions: {
    "not-started": "verify-identity",
  },
  autoTransitions: [
    {
      fromState: "identity-verified",
      trigger: "grant-consent",
      pattern:
        "I have reviewed all consent|consent.*granted|granted.*consent|please proceed|I consent|go ahead|yes.*proceed|agree|done|let's go|ready|start",
    },
    {
      fromState: "consent-given",
      trigger: "submit-details",
      pattern:
        "provided|submitted|details.*correct|confirm|that's right|all correct|done",
    },
  ],
};

// ── Registry: interaction type → template ──

export const INSTRUCTION_TEMPLATE_REGISTRY: Record<
  InteractionType,
  StateInstructionTemplate
> = {
  application: APPLICATION_TEMPLATE,
  license: LICENSE_TEMPLATE,
  register: REGISTER_TEMPLATE,
  portal: PORTAL_TEMPLATE,
  payment_service: PAYMENT_SERVICE_TEMPLATE,
  appointment_booker: APPOINTMENT_BOOKER_TEMPLATE,
  task_list: TASK_LIST_TEMPLATE,
  informational_hub: INFORMATIONAL_HUB_TEMPLATE,
  // ── Typology-specific (Phase 1) ──
  benefit: BENEFIT_TEMPLATE,
  entitlement: ENTITLEMENT_TEMPLATE,
  grant: GRANT_TEMPLATE,
  legal_process: LEGAL_PROCESS_TEMPLATE,
  obligation: OBLIGATION_TEMPLATE,
};

// ── State model templates (mirrored from legibility-studio/lib/interaction-types.ts) ──

interface StateModelTemplate {
  states: Array<{
    id: string;
    type?: "initial" | "terminal";
    receipt?: boolean;
  }>;
  transitions: Array<{
    from: string;
    to: string;
    trigger: string;
    condition?: string;
  }>;
}

const STATE_MODEL_TEMPLATES: Record<InteractionType, StateModelTemplate> = {
  application: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "eligibility-checked" },
      { id: "consent-given" },
      { id: "document-submitted" },
      { id: "details-submitted" },
      { id: "assessment" },
      { id: "decision", receipt: true },
      { id: "completed", type: "terminal", receipt: true },
      { id: "rejected", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "eligibility-checked",
        trigger: "check-eligibility",
      },
      {
        from: "eligibility-checked",
        to: "consent-given",
        trigger: "grant-consent",
        condition: "eligible",
      },
      {
        from: "eligibility-checked",
        to: "rejected",
        trigger: "reject",
        condition: "not-eligible",
      },
      {
        from: "eligibility-checked",
        to: "handed-off",
        trigger: "handoff",
        condition: "edge-case",
      },
      {
        from: "consent-given",
        to: "document-submitted",
        trigger: "upload-document",
      },
      {
        from: "document-submitted",
        to: "details-submitted",
        trigger: "submit-details",
      },
      {
        from: "details-submitted",
        to: "assessment",
        trigger: "begin-assessment",
      },
      { from: "assessment", to: "decision", trigger: "make-decision" },
      { from: "decision", to: "completed", trigger: "approve" },
      { from: "decision", to: "rejected", trigger: "reject-application" },
    ],
  },
  license: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "eligibility-checked" },
      { id: "consent-given" },
      { id: "document-submitted" },
      { id: "details-confirmed" },
      { id: "payment-made", receipt: true },
      { id: "issued", type: "terminal", receipt: true },
      { id: "refused", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "eligibility-checked",
        trigger: "check-eligibility",
      },
      {
        from: "eligibility-checked",
        to: "consent-given",
        trigger: "grant-consent",
        condition: "eligible",
      },
      {
        from: "eligibility-checked",
        to: "refused",
        trigger: "reject",
        condition: "not-eligible",
      },
      {
        from: "eligibility-checked",
        to: "handed-off",
        trigger: "handoff",
        condition: "edge-case",
      },
      {
        from: "consent-given",
        to: "document-submitted",
        trigger: "upload-document",
      },
      {
        from: "document-submitted",
        to: "details-confirmed",
        trigger: "confirm-details",
      },
      {
        from: "details-confirmed",
        to: "payment-made",
        trigger: "make-payment",
      },
      { from: "payment-made", to: "issued", trigger: "issue-licence" },
    ],
  },
  register: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "eligibility-checked" },
      { id: "consent-given" },
      { id: "details-submitted" },
      { id: "registered", type: "terminal", receipt: true },
      { id: "rejected", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "eligibility-checked",
        trigger: "check-eligibility",
      },
      {
        from: "eligibility-checked",
        to: "consent-given",
        trigger: "grant-consent",
        condition: "eligible",
      },
      {
        from: "eligibility-checked",
        to: "rejected",
        trigger: "reject",
        condition: "not-eligible",
      },
      {
        from: "eligibility-checked",
        to: "handed-off",
        trigger: "handoff",
        condition: "edge-case",
      },
      {
        from: "consent-given",
        to: "details-submitted",
        trigger: "submit-details",
      },
      {
        from: "details-submitted",
        to: "registered",
        trigger: "confirm-registration",
      },
    ],
  },
  portal: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "consent-given" },
      { id: "account-accessed" },
      { id: "action-performed", receipt: true },
      { id: "completed", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "consent-given",
        trigger: "grant-consent",
      },
      {
        from: "consent-given",
        to: "account-accessed",
        trigger: "access-account",
      },
      {
        from: "account-accessed",
        to: "action-performed",
        trigger: "perform-action",
      },
      { from: "action-performed", to: "completed", trigger: "complete" },
      {
        from: "account-accessed",
        to: "handed-off",
        trigger: "handoff",
        condition: "edge-case",
      },
    ],
  },
  payment_service: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "eligibility-checked" },
      { id: "consent-given" },
      { id: "amount-calculated", receipt: true },
      { id: "payment-made", receipt: true },
      { id: "completed", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "eligibility-checked",
        trigger: "check-eligibility",
      },
      {
        from: "eligibility-checked",
        to: "consent-given",
        trigger: "grant-consent",
        condition: "eligible",
      },
      {
        from: "eligibility-checked",
        to: "handed-off",
        trigger: "handoff",
        condition: "not-eligible",
      },
      {
        from: "consent-given",
        to: "amount-calculated",
        trigger: "calculate-amount",
      },
      {
        from: "amount-calculated",
        to: "payment-made",
        trigger: "make-payment",
      },
      { from: "payment-made", to: "completed", trigger: "complete" },
    ],
  },
  appointment_booker: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "eligibility-checked" },
      { id: "consent-given" },
      { id: "slot-selected" },
      { id: "booking-confirmed", receipt: true },
      { id: "attended", type: "terminal", receipt: true },
      { id: "cancelled", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "eligibility-checked",
        trigger: "check-eligibility",
      },
      {
        from: "eligibility-checked",
        to: "consent-given",
        trigger: "grant-consent",
        condition: "eligible",
      },
      {
        from: "eligibility-checked",
        to: "handed-off",
        trigger: "handoff",
        condition: "not-eligible",
      },
      { from: "consent-given", to: "slot-selected", trigger: "select-slot" },
      {
        from: "slot-selected",
        to: "booking-confirmed",
        trigger: "confirm-booking",
      },
      { from: "booking-confirmed", to: "attended", trigger: "attend" },
      { from: "booking-confirmed", to: "cancelled", trigger: "cancel" },
    ],
  },
  task_list: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "consent-given" },
      { id: "step-1-complete" },
      { id: "step-2-complete" },
      { id: "step-3-complete" },
      { id: "all-steps-complete", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "consent-given",
        trigger: "grant-consent",
      },
      {
        from: "consent-given",
        to: "step-1-complete",
        trigger: "complete-step-1",
      },
      {
        from: "step-1-complete",
        to: "step-2-complete",
        trigger: "complete-step-2",
      },
      {
        from: "step-2-complete",
        to: "step-3-complete",
        trigger: "complete-step-3",
      },
      { from: "step-3-complete", to: "all-steps-complete", trigger: "finish" },
      {
        from: "consent-given",
        to: "handed-off",
        trigger: "handoff",
        condition: "edge-case",
      },
    ],
  },
  informational_hub: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "browsing" },
      { id: "information-provided" },
      { id: "referred-to-service", type: "terminal", receipt: true },
      { id: "completed", type: "terminal", receipt: true },
    ],
    transitions: [
      { from: "not-started", to: "browsing", trigger: "start-browsing" },
      {
        from: "browsing",
        to: "information-provided",
        trigger: "provide-information",
      },
      {
        from: "information-provided",
        to: "referred-to-service",
        trigger: "refer-to-service",
      },
      { from: "information-provided", to: "completed", trigger: "complete" },
    ],
  },
  // ── Typology-specific state machines (Phase 1) ──
  benefit: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "eligibility-checked" },
      { id: "consent-given" },
      { id: "income-assessed" },
      { id: "document-submitted" },
      { id: "details-submitted" },
      { id: "assessment" },
      { id: "decision", receipt: true },
      { id: "payment-details-collected" },
      { id: "benefit-active", type: "terminal", receipt: true },
      { id: "rejected", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "eligibility-checked",
        trigger: "check-eligibility",
      },
      {
        from: "eligibility-checked",
        to: "consent-given",
        trigger: "grant-consent",
        condition: "eligible",
      },
      {
        from: "eligibility-checked",
        to: "rejected",
        trigger: "reject",
        condition: "not-eligible",
      },
      {
        from: "eligibility-checked",
        to: "handed-off",
        trigger: "handoff",
        condition: "edge-case",
      },
      {
        from: "consent-given",
        to: "income-assessed",
        trigger: "assess-income",
      },
      {
        from: "income-assessed",
        to: "document-submitted",
        trigger: "upload-document",
      },
      {
        from: "document-submitted",
        to: "details-submitted",
        trigger: "submit-details",
      },
      {
        from: "details-submitted",
        to: "assessment",
        trigger: "begin-assessment",
      },
      { from: "assessment", to: "decision", trigger: "make-decision" },
      { from: "decision", to: "payment-details-collected", trigger: "approve" },
      { from: "decision", to: "rejected", trigger: "reject-claim" },
      {
        from: "payment-details-collected",
        to: "benefit-active",
        trigger: "activate-benefit",
      },
    ],
  },
  entitlement: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "eligibility-checked" },
      { id: "consent-given" },
      { id: "employer-verified" },
      { id: "document-submitted" },
      { id: "entitlement-confirmed", receipt: true },
      { id: "confirmed", type: "terminal", receipt: true },
      { id: "rejected", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "eligibility-checked",
        trigger: "check-eligibility",
      },
      {
        from: "eligibility-checked",
        to: "consent-given",
        trigger: "grant-consent",
        condition: "eligible",
      },
      {
        from: "eligibility-checked",
        to: "rejected",
        trigger: "reject",
        condition: "not-eligible",
      },
      {
        from: "eligibility-checked",
        to: "handed-off",
        trigger: "handoff",
        condition: "edge-case",
      },
      {
        from: "consent-given",
        to: "employer-verified",
        trigger: "verify-employer",
      },
      {
        from: "employer-verified",
        to: "document-submitted",
        trigger: "upload-document",
      },
      {
        from: "document-submitted",
        to: "entitlement-confirmed",
        trigger: "confirm-entitlement",
      },
      {
        from: "entitlement-confirmed",
        to: "confirmed",
        trigger: "accept-entitlement",
      },
    ],
  },
  grant: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "eligibility-checked" },
      { id: "consent-given" },
      { id: "document-submitted" },
      { id: "details-submitted" },
      { id: "conditions-reviewed" },
      { id: "assessment" },
      { id: "decision", receipt: true },
      { id: "approved", type: "terminal", receipt: true },
      { id: "rejected", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "eligibility-checked",
        trigger: "check-eligibility",
      },
      {
        from: "eligibility-checked",
        to: "consent-given",
        trigger: "grant-consent",
        condition: "eligible",
      },
      {
        from: "eligibility-checked",
        to: "rejected",
        trigger: "reject",
        condition: "not-eligible",
      },
      {
        from: "eligibility-checked",
        to: "handed-off",
        trigger: "handoff",
        condition: "edge-case",
      },
      {
        from: "consent-given",
        to: "document-submitted",
        trigger: "upload-document",
      },
      {
        from: "document-submitted",
        to: "details-submitted",
        trigger: "submit-details",
      },
      {
        from: "details-submitted",
        to: "conditions-reviewed",
        trigger: "review-conditions",
      },
      {
        from: "conditions-reviewed",
        to: "assessment",
        trigger: "begin-assessment",
      },
      { from: "assessment", to: "decision", trigger: "make-decision" },
      { from: "decision", to: "approved", trigger: "approve" },
      { from: "decision", to: "rejected", trigger: "reject-application" },
    ],
  },
  legal_process: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "eligibility-checked" },
      { id: "consent-given" },
      { id: "solicitor-details-collected" },
      { id: "witness-attested" },
      { id: "document-submitted" },
      { id: "details-submitted" },
      { id: "review" },
      { id: "decision", receipt: true },
      { id: "completed", type: "terminal", receipt: true },
      { id: "rejected", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "eligibility-checked",
        trigger: "check-eligibility",
      },
      {
        from: "eligibility-checked",
        to: "consent-given",
        trigger: "grant-consent",
        condition: "eligible",
      },
      {
        from: "eligibility-checked",
        to: "rejected",
        trigger: "reject",
        condition: "not-eligible",
      },
      {
        from: "eligibility-checked",
        to: "handed-off",
        trigger: "handoff",
        condition: "edge-case",
      },
      {
        from: "consent-given",
        to: "solicitor-details-collected",
        trigger: "collect-solicitor-details",
      },
      {
        from: "solicitor-details-collected",
        to: "witness-attested",
        trigger: "collect-witness",
      },
      {
        from: "witness-attested",
        to: "document-submitted",
        trigger: "upload-document",
      },
      {
        from: "document-submitted",
        to: "details-submitted",
        trigger: "submit-details",
      },
      { from: "details-submitted", to: "review", trigger: "begin-review" },
      { from: "review", to: "decision", trigger: "make-decision" },
      { from: "decision", to: "completed", trigger: "approve" },
      { from: "decision", to: "rejected", trigger: "reject" },
      { from: "decision", to: "handed-off", trigger: "handoff" },
    ],
  },
  obligation: {
    states: [
      { id: "not-started", type: "initial" },
      { id: "identity-verified" },
      { id: "consent-given" },
      { id: "details-submitted" },
      { id: "completed", type: "terminal", receipt: true },
      { id: "handed-off", type: "terminal", receipt: true },
    ],
    transitions: [
      {
        from: "not-started",
        to: "identity-verified",
        trigger: "verify-identity",
      },
      {
        from: "identity-verified",
        to: "consent-given",
        trigger: "grant-consent",
      },
      {
        from: "consent-given",
        to: "details-submitted",
        trigger: "submit-details",
      },
      {
        from: "details-submitted",
        to: "completed",
        trigger: "confirm",
      },
      {
        from: "identity-verified",
        to: "handed-off",
        trigger: "handoff",
        condition: "edge-case",
      },
    ],
  },
};

// ── Resolver functions ──

/**
 * Resolve a template's {placeholders} with actual service context.
 */
export function resolveTemplateInstructions(
  template: StateInstructionTemplate,
  ctx: TemplateContext,
): StateInstructions {
  const replacePlaceholders = (text: string): string =>
    text
      .replace(/\{serviceName\}/g, ctx.serviceName)
      .replace(/\{department\}/g, ctx.department)
      .replace(/\{govukUrl\}/g, ctx.govukUrl)
      .replace(/\{eligibilitySummary\}/g, ctx.eligibilitySummary);

  const instructions: Record<string, string> = {};
  for (const [stateId, text] of Object.entries(template.instructions)) {
    instructions[stateId] = replacePlaceholders(text);
  }

  return {
    version: template.version,
    instructions,
    forcedTransitions: template.forcedTransitions
      ? { ...template.forcedTransitions }
      : undefined,
    autoTransitions: template.autoTransitions
      ? template.autoTransitions.map((at) => ({ ...at }))
      : undefined,
  };
}

/**
 * Generate a StateModelDefinition from an interaction type template.
 */
export function templateToStateModel(
  interactionType: InteractionType,
  serviceId: string,
): StateModelDefinition {
  const template = STATE_MODEL_TEMPLATES[interactionType];
  return {
    id: `${serviceId}.states`,
    version: "1.0.0",
    states: template.states.map((s) => ({ ...s })),
    transitions: template.transitions.map((t) => ({ ...t })),
  };
}

// ── Dynamic milestone generation from templates ──

export interface MilestoneDefinition {
  label: string;
  states: string[];
}

export interface ServiceMilestoneConfig {
  title: string;
  milestones: MilestoneDefinition[];
}

export const INTERACTION_TYPE_TITLES: Record<InteractionType, string> = {
  application: "Application Progress",
  license: "Licence Application",
  register: "Registration Progress",
  portal: "Account Access",
  payment_service: "Payment Progress",
  appointment_booker: "Appointment Booking",
  task_list: "Task Progress",
  informational_hub: "Information Lookup",
  // ── Typology-specific (Phase 1) ──
  benefit: "Benefit Claim",
  entitlement: "Entitlement Claim",
  grant: "Grant Application",
  legal_process: "Legal Process",
  obligation: "Compliance notification",
};

/** Human-readable labels for template state IDs */
const TEMPLATE_STATE_LABELS: Record<string, string> = {
  "not-started": "Start",
  "identity-verified": "Identity",
  "eligibility-checked": "Eligibility",
  "consent-given": "Consent",
  "document-submitted": "Document",
  "details-submitted": "Details",
  "details-confirmed": "Details",
  assessment: "Assessment",
  decision: "Decision",
  completed: "Complete",
  registered: "Registered",
  issued: "Issued",
  "payment-made": "Payment",
  "amount-calculated": "Amount",
  "slot-selected": "Slot",
  "booking-confirmed": "Booked",
  attended: "Attended",
  "account-accessed": "Account",
  "action-performed": "Action",
  browsing: "Browsing",
  "information-provided": "Info",
  "step-1-complete": "Step 1",
  "step-2-complete": "Step 2",
  "step-3-complete": "Step 3",
  "all-steps-complete": "Complete",
  "referred-to-service": "Referred",
  "photo-submitted": "Photo",
  "application-submitted": "Submit",
  "claim-submitted": "Submit",
  // ── Typology-specific states (Phase 1) ──
  "income-assessed": "Income",
  "payment-details-collected": "Payment Setup",
  "benefit-active": "Active",
  "employer-verified": "Employer",
  "entitlement-confirmed": "Entitlement",
  confirmed: "Confirmed",
  "conditions-reviewed": "Conditions",
  approved: "Approved",
  "solicitor-details-collected": "Legal Rep",
  "witness-attested": "Witness",
  review: "Review",
};

/**
 * Generate milestone config for a StateProgressTracker from an interaction type template.
 * Groups non-terminal states into labeled milestones.
 */
export function generateMilestonesForType(
  interactionType: InteractionType,
): ServiceMilestoneConfig {
  const template = STATE_MODEL_TEMPLATES[interactionType];
  if (!template) {
    return {
      title: "Progress",
      milestones: [
        { label: "Start", states: ["not-started"] },
        { label: "Complete", states: ["completed"] },
      ],
    };
  }

  const terminalIds = new Set<string>();
  const failureTerminals = new Set([
    "rejected",
    "refused",
    "cancelled",
    "handed-off",
  ]);
  for (const s of template.states) {
    if (s.type === "terminal" && failureTerminals.has(s.id)) {
      terminalIds.add(s.id);
    }
  }

  const milestones: MilestoneDefinition[] = [];
  for (const s of template.states) {
    // Skip failure/handoff terminals — they don't appear as progress milestones
    if (terminalIds.has(s.id)) continue;
    const label =
      TEMPLATE_STATE_LABELS[s.id] ||
      s.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    milestones.push({ label, states: [s.id] });
  }

  return {
    title: INTERACTION_TYPE_TITLES[interactionType] || "Progress",
    milestones,
  };
}
