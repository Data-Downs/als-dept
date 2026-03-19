/**
 * Persona–Department mapping.
 *
 * Maps each persona to the government departments whose services they
 * interact with. Derived from the coverage matrix in docs/personas.html.
 *
 * Used by the citizen app persona picker and legibility studio to
 * filter personas by department.
 */

export type DepartmentCode =
  | "MoJ"
  | "DWP"
  | "HMRC"
  | "DfE"
  | "Home Office"
  | "DVLA";

export interface DepartmentInfo {
  code: DepartmentCode;
  name: string;
  color: string;
}

export const DEPARTMENTS: DepartmentInfo[] = [
  { code: "MoJ", name: "Ministry of Justice", color: "#912b88" },
  { code: "DWP", name: "Department for Work & Pensions", color: "#1d70b8" },
  { code: "HMRC", name: "HM Revenue & Customs", color: "#00703c" },
  { code: "DfE", name: "Department for Education", color: "#f47738" },
  { code: "Home Office", name: "Home Office", color: "#d4351c" },
  { code: "DVLA", name: "Driver & Vehicle Licensing Agency", color: "#4c6272" },
];

/** Which departments each persona interacts with */
export const PERSONA_DEPARTMENTS: Record<string, DepartmentCode[]> = {
  // ── Department demo personas ──
  "sarah-okafor": ["MoJ", "DWP", "HMRC"],
  "amina-hassan": ["Home Office", "DWP", "HMRC", "DfE"],
  "marcus-taylor": ["MoJ", "DWP", "Home Office", "DVLA"],
  "priya-anand": ["DWP", "HMRC", "DfE"],
  "james-whitfield": ["DWP", "MoJ", "DfE", "DVLA"],
  "daniel-obi": ["HMRC", "DWP", "MoJ", "DVLA"],
  "zara-begum": ["DfE", "HMRC", "DWP", "Home Office", "DVLA"],
  "fatima-nowak": ["DfE", "DWP", "HMRC", "Home Office", "DVLA"],
  "tomasz-nowak": ["Home Office", "DVLA", "DWP", "HMRC"],
  // ── Original personas ──
  "anna-cotton": ["DWP"],
  "emma-parker": ["DWP", "HMRC"],
  "rajesh-patel": ["HMRC", "DVLA"],
  "margaret-thompson": ["DWP", "HMRC"],
  "priya-sharma": ["DWP"],
  "david-evans": ["DWP"],
  "mary-summers": ["DWP", "HMRC"],
  "rebecca-shortland": ["HMRC", "DWP"],
  "helen-pitt": ["DWP", "HMRC"],
};

/** Get all persona IDs that interact with a given department */
export function getPersonasByDepartment(dept: DepartmentCode): string[] {
  return Object.entries(PERSONA_DEPARTMENTS)
    .filter(([, depts]) => depts.includes(dept))
    .map(([id]) => id);
}

/** Get departments for a given persona */
export function getDepartmentsForPersona(personaId: string): DepartmentCode[] {
  return PERSONA_DEPARTMENTS[personaId] ?? [];
}
