/**
 * Canonical department name and key normalisation.
 *
 * Services arrive from three sources (graph, catalogue, full-artefact) using
 * inconsistent department names — e.g. "DWP" vs "Department for Work and
 * Pensions". This map ensures every service gets a consistent display name
 * and department_key so the legibility studio doesn't show duplicates.
 */

/** Maps raw department names to canonical { key, name } pairs */
const DEPT_NAME_MAP: Record<string, { key: string; name: string }> = {
  // ── Catalogue full names → canonical abbreviations ──
  "Department for Work and Pensions": { key: "dwp", name: "DWP" },
  "Driver and Vehicle Licensing Agency": { key: "dvla", name: "DVLA" },
  "Driver and Vehicle Standards Agency": { key: "dvsa", name: "DVSA" },
  "HM Revenue & Customs": { key: "hmrc", name: "HMRC" },
  "HM Courts & Tribunals Service": { key: "hmcts", name: "HMCTS" },
  "HM Passport Office": { key: "hmpo", name: "HMPO" },
  "HM Land Registry": { key: "land-registry", name: "HM Land Registry" },
  "HM Prison Service": { key: "hmpps", name: "HMPPS" },
  "UK Visas and Immigration": { key: "home-office", name: "Home Office" },
  "Border Force": { key: "home-office", name: "Home Office" },
  "Disclosure and Barring Service": { key: "dbs", name: "DBS" },
  "Ministry of Justice": { key: "moj", name: "MoJ" },
  "Ministry of Defence": { key: "mod", name: "MoD" },
  "Ministry of Housing, Communities and Local Government": {
    key: "mhclg",
    name: "MHCLG",
  },
  "Department for Education": { key: "dfe", name: "DfE" },
  "Department for Business and Trade": { key: "dbt", name: "DBT" },
  "Department for Environment, Food & Rural Affairs": {
    key: "defra",
    name: "Defra",
  },
  "Department for Energy Security and Net Zero": {
    key: "desnz",
    name: "DESNZ",
  },
  "Department for Transport": { key: "dft", name: "DfT" },
  "Department of Health and Social Care": { key: "dhsc", name: "DHSC" },
  "Department for Culture, Media and Sport": { key: "dcms", name: "DCMS" },
  "Foreign, Commonwealth & Development Office": { key: "fcdo", name: "FCDO" },
  "Competition and Markets Authority": { key: "cma", name: "CMA" },
  "Environment Agency": {
    key: "environment-agency",
    name: "Environment Agency",
  },
  "Valuation Office Agency": { key: "voa", name: "VOA" },
  "The Charity Commission": {
    key: "charity-commission",
    name: "Charity Commission",
  },
  "Legal Aid Agency": { key: "laa", name: "Legal Aid Agency" },
  "Office for Students": {
    key: "office-for-students",
    name: "Office for Students",
  },
  "Vehicle Certification Agency": { key: "vca", name: "VCA" },
  "Youth Justice Board for England and Wales": { key: "yjb", name: "YJB" },
  "Animal and Plant Health Agency": { key: "apha", name: "APHA" },
  "Maritime and Coastguard Agency": { key: "mca", name: "MCA" },
  "Planning Inspectorate": {
    key: "pins",
    name: "Planning Inspectorate",
  },
  "The Insolvency Service": {
    key: "insolvency-service",
    name: "Insolvency Service",
  },
  "Student Loans Company": {
    key: "slc",
    name: "Student Loans Company",
  },
  "Closed organisation: Highways England": {
    key: "national-highways",
    name: "National Highways",
  },
  "Closed organisation: Government Equalities Office": {
    key: "geo",
    name: "Government Equalities Office",
  },
  "Closed organisation: Department for Business, Energy & Industrial Strategy": {
    key: "dbt",
    name: "DBT",
  },
  "Closed organisation: Department for Digital, Culture, Media & Sport": {
    key: "dcms",
    name: "DCMS",
  },
  "Closed organisation: Department for Levelling Up, Housing and Communities": {
    key: "mhclg",
    name: "MHCLG",
  },
  "Closed organisation: HM Courts Service": {
    key: "hmcts",
    name: "HMCTS",
  },
  "Closed organisation: Child Maintenance and Enforcement Commission": {
    key: "dwp",
    name: "DWP",
  },
  // ── Graph display names that need normalised keys ──
  "Land Registry": { key: "land-registry", name: "HM Land Registry" },
  "DfE / School": { key: "dfe", name: "DfE" },
  Employer: { key: "employer", name: "Employer" },
  "Employer / Tribunal": { key: "employer", name: "Employer" },
  "The Pensions Regulator": {
    key: "tpr",
    name: "The Pensions Regulator",
  },
  "Homes England": { key: "homes-england", name: "Homes England" },
};

/** Graph department keys that differ from catalogue convention */
const DEPT_KEY_ALIASES: Record<string, string> = {
  ho: "home-office",
  ch: "companies-house",
  lr: "land-registry",
  la: "local-authority",
};

/**
 * Normalise a raw department name + key into a canonical form.
 * Checks the name-based map first (handles catalogue full names and graph
 * oddities), then falls back to key aliasing for short graph keys.
 */
export function normaliseDepartment(
  name: string,
  key: string,
): { name: string; key: string } {
  const byName = DEPT_NAME_MAP[name];
  if (byName) return byName;

  const aliasedKey = DEPT_KEY_ALIASES[key] || key;
  return { name, key: aliasedKey };
}
