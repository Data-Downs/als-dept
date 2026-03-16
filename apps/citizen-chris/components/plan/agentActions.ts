import type { LifeEventService } from "@/lib/types";

/** Map a service to a sensible "Dot can ..." action phrase */
const SERVICE_TYPE_ACTIONS: Record<string, string> = {
  benefit: "check your eligibility and apply",
  entitlement: "check your eligibility and apply",
  grant: "check your eligibility and apply",
  application: "fill in and submit this for you",
  tax: "handle this for you",
  payment: "set this up for you",
  licence: "apply for this on your behalf",
  license: "apply for this on your behalf",
  registration: "find your nearest office and book",
  notification: "notify the relevant department",
  record: "request this on your behalf",
  information: "look this up for you",
};

const NAME_OVERRIDES: Record<string, string> = {
  "Register the birth": "find your nearest register office and book",
  "GP registration for baby": "register with your current GP surgery",
  "Healthy Start vouchers": "check your eligibility and apply",
  "Free prescriptions & dental (pregnancy)":
    "apply for your exemption certificate",
  "Tax-Free Childcare": "set up your childcare account",
  "Child Benefit": "submit the claim for you",
};

export function agentActionForService(svc: LifeEventService): string {
  if (NAME_OVERRIDES[svc.name]) return NAME_OVERRIDES[svc.name];
  if (SERVICE_TYPE_ACTIONS[svc.serviceType])
    return SERVICE_TYPE_ACTIONS[svc.serviceType];
  return "help you with this";
}
