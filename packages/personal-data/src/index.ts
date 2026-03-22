export { VerifiedStore } from "./verified-store";
export { IncidentalStore } from "./incidental-store";
export { ConsentLedger } from "./consent-ledger";
export { SubmittedStore } from "./submitted-store";
export { InferredStore, normalizeKey } from "./inferred-store";
export type { MergeResult, MergeOutcome } from "./inferred-store";
export { ServiceAccessStore } from "./service-access-store";
export { ConsentPreferenceStore } from "./consent-preference-store";
export { categoriseField, categoriseGrant } from "./field-categories";
export type {
  PersonalDataProfile,
  VerifiedData,
  IncidentalData,
  IncidentalField,
  HouseholdMember,
  ConsentRecord,
  ThreeTierProfile,
  SubmittedField,
  SubmittedData,
  InferredFact,
  InferredData as InferredDataType,
  ServiceAccessGrant,
  ServiceAccessMap,
} from "./data-model";

// Unified citizen data model
export type {
  CitizenProfile,
  DataFieldMeta,
  DataTier,
  DataTopic,
  DataSource,
  FieldSourceAttribution,
  BereavementData,
  ImmigrationData,
  JusticeHistoryData,
  ChildcareData,
  AppealsData,
  SelfEmploymentData,
  FirstTimerData,
  GrowingFamilyData,
  Vehicle,
  WalletCredential,
  RelationshipType,
  PermissionScope,
  FamilyRelationship,
  DelegationPermission,
  Household,
  HouseholdMemberRef,
  DelegatedAction,
} from "./citizen-data-model";

// Relationship store
export { RelationshipStore } from "./relationship-store";

// Persona–Department mapping
export type { DepartmentCode, DepartmentInfo } from "./persona-departments";
export {
  DEPARTMENTS,
  PERSONA_DEPARTMENTS,
  getPersonasByDepartment,
  getDepartmentsForPersona,
} from "./persona-departments";

// Field registry
export {
  FIELD_REGISTRY,
  getFieldsBySource,
  getFieldsByTopic,
  getFieldsByTier,
  getFieldMetaForPath,
  getAllSources,
  getAllTopics,
} from "./field-registry";
