/**
 * Lightweight persona metadata — safe for client-side imports.
 *
 * This file must NOT import service-data.ts or any JSON files that
 * trigger an `fs` resolution in webpack. The data here is hardcoded
 * from the user JSON files so that client components (AppHeader,
 * PersonalDataDashboard, etc.) can access persona names, colours,
 * and initials without pulling the entire service-data bundle.
 */

export const PERSONA_NAMES: Record<string, string> = {
  "emma-parker": "Emma Parker",
  "rajesh-patel": "Rajesh Patel",
  "margaret-thompson": "Margaret Thompson",
  "priya-sharma": "Priya Sharma",
  "david-evans": "David Evans",
  "mary-summers": "Mary Summers",
  "rebecca-shortland": "Rebecca Shortland",
  "anna-cotton": "Anna Cotton",
  "sarah-okafor": "Sarah Okafor",
  "amina-hassan": "Amina Hassan",
  "marcus-taylor": "Marcus Taylor",
  "priya-anand": "Priya Anand",
  "james-whitfield": "James Whitfield",
  "daniel-obi": "Daniel Obi",
  "zara-begum": "Zara Begum",
  "fatima-nowak": "Fatima Nowak",
  "tomasz-nowak": "Tomasz Nowak",
};

export const PERSONA_COLORS: Record<string, string> = {
  "emma-parker": "#1d70b8",
  "rajesh-patel": "#00703c",
  "margaret-thompson": "#912b88",
  "priya-sharma": "#f47738",
  "david-evans": "#d4351c",
  "mary-summers": "#4c6272",
  "rebecca-shortland": "#b58900",
  "anna-cotton": "#1d70b8",
  "sarah-okafor": "#912b88",
  "amina-hassan": "#d4351c",
  "marcus-taylor": "#f47738",
  "priya-anand": "#1d70b8",
  "james-whitfield": "#00703c",
  "daniel-obi": "#4c6272",
  "zara-begum": "#28a197",
  "fatima-nowak": "#4c2c92",
  "tomasz-nowak": "#7c3aed",
};

function deriveInitials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Z]/.test(w));
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0][0];
  return words[0][0] + words[words.length - 1][0];
}

export const PERSONA_INITIALS: Record<string, string> = Object.fromEntries(
  Object.entries(PERSONA_NAMES).map(([id, name]) => [id, deriveInitials(name)]),
);
