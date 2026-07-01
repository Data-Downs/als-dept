import type { GovLoginType } from "@als/personal-data/src/citizen-data-model";

/**
 * Which login a given government service requires — as of the messy 2026
 * reality, where One Login and Government Gateway coexist service-by-service.
 * This is what makes "which login do I use?" a live problem in a journey:
 * HMRC still sends you to Government Gateway, Companies House to One Login
 * (with an identity check), and registering a death has no online login at all.
 */
export interface ServiceLoginRule {
  loginType: GovLoginType;
  /** Whether the service needs a *verified* One Login identity, not just a sign-in. */
  requiresIdentityVerification: boolean;
  /** The owning department, for display on the sign-in screen. */
  department: string;
}

/** Map a service id/type (e.g. "hmrc-iht400", "dwp-tell-us-once") to its login. */
export function loginRuleForService(
  serviceId: string | null | undefined,
): ServiceLoginRule {
  const id = (serviceId ?? "").toLowerCase();

  // HMRC — still on Government Gateway for existing customers in 2026
  if (
    id.startsWith("hmrc") ||
    id.includes("iht") ||
    id.includes("self-assessment") ||
    id.includes("paye") ||
    id.includes("vat") ||
    id.includes("child-benefit") ||
    id.includes("marriage-allowance")
  ) {
    return {
      loginType: "government-gateway",
      requiresIdentityVerification: false,
      department: "HMRC",
    };
  }

  // Companies House — One Login with a director/PSC identity check
  if (id.startsWith("companies-house") || id.includes("companies") || id.includes("director")) {
    return {
      loginType: "one-login",
      requiresIdentityVerification: true,
      department: "Companies House",
    };
  }

  // HM Courts & Tribunals (probate, appeals) — Government Gateway
  if (id.startsWith("hmcts") || id.includes("probate") || id.includes("tribunal")) {
    return {
      loginType: "government-gateway",
      requiresIdentityVerification: false,
      department: "HM Courts & Tribunals Service",
    };
  }

  // General Register Office — registering a death is in person, no online login
  if (id.startsWith("gro") || id.includes("register-death") || id.includes("death-certificate")) {
    return {
      loginType: "none-in-person",
      requiresIdentityVerification: false,
      department: "General Register Office",
    };
  }

  // DWP — pensions, bereavement support, Universal Credit — One Login
  if (
    id.startsWith("dwp") ||
    id.includes("pension") ||
    id.includes("bereavement") ||
    id.includes("universal-credit") ||
    id.includes("pip") ||
    id.includes("tell-us-once")
  ) {
    return {
      loginType: "one-login",
      requiresIdentityVerification: false,
      department: "DWP",
    };
  }

  // DVLA — Government Gateway
  if (id.startsWith("dvla") || id.includes("driving") || id.includes("vehicle")) {
    return {
      loginType: "government-gateway",
      requiresIdentityVerification: false,
      department: "DVLA",
    };
  }

  // Default — GOV.UK One Login, the intended future front door
  return {
    loginType: "one-login",
    requiresIdentityVerification: false,
    department: "GOV.UK",
  };
}
