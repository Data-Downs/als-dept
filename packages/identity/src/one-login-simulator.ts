/**
 * OneLoginSimulator — Simulates GOV.UK One Login authentication
 *
 * In production, this would be a real OIDC client talking to
 * the GOV.UK One Login service. Here we simulate the flow
 * with test users.
 */

import type { TestUser, IdentityContext } from "./credential-types";
import { OtpChannel } from "./otp-channel";

function generateToken(): string {
  return `sim_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** A 6-digit security code, as GOV.UK One Login sends to a phone. */
function generateOtp(): string {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

/** Pull a phone number off a persona, wherever it lives, with a safe fallback. */
function getPhone(user: TestUser): string {
  const pc = user.primaryContact as
    | { phone?: string; mobile?: string }
    | undefined;
  return (
    pc?.phone ??
    pc?.mobile ??
    (user.phone as string | undefined) ??
    (user.mobile as string | undefined) ??
    "07700 900000" // Ofcom range reserved for fictitious use
  );
}

/** Mask a phone for display: "07700 900000" → "•••••• 000". */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last3 = digits.slice(-3);
  return `•••••• ${last3}`;
}

/** A pending two-factor challenge, awaiting the code from the user's phone. */
export interface AuthChallenge {
  challengeId: string;
  userId: string;
  code: string;
  phone: string;
  createdAt: string;
  verified: boolean;
}

export class OneLoginSimulator {
  private testUsers: TestUser[] = [];
  private sessions = new Map<string, IdentityContext>();
  private challenges = new Map<string, AuthChallenge>();

  /** The persona's phone — where security codes are delivered. */
  readonly otp: OtpChannel;

  constructor(otp?: OtpChannel) {
    this.otp = otp ?? new OtpChannel();
  }

  /** Load test users (call this with data from test-users.json) */
  loadTestUsers(users: TestUser[]): void {
    this.testUsers = users;
  }

  /** Get available test users for the picker */
  getAvailableUsers(): Array<{ id: string; name: string }> {
    return this.testUsers.map((u) => ({ id: u.id, name: u.name }));
  }

  /** Start an auth flow — returns a session token (simulated OIDC) */
  startAuthFlow(
    userId: string,
  ): { sessionToken: string; user: TestUser } | null {
    const user = this.testUsers.find((u) => u.id === userId);
    if (!user) return null;

    const sessionToken = generateToken();
    const context: IdentityContext = {
      authenticated: true,
      userId: user.id,
      name: user.name,
      verificationLevel: "high",
      authMethod: "simulated",
      sessionToken,
      claims: {
        full_name: user.name,
        date_of_birth: user.date_of_birth,
        national_insurance_number: user.national_insurance_number,
        address: user.address,
      },
    };

    this.sessions.set(sessionToken, context);
    return { sessionToken, user };
  }

  /** Complete the auth flow — validate a session token */
  completeAuth(sessionToken: string): IdentityContext | null {
    return this.sessions.get(sessionToken) || null;
  }

  /**
   * Two-factor sign-in, step 1: issue a security code.
   *
   * Generates a 4-digit code, "sends" it to the user's phone via the
   * OtpChannel, and returns a pending challenge plus a masked phone hint to
   * show on screen. The user is NOT authenticated yet — that needs the code.
   */
  issueChallenge(
    userId: string,
  ): { challengeId: string; phoneHint: string } | null {
    const user = this.testUsers.find((u) => u.id === userId);
    if (!user) return null;

    const phone = getPhone(user);
    const code = generateOtp();
    const challengeId = `chal_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    this.challenges.set(challengeId, {
      challengeId,
      userId,
      code,
      phone,
      createdAt: new Date().toISOString(),
      verified: false,
    });
    this.otp.deliver(userId, phone, code);

    return { challengeId, phoneHint: maskPhone(phone) };
  }

  /**
   * Two-factor sign-in, step 2: verify the security code.
   *
   * On the right code, promotes the challenge to a full One Login session
   * (authMethod "one-login", not the one-hop "simulated"). `by` records who
   * supplied the code — "human" today; "agent" is the scenario this whole
   * simulation exists to make visible.
   */
  verifyOtp(
    challengeId: string,
    code: string,
    by: "human" | "agent" = "human",
  ):
    | { ok: true; sessionToken: string; context: IdentityContext }
    | { ok: false; reason: "unknown-challenge" | "already-used" | "wrong-code" } {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return { ok: false, reason: "unknown-challenge" };
    if (challenge.verified) return { ok: false, reason: "already-used" };
    if (code.trim() !== challenge.code) return { ok: false, reason: "wrong-code" };

    challenge.verified = true;
    this.otp.read(challenge.userId, by); // mark the code consumed, and by whom

    const user = this.testUsers.find((u) => u.id === challenge.userId)!;
    const sessionToken = generateToken();
    const context: IdentityContext = {
      authenticated: true,
      userId: user.id,
      name: user.name,
      verificationLevel: "high",
      authMethod: "one-login",
      sessionToken,
      claims: {
        full_name: user.name,
        date_of_birth: user.date_of_birth,
        national_insurance_number: user.national_insurance_number,
        address: user.address,
      },
    };
    this.sessions.set(sessionToken, context);
    return { ok: true, sessionToken, context };
  }

  /** Get user info from a session */
  getUserInfo(sessionToken: string): TestUser | null {
    const context = this.sessions.get(sessionToken);
    if (!context) return null;
    return this.testUsers.find((u) => u.id === context.userId) || null;
  }

  /** End a session */
  logout(sessionToken: string): void {
    this.sessions.delete(sessionToken);
  }

  /** Check if a session is valid */
  isAuthenticated(sessionToken: string): boolean {
    return this.sessions.has(sessionToken);
  }
}
