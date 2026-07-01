import { describe, it, expect, beforeEach } from "vitest";
import { OneLoginSimulator } from "./one-login-simulator";
import { WalletSimulator } from "./wallet-simulator";
import type { TestUser, WalletCredential } from "./credential-types";

const testUser: TestUser = {
  id: "user-1",
  name: "Test User",
  date_of_birth: "1990-01-15",
  age: 35,
  national_insurance_number: "QQ123456C",
  address: { line_1: "10 Downing St", city: "London", postcode: "SW1A 2AA" },
  jurisdiction: "England",
  credentials: [
    {
      type: "driving-licence",
      issuer: "DVLA",
      number: "TEST12345",
      issued: "2020-01-01",
      expires: "2030-01-01",
      status: "valid",
    },
    {
      type: "national-insurance",
      issuer: "HMRC",
      number: "QQ123456C",
      status: "valid",
    },
    {
      type: "expired-card",
      issuer: "Test",
      expires: "2020-01-01",
      status: "expired",
    },
  ],
  employment_status: "employed",
  employer: "NHS",
  income: 30000,
  savings: 5000,
  bank_account: true,
};

describe("OneLoginSimulator", () => {
  let sim: OneLoginSimulator;

  beforeEach(() => {
    sim = new OneLoginSimulator();
    sim.loadTestUsers([testUser]);
  });

  it("returns available users after loading", () => {
    const users = sim.getAvailableUsers();
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe("user-1");
    expect(users[0].name).toBe("Test User");
  });

  it("starts auth flow and returns session token + user", () => {
    const result = sim.startAuthFlow("user-1");
    expect(result).not.toBeNull();
    expect(result!.sessionToken).toBeTruthy();
    expect(result!.user.id).toBe("user-1");
  });

  it("returns null for unknown user auth flow", () => {
    const result = sim.startAuthFlow("unknown");
    expect(result).toBeNull();
  });

  it("completes auth and returns IdentityContext", () => {
    const { sessionToken } = sim.startAuthFlow("user-1")!;
    const ctx = sim.completeAuth(sessionToken);
    expect(ctx).not.toBeNull();
    expect(ctx!.authenticated).toBe(true);
    expect(ctx!.userId).toBe("user-1");
    expect(ctx!.name).toBe("Test User");
    expect(ctx!.verificationLevel).toBe("high");
    expect(ctx!.authMethod).toBe("simulated");
    expect(ctx!.claims.full_name).toBe("Test User");
    expect(ctx!.claims.date_of_birth).toBe("1990-01-15");
    expect(ctx!.claims.national_insurance_number).toBe("QQ123456C");
  });

  it("completeAuth returns null for invalid token", () => {
    expect(sim.completeAuth("invalid-token")).toBeNull();
  });

  it("getUserInfo returns user for valid session", () => {
    const { sessionToken } = sim.startAuthFlow("user-1")!;
    const user = sim.getUserInfo(sessionToken);
    expect(user).not.toBeNull();
    expect(user!.name).toBe("Test User");
  });

  it("isAuthenticated returns correct state", () => {
    const { sessionToken } = sim.startAuthFlow("user-1")!;
    expect(sim.isAuthenticated(sessionToken)).toBe(true);
    expect(sim.isAuthenticated("fake")).toBe(false);
  });

  it("logout invalidates session", () => {
    const { sessionToken } = sim.startAuthFlow("user-1")!;
    expect(sim.isAuthenticated(sessionToken)).toBe(true);
    sim.logout(sessionToken);
    expect(sim.isAuthenticated(sessionToken)).toBe(false);
    expect(sim.completeAuth(sessionToken)).toBeNull();
  });
});

describe("WalletSimulator", () => {
  let wallet: WalletSimulator;

  beforeEach(() => {
    wallet = new WalletSimulator();
    wallet.loadFromTestUser(testUser);
  });

  it("loads credentials from test user", () => {
    const creds = wallet.getCredentials("user-1");
    expect(creds).toHaveLength(3);
  });

  it("returns empty array for unknown user", () => {
    expect(wallet.getCredentials("unknown")).toEqual([]);
  });

  it("requestPresentation finds available credential", () => {
    const result = wallet.requestPresentation("user-1", "driving-licence");
    expect(result.available).toBe(true);
    expect(result.credential?.type).toBe("driving-licence");
    expect(result.credential?.issuer).toBe("DVLA");
  });

  it("requestPresentation returns unavailable for missing type", () => {
    const result = wallet.requestPresentation("user-1", "passport");
    expect(result.available).toBe(false);
    expect(result.credential).toBeUndefined();
  });

  it("presentCredential returns structured presentation", () => {
    const pres = wallet.presentCredential("user-1", "driving-licence");
    expect(pres).not.toBeNull();
    expect(pres!.credentialType).toBe("driving-licence");
    expect(pres!.issuer).toBe("DVLA");
    expect(pres!.verificationLevel).toBe("high");
    expect(pres!.claims.number).toBe("TEST12345");
    expect(pres!.presentedAt).toBeTruthy();
  });

  it("presentCredential returns low verification for non-valid status", () => {
    const pres = wallet.presentCredential("user-1", "expired-card");
    expect(pres).not.toBeNull();
    expect(pres!.verificationLevel).toBe("low");
  });

  it("presentCredential returns null for missing credential", () => {
    expect(wallet.presentCredential("user-1", "passport")).toBeNull();
  });

  it("checkStatus reports valid credential correctly", () => {
    const status = wallet.checkStatus("user-1", "driving-licence");
    expect(status.exists).toBe(true);
    expect(status.status).toBe("valid");
    expect(status.expired).toBe(false);
  });

  it("checkStatus reports expired credential", () => {
    const status = wallet.checkStatus("user-1", "expired-card");
    expect(status.exists).toBe(true);
    expect(status.status).toBe("expired");
    expect(status.expired).toBe(true);
  });

  it("checkStatus reports non-existent credential", () => {
    const status = wallet.checkStatus("user-1", "passport");
    expect(status.exists).toBe(false);
  });

  it("loadCredentials overwrites previous credentials", () => {
    const newCreds: WalletCredential[] = [
      { type: "passport", issuer: "HMPO", status: "valid" },
    ];
    wallet.loadCredentials("user-1", newCreds);
    expect(wallet.getCredentials("user-1")).toHaveLength(1);
    expect(wallet.getCredentials("user-1")[0].type).toBe("passport");
  });
});

describe("OneLoginSimulator — two-factor sign-in", () => {
  let sim: OneLoginSimulator;

  beforeEach(() => {
    sim = new OneLoginSimulator();
    sim.loadTestUsers([testUser]);
  });

  it("issues a challenge and delivers a 6-digit code to the phone", () => {
    const challenge = sim.issueChallenge("user-1");
    expect(challenge).not.toBeNull();
    expect(challenge!.challengeId).toBeTruthy();
    expect(challenge!.phoneHint).toMatch(/•+ \d{3}$/);

    const msg = sim.otp.peekLatest("user-1");
    expect(msg).not.toBeNull();
    expect(msg!.code).toMatch(/^\d{6}$/);
    expect(msg!.consumed).toBe(false);
  });

  it("returns null when issuing a challenge for an unknown user", () => {
    expect(sim.issueChallenge("unknown")).toBeNull();
  });

  it("verifies the correct code and creates a one-login session", () => {
    const { challengeId } = sim.issueChallenge("user-1")!;
    const code = sim.otp.peekLatest("user-1")!.code;

    const result = sim.verifyOtp(challengeId, code);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");

    expect(result.sessionToken).toBeTruthy();
    expect(result.context.authMethod).toBe("one-login");
    expect(result.context.verificationLevel).toBe("high");
    expect(result.context.claims.national_insurance_number).toBe("QQ123456C");
    expect(sim.isAuthenticated(result.sessionToken)).toBe(true);
  });

  it("marks the code consumed by a human by default", () => {
    const { challengeId } = sim.issueChallenge("user-1")!;
    const code = sim.otp.peekLatest("user-1")!.code;
    sim.verifyOtp(challengeId, code);

    const msg = sim.otp.peekLatest("user-1")!;
    expect(msg.consumed).toBe(true);
    expect(msg.consumedBy).toBe("human");
  });

  it("records when an agent — not a human — reads the code", () => {
    const { challengeId } = sim.issueChallenge("user-1")!;
    const code = sim.otp.peekLatest("user-1")!.code;
    sim.verifyOtp(challengeId, code, "agent");

    expect(sim.otp.peekLatest("user-1")!.consumedBy).toBe("agent");
  });

  it("rejects a wrong code", () => {
    const { challengeId } = sim.issueChallenge("user-1")!;
    const code = sim.otp.peekLatest("user-1")!.code;
    const wrong = code === "000000" ? "111111" : "000000";

    const result = sim.verifyOtp(challengeId, wrong);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("wrong-code");
  });

  it("rejects an unknown challenge", () => {
    const result = sim.verifyOtp("chal_nope", "1234");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("unknown-challenge");
  });

  it("rejects reuse of an already-verified challenge", () => {
    const { challengeId } = sim.issueChallenge("user-1")!;
    const code = sim.otp.peekLatest("user-1")!.code;
    expect(sim.verifyOtp(challengeId, code).ok).toBe(true);

    const second = sim.verifyOtp(challengeId, code);
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error("expected failure");
    expect(second.reason).toBe("already-used");
  });

  it("falls back to a fictitious number when the persona has no phone", () => {
    sim.issueChallenge("user-1");
    expect(sim.otp.peekLatest("user-1")!.to).toBe("07700 900000");
  });
});
