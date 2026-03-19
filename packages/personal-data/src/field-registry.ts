/**
 * Field Registry — Runtime-queryable metadata for every citizen data field.
 *
 * Maps field paths to their authoritative source department(s), topic
 * classification, trust tier, and GDS requirement ID.
 *
 * Enables:
 *   getFieldsBySource("HMRC") → all fields HMRC holds
 *   getFieldsByTopic("driving") → all driving-related fields
 *   getFieldsByTier("verified") → all high-trust fields
 *   getFieldMetaForPath("employment.income") → full metadata
 */

import type { DataFieldMeta, DataSource, DataTopic, DataTier } from "./citizen-data-model";

/** Master registry of all citizen data fields with source attribution */
export const FIELD_REGISTRY: Record<string, DataFieldMeta> = {
  // ── Identity ──
  "primaryContact.firstName": { sources: ["User"], topic: "identity", tier: "verified", gdsRequirementId: "REQ.ID36" },
  "primaryContact.middleName": { sources: ["User"], topic: "identity", tier: "verified" },
  "primaryContact.lastName": { sources: ["User"], topic: "identity", tier: "verified", gdsRequirementId: "REQ.ID36" },
  "primaryContact.dateOfBirth": { sources: ["User"], topic: "identity", tier: "verified", gdsRequirementId: "REQ.ID22" },
  "primaryContact.nationalInsuranceNumber": { sources: ["DWP", "HMRC"], topic: "finance", tier: "verified", gdsRequirementId: "REQ.ID52" },
  "primaryContact.email": { sources: ["User", "GOV.UK App"], topic: "identity", tier: "submitted", gdsRequirementId: "REQ.ID25" },
  "primaryContact.phone": { sources: ["User"], topic: "identity", tier: "submitted", gdsRequirementId: "REQ.ID26" },
  "oneLoginId": { sources: ["GDS"], topic: "identity", tier: "verified", gdsRequirementId: "REQ.ID01" },
  "title": { sources: ["User"], topic: "identity", tier: "submitted" },
  "nationality": { sources: ["HM Passport Office", "Home Office"], topic: "identity", tier: "verified", gdsRequirementId: "REQ.ID37" },
  "nhsNumber": { sources: ["NHS"], topic: "health", tier: "verified", gdsRequirementId: "REQ.ID53" },

  // ── Address & Housing ──
  "address.line1": { sources: ["HMRC", "DVLA", "Local Authority"], topic: "housing", tier: "verified", gdsRequirementId: "REQ.ID70" },
  "address.line2": { sources: ["HMRC", "DVLA", "Local Authority"], topic: "housing", tier: "verified" },
  "address.city": { sources: ["HMRC", "DVLA", "Local Authority"], topic: "housing", tier: "verified" },
  "address.county": { sources: ["HMRC", "DVLA", "Local Authority"], topic: "housing", tier: "verified" },
  "address.postcode": { sources: ["HMRC", "DVLA", "Local Authority"], topic: "housing", tier: "verified", gdsRequirementId: "REQ.ID71" },
  "address.housingStatus": { sources: ["DWP", "Local Authority"], topic: "housing", tier: "submitted" },
  "address.residingSince": { sources: ["User"], topic: "housing", tier: "submitted" },
  "housing.type": { sources: ["Local Authority", "DWP"], topic: "housing", tier: "submitted" },
  "housing.monthlyPayment": { sources: ["DWP"], topic: "housing", tier: "submitted" },
  "councilTaxStatus.band": { sources: ["Local Authority"], topic: "housing", tier: "verified", gdsRequirementId: "REQ.ID72" },

  // ── Passport ──
  "passport.number": { sources: ["HM Passport Office"], topic: "identity", tier: "verified", gdsRequirementId: "REQ.ID54" },
  "passport.expiryDate": { sources: ["HM Passport Office"], topic: "identity", tier: "verified" },
  "passport.status": { sources: ["HM Passport Office"], topic: "identity", tier: "verified" },

  // ── Employment ──
  "employment.status": { sources: ["HMRC", "DWP"], topic: "employment", tier: "verified", gdsRequirementId: "REQ.ID40" },
  "employment.employer": { sources: ["HMRC"], topic: "employment", tier: "verified", gdsRequirementId: "REQ.ID41" },
  "employment.income": { sources: ["HMRC"], topic: "finance", tier: "verified", gdsRequirementId: "REQ.ID42" },
  "employment.taxCode": { sources: ["HMRC"], topic: "finance", tier: "verified", gdsRequirementId: "REQ.ID43" },
  "employment.payrollNumber": { sources: ["HMRC"], topic: "employment", tier: "verified" },
  "employmentHistory": { sources: ["HMRC"], topic: "employment", tier: "verified", gdsRequirementId: "REQ.ID44" },
  "workplace.name": { sources: ["HMRC"], topic: "employment", tier: "submitted" },
  "workplace.address": { sources: ["HMRC"], topic: "employment", tier: "submitted" },

  // ── Financial ──
  "financials.householdIncome": { sources: ["HMRC", "DWP"], topic: "finance", tier: "verified" },
  "financials.savings": { sources: ["User"], topic: "finance", tier: "submitted", gdsRequirementId: "REQ.ID46" },
  "financials.currentAccount": { sources: ["User"], topic: "finance", tier: "submitted" },
  "financials.savingsAccount": { sources: ["User"], topic: "finance", tier: "submitted" },
  "financials.investments": { sources: ["User"], topic: "finance", tier: "submitted" },
  "niRecord.qualifyingYears": { sources: ["DWP", "HMRC"], topic: "finance", tier: "verified", gdsRequirementId: "REQ.ID55" },
  "statePensionForecast.weeklyAmount": { sources: ["DWP"], topic: "finance", tier: "verified", gdsRequirementId: "REQ.ID56" },
  "statePensionForecast.pensionAge": { sources: ["DWP"], topic: "finance", tier: "verified" },

  // ── Benefits ──
  "benefits.currentlyReceiving": { sources: ["DWP"], topic: "finance", tier: "verified", gdsRequirementId: "REQ.ID60" },
  "benefits.potentiallyEligibleFor": { sources: ["DWP", "HMRC", "Local Authority"], topic: "finance", tier: "inferred" },

  // ── Vehicles & Driving ──
  "vehicles[].registrationNumber": { sources: ["DVLA"], topic: "driving", tier: "verified", gdsRequirementId: "REQ.ID94" },
  "vehicles[].make": { sources: ["DVLA"], topic: "driving", tier: "verified" },
  "vehicles[].model": { sources: ["DVLA"], topic: "driving", tier: "verified" },
  "vehicles[].motExpiry": { sources: ["DVLA"], topic: "driving", tier: "verified", gdsRequirementId: "REQ.ID48" },
  "vehicles[].taxExpiry": { sources: ["DVLA"], topic: "driving", tier: "verified", gdsRequirementId: "REQ.ID49" },
  "vehicles[].insuranceExpiry": { sources: ["User"], topic: "driving", tier: "submitted" },
  "vehicles[].businessUse": { sources: ["HMRC"], topic: "driving", tier: "submitted" },

  // ── Health ──
  "healthInfo.conditions": { sources: ["NHS"], topic: "health", tier: "verified" },
  "healthInfo.medications": { sources: ["NHS"], topic: "health", tier: "verified" },
  "healthInfo.gpSurgery": { sources: ["NHS"], topic: "health", tier: "verified" },

  // ── Family ──
  "children[].firstName": { sources: ["User", "General Register Office"], topic: "parenting", tier: "verified" },
  "children[].dateOfBirth": { sources: ["User", "General Register Office"], topic: "parenting", tier: "verified" },
  "children[].childBenefitNumber": { sources: ["HMRC"], topic: "parenting", tier: "verified" },
  "partner.firstName": { sources: ["User"], topic: "identity", tier: "submitted" },
  "partner.dateOfBirth": { sources: ["User"], topic: "identity", tier: "submitted" },

  // ── Bereavement (Sarah Okafor) ──
  "bereavement.deceasedName": { sources: ["General Register Office"], topic: "legal", tier: "verified" },
  "bereavement.dateOfDeath": { sources: ["General Register Office"], topic: "legal", tier: "verified" },
  "bereavement.relationship": { sources: ["User"], topic: "legal", tier: "submitted" },
  "bereavement.estateValue": { sources: ["HMRC", "User"], topic: "finance", tier: "submitted" },
  "bereavement.willExists": { sources: ["User"], topic: "legal", tier: "submitted" },
  "bereavement.executorStatus": { sources: ["HMCTS"], topic: "legal", tier: "verified" },
  "bereavement.probateStatus": { sources: ["HMCTS"], topic: "legal", tier: "verified" },
  "bereavement.tellUsOnceRef": { sources: ["DWP"], topic: "legal", tier: "verified" },
  "bereavement.ihtLiability": { sources: ["HMRC"], topic: "finance", tier: "verified" },
  "bereavement.pensionProviders": { sources: ["User"], topic: "finance", tier: "submitted" },

  // ── Immigration (Amina Hassan, Nowaks) ──
  "immigration.status": { sources: ["Home Office"], topic: "immigration", tier: "verified" },
  "immigration.homeOfficeRef": { sources: ["Home Office"], topic: "immigration", tier: "verified" },
  "immigration.brpNumber": { sources: ["Home Office"], topic: "immigration", tier: "verified" },
  "immigration.brpExpiry": { sources: ["Home Office"], topic: "immigration", tier: "verified" },
  "immigration.eVisaMigrationDate": { sources: ["Home Office"], topic: "immigration", tier: "verified" },
  "immigration.rightToWork": { sources: ["Home Office"], topic: "immigration", tier: "verified" },
  "immigration.rightToRent": { sources: ["Home Office"], topic: "immigration", tier: "verified" },
  "immigration.languageProficiency": { sources: ["User"], topic: "immigration", tier: "submitted" },
  "immigration.accommodationType": { sources: ["Home Office"], topic: "immigration", tier: "submitted" },
  "immigration.ninoStatus": { sources: ["DWP"], topic: "immigration", tier: "verified" },

  // ── Justice History (Marcus Taylor) ──
  "justiceHistory.releaseDate": { sources: ["HMPPS"], topic: "justice", tier: "verified" },
  "justiceHistory.sentenceLength": { sources: ["HMPPS"], topic: "justice", tier: "verified" },
  "justiceHistory.offenceCategory": { sources: ["HMPPS"], topic: "justice", tier: "verified" },
  "justiceHistory.licenceConditions": { sources: ["HMPPS"], topic: "justice", tier: "verified" },
  "justiceHistory.licenceEndDate": { sources: ["HMPPS"], topic: "justice", tier: "verified" },
  "justiceHistory.probationOfficer": { sources: ["HMPPS"], topic: "justice", tier: "verified" },
  "justiceHistory.reportingSchedule": { sources: ["HMPPS"], topic: "justice", tier: "verified" },
  "justiceHistory.restrictions": { sources: ["HMPPS"], topic: "justice", tier: "verified" },
  "justiceHistory.dbsDisclosureStatus": { sources: ["DBS"], topic: "justice", tier: "verified" },
  "justiceHistory.approvedPremisesDeadline": { sources: ["HMPPS"], topic: "justice", tier: "verified" },

  // ── Childcare (Priya Anand) ──
  "childcare.nurseryProvider": { sources: ["User"], topic: "parenting", tier: "submitted" },
  "childcare.nurseryCostMonthly": { sources: ["User"], topic: "parenting", tier: "submitted" },
  "childcare.thirtyHourCode": { sources: ["HMRC"], topic: "parenting", tier: "verified", gdsRequirementId: "REQ.ID85" },
  "childcare.thirtyHourCodeExpiry": { sources: ["HMRC"], topic: "parenting", tier: "verified" },
  "childcare.taxFreeChildcareAccount": { sources: ["HMRC"], topic: "finance", tier: "verified", gdsRequirementId: "REQ.ID86" },
  "childcare.taxFreeChildcareBalance": { sources: ["HMRC"], topic: "finance", tier: "verified" },
  "childcare.fsmEligibility": { sources: ["DfE", "DWP"], topic: "parenting", tier: "verified" },
  "childcare.schoolRegistrationStatus": { sources: ["Local Authority"], topic: "education", tier: "submitted" },

  // ── Appeals (James Whitfield) ──
  "appeals.pipMandatoryRecon": { sources: ["DWP"], topic: "disability", tier: "verified" },
  "appeals.tribunalAppealRef": { sources: ["HMCTS"], topic: "legal", tier: "verified" },
  "appeals.tribunalHearingDate": { sources: ["HMCTS"], topic: "legal", tier: "verified" },
  "appeals.ehcpApplicationDate": { sources: ["Local Authority"], topic: "education", tier: "verified" },
  "appeals.ehcpStatutoryDeadline": { sources: ["Local Authority"], topic: "education", tier: "verified" },
  "appeals.ehcpCurrentWeek": { sources: ["Local Authority"], topic: "education", tier: "verified" },
  "appeals.sendTribunalStatus": { sources: ["HMCTS"], topic: "legal", tier: "verified" },
  "appeals.legalAidEligibility": { sources: ["LAA"], topic: "legal", tier: "verified" },
  "appeals.evidenceChecklist": { sources: ["User"], topic: "legal", tier: "submitted" },

  // ── Self-Employment (Daniel Obi) ──
  "selfEmployment.tradingName": { sources: ["HMRC", "Companies House"], topic: "business", tier: "verified" },
  "selfEmployment.utrNumber": { sources: ["HMRC"], topic: "business", tier: "verified", gdsRequirementId: "REQ.ID90" },
  "selfEmployment.turnover": { sources: ["HMRC"], topic: "business", tier: "verified" },
  "selfEmployment.expenses": { sources: ["HMRC"], topic: "business", tier: "submitted" },
  "selfEmployment.netProfit": { sources: ["HMRC"], topic: "business", tier: "verified" },
  "selfEmployment.mtdStatus": { sources: ["HMRC"], topic: "business", tier: "verified" },
  "selfEmployment.mtdDeadline": { sources: ["HMRC"], topic: "business", tier: "verified" },
  "selfEmployment.outstandingInvoices": { sources: ["User"], topic: "business", tier: "submitted" },
  "selfEmployment.quarterlyReportingDates": { sources: ["HMRC"], topic: "business", tier: "verified" },
  "selfEmployment.saFilingHistory": { sources: ["HMRC"], topic: "business", tier: "verified" },

  // ── First Timer (Zara Begum) ──
  "firstTimer.educationStatus": { sources: ["DfE", "UCAS"], topic: "education", tier: "verified" },
  "firstTimer.studentFinanceStatus": { sources: ["SLC"], topic: "education", tier: "verified" },
  "firstTimer.parentalIncomeRequired": { sources: ["SLC"], topic: "education", tier: "verified" },
  "firstTimer.niNumberStatus": { sources: ["DWP"], topic: "identity", tier: "verified" },
  "firstTimer.provisionalLicence": { sources: ["DVLA"], topic: "driving", tier: "verified" },
  "firstTimer.drivingTestBooking": { sources: ["DVSA"], topic: "driving", tier: "verified" },
  "firstTimer.payeDetails": { sources: ["HMRC"], topic: "employment", tier: "verified" },
  "firstTimer.passportStatus": { sources: ["HM Passport Office"], topic: "identity", tier: "verified" },
  "firstTimer.institutionalLiteracy": { sources: ["Agent inference"], topic: "general", tier: "inferred" },

  // ── Growing Family (Fatima & Tomasz Nowak) ──
  "growingFamily.children": { sources: ["User", "DfE"], topic: "parenting", tier: "submitted" },
  "growingFamily.ehcpDetails": { sources: ["Local Authority"], topic: "education", tier: "verified" },
  "growingFamily.secondaryTransferStatus": { sources: ["Local Authority"], topic: "education", tier: "verified" },
  "growingFamily.childBenefitClaims": { sources: ["HMRC"], topic: "finance", tier: "verified" },
  "growingFamily.hicbcRisk": { sources: ["HMRC"], topic: "finance", tier: "inferred" },
  "growingFamily.householdIncomeBreakdown": { sources: ["HMRC", "DWP"], topic: "finance", tier: "verified" },
  "growingFamily.immigrationStatusPerMember": { sources: ["Home Office"], topic: "immigration", tier: "verified" },
  "growingFamily.carersAllowanceEligibility": { sources: ["DWP"], topic: "disability", tier: "verified" },
  "growingFamily.rightToWorkShareCode": { sources: ["Home Office"], topic: "immigration", tier: "verified" },

  // ── Education ──
  "uniqueLearnerNumber": { sources: ["DfE"], topic: "education", tier: "verified" },

  // ── Preferences ──
  "notificationPreferences.push": { sources: ["GOV.UK App"], topic: "general", tier: "submitted" },
  "notificationPreferences.email": { sources: ["GOV.UK App"], topic: "general", tier: "submitted" },
  "notificationPreferences.sms": { sources: ["GOV.UK App"], topic: "general", tier: "submitted" },
  "topicPreferences": { sources: ["GOV.UK App"], topic: "general", tier: "submitted" },
  "chatHistory": { sources: ["GOV.UK App"], topic: "general", tier: "submitted" },

  // ── Communication ──
  "communicationStyle.tone": { sources: ["Agent inference"], topic: "general", tier: "inferred" },
  "communicationStyle.techSavvy": { sources: ["Agent inference"], topic: "general", tier: "inferred" },
  "communicationStyle.primaryConcerns": { sources: ["Agent inference"], topic: "general", tier: "inferred" },
  "communicationStyle.typicalPhrases": { sources: ["Agent inference"], topic: "general", tier: "inferred" },
};

// ── Query Helpers ──

/** Get all field paths where a given department is a source */
export function getFieldsBySource(source: DataSource): string[] {
  return Object.entries(FIELD_REGISTRY)
    .filter(([, meta]) => meta.sources.includes(source))
    .map(([path]) => path);
}

/** Get all field paths for a given topic */
export function getFieldsByTopic(topic: DataTopic): string[] {
  return Object.entries(FIELD_REGISTRY)
    .filter(([, meta]) => meta.topic === topic)
    .map(([path]) => path);
}

/** Get all field paths for a given trust tier */
export function getFieldsByTier(tier: DataTier): string[] {
  return Object.entries(FIELD_REGISTRY)
    .filter(([, meta]) => meta.tier === tier)
    .map(([path]) => path);
}

/** Get metadata for a specific field path, or undefined if not registered */
export function getFieldMetaForPath(path: string): DataFieldMeta | undefined {
  return FIELD_REGISTRY[path];
}

/** Get all unique sources across the registry */
export function getAllSources(): DataSource[] {
  const sources = new Set<DataSource>();
  for (const meta of Object.values(FIELD_REGISTRY)) {
    for (const source of meta.sources) {
      sources.add(source);
    }
  }
  return Array.from(sources);
}

/** Get all unique topics across the registry */
export function getAllTopics(): DataTopic[] {
  const topics = new Set<DataTopic>();
  for (const meta of Object.values(FIELD_REGISTRY)) {
    topics.add(meta.topic);
  }
  return Array.from(topics);
}
