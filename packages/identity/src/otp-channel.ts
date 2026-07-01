/**
 * OtpChannel — a simulated message channel (the persona's phone).
 *
 * GOV.UK One Login sends a one-time security code to a registered phone.
 * Here we "deliver" that code to an in-memory inbox keyed by persona, so the
 * citizen app can render it as a phone notification and the user can read it
 * back.
 *
 * The `read` method records WHO consumed the code — "human" today. When an
 * agent is later given access to the phone, the same call records "agent".
 * That single field is what makes the whole "I gave my agent my codes"
 * scenario visible rather than invisible.
 */

export interface OtpMessage {
  personaId: string;
  /** The destination phone number the code was sent to. */
  to: string;
  code: string;
  /** Human-readable notification text, as it would appear on a phone. */
  body: string;
  deliveredAt: string;
  consumed: boolean;
  consumedBy?: "human" | "agent";
}

export class OtpChannel {
  private latest = new Map<string, OtpMessage>();
  private log: OtpMessage[] = [];

  /** "Send" a code to a persona's phone. Returns the delivered message. */
  deliver(personaId: string, to: string, code: string): OtpMessage {
    const msg: OtpMessage = {
      personaId,
      to,
      code,
      body: `Your GOV.UK One Login security code is ${code}. It expires in 10 minutes. Do not share it with anyone.`,
      deliveredAt: new Date().toISOString(),
      consumed: false,
    };
    this.latest.set(personaId, msg);
    this.log.push(msg);
    return msg;
  }

  /**
   * Read the most recent code delivered to a persona's phone, marking it
   * consumed and recording who read it. This is the accessor an agent would
   * be pointed at once a citizen "shares their phone" with it.
   */
  read(personaId: string, by: "human" | "agent" = "human"): OtpMessage | null {
    const msg = this.latest.get(personaId);
    if (!msg) return null;
    msg.consumed = true;
    msg.consumedBy = by;
    return msg;
  }

  /** Look at the latest message without consuming it (for rendering the phone). */
  peekLatest(personaId: string): OtpMessage | null {
    return this.latest.get(personaId) ?? null;
  }

  /** Everything ever delivered, in order — useful for the legibility trace. */
  history(): OtpMessage[] {
    return [...this.log];
  }
}
