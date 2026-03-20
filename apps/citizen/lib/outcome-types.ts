/**
 * Journey Outcome Types — tangible results of completing a government service.
 *
 * Outcomes materialise when a journey completes: payments confirmed,
 * credentials issued, documents produced, departments notified.
 */

export type OutcomeType =
  | "payment"
  | "credential"
  | "document"
  | "registration"
  | "notification";

export interface JourneyOutcome {
  id: string;
  serviceId: string;
  serviceName: string;
  department: string;
  type: OutcomeType;
  title: string;
  reference: string;
  details: OutcomeDetail[];
  issuedAt: string;
  /** If type=credential, the credential to add to the citizen's wallet */
  credential?: CredentialUpdate;
}

export interface OutcomeDetail {
  label: string;
  value: string;
  /** Render prominently (e.g. payment amount in large font) */
  highlight?: boolean;
  type?: "currency" | "date" | "text" | "credential-number";
}

export interface CredentialUpdate {
  type: string;
  issuer: string;
  number: string;
  issued: string;
  expires?: string;
  status: "valid";
}
