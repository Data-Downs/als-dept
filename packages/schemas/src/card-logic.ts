/**
 * card-logic.ts — Framework-neutral semantics for a card.
 *
 * The single definition of "what a card means" — conditional visibility,
 * required-field completion, what gets submitted, and the field-type→widget
 * mapping. Every renderer (the React app's field-renderers, the GOV.UK web
 * form pages) reads these so they cannot drift: same card, same behaviour,
 * different drawing.
 */

import type { CardDefinition, CardFieldDef, CardFieldType } from "./card-types";

export type FieldValue = string | number | boolean;
export type FieldValues = Record<string, FieldValue | undefined>;

function hasValue(v: FieldValue | undefined): boolean {
  return v !== "" && v !== undefined && v !== null;
}

/** A field is visible unless a showWhen condition on another field's value fails. */
export function isFieldVisible(
  field: CardFieldDef,
  values: FieldValues,
): boolean {
  if (!field.showWhen) return true;
  const depValue = String(values[field.showWhen.field] ?? "");
  return field.showWhen.values.includes(depValue);
}

/** The fields currently visible given the entered values. */
export function getVisibleFields(
  definition: CardDefinition,
  values: FieldValues,
): CardFieldDef[] {
  return definition.fields.filter((f) => isFieldVisible(f, values));
}

/** True when every visible, required field has a value. */
export function isComplete(
  definition: CardDefinition,
  values: FieldValues,
): boolean {
  return definition.fields
    .filter((f) => f.required && isFieldVisible(f, values))
    .every((f) => hasValue(values[f.key]));
}

/** The submittable subset: visible fields that have a value. */
export function collectSubmission(
  definition: CardDefinition,
  values: FieldValues,
): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const field of definition.fields) {
    if (isFieldVisible(field, values) && hasValue(values[field.key])) {
      out[field.key] = values[field.key] as FieldValue;
    }
  }
  return out;
}

// ── Field-type → widget descriptor ──

export type GovukControl =
  | "input"
  | "textarea"
  | "select"
  | "radios"
  | "checkboxes"
  | "date"
  | "file"
  | "readonly";

export interface FieldDescriptor {
  control: GovukControl;
  /** <input type> for input controls. */
  htmlType?: string;
  /** inputmode hint (numeric, tel, email). */
  inputMode?: string;
  /** Multiple-select controls (checkbox/checklist). */
  multiple?: boolean;
}

/**
 * Semantic descriptor per field type. Renderers map this to their own widgets:
 * the web renderer to GOV.UK Design System components, the app to React inputs.
 */
export const FIELD_DESCRIPTORS: Record<CardFieldType, FieldDescriptor> = {
  text: { control: "input", htmlType: "text" },
  email: { control: "input", htmlType: "email", inputMode: "email" },
  phone: { control: "input", htmlType: "tel", inputMode: "tel" },
  number: { control: "input", htmlType: "text", inputMode: "numeric" },
  currency: { control: "input", htmlType: "text", inputMode: "numeric" },
  date: { control: "date" },
  select: { control: "select" },
  radio: { control: "radios" },
  checkbox: { control: "checkboxes", multiple: true },
  checklist: { control: "checkboxes", multiple: true },
  address: { control: "textarea" },
  "sort-code": { control: "input", htmlType: "text", inputMode: "numeric" },
  "account-number": { control: "input", htmlType: "text", inputMode: "numeric" },
  readonly: { control: "readonly" },
  file: { control: "file" },
};
