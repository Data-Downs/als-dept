/**
 * Department metadata and persona-department mapping.
 *
 * Client-safe — no native module dependencies.
 * Mirrors @als/personal-data/src/persona-departments.ts but lives
 * inside the citizen app to avoid barrel export issues with
 * better-sqlite3 in client components.
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

export const PERSONA_DEPARTMENTS: Record<string, DepartmentCode[]> = {
  "sarah-okafor": ["MoJ", "DWP", "HMRC"],
  "amina-hassan": ["Home Office", "DWP", "HMRC", "DfE"],
  "marcus-taylor": ["MoJ", "DWP", "Home Office", "DVLA"],
  "priya-anand": ["DWP", "HMRC", "DfE"],
  "james-whitfield": ["DWP", "MoJ", "DfE", "DVLA"],
  "daniel-obi": ["HMRC", "DWP", "MoJ", "DVLA"],
  "zara-begum": ["DfE", "HMRC", "DWP", "Home Office", "DVLA"],
  "fatima-nowak": ["DfE", "DWP", "HMRC", "Home Office", "DVLA"],
  "tomasz-nowak": ["Home Office", "DVLA", "DWP", "HMRC"],
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
