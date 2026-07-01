"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";

type Phase = "signin" | "code" | "success";
type LoginType = "one-login" | "government-gateway";

const ERROR_TEXT: Record<string, string> = {
  "wrong-code": "That code isn't right. Check your phone and try again.",
  "already-used": "That code has already been used. Start again.",
  "unknown-challenge": "This sign-in has expired. Start again.",
};

/**
 * Simulated sign-in, shown when a citizen enters a government service. The
 * SAME component renders either GOV.UK One Login (email) or Government Gateway
 * (12-digit user ID) depending on which login the service demands — that
 * near-identical-but-different pairing is exactly what confuses real citizens.
 */
export function LoginSheet({ loginType }: { loginType: LoginType }) {
  const personaData = useAppStore((s) => s.personaData);
  const challenge = useAppStore((s) => s.oneLoginChallenge);
  const beginLogin = useAppStore((s) => s.beginLogin);
  const submitLoginCode = useAppStore((s) => s.submitLoginCode);

  const [phase, setPhase] = useState<Phase>("signin");
  const [code, setCode] = useState("");

  const isGateway = loginType === "government-gateway";
  const brandName = isGateway ? "Government Gateway" : "One Login";

  const pc = (
    personaData as unknown as {
      primaryContact?: { email?: string; firstName?: string };
      logins?: { governmentGateway?: Array<{ userId: string }> };
    }
  );
  const email = pc?.primaryContact?.email ?? `${pc?.primaryContact?.firstName ?? "you"}@btinternet.com`;
  const gatewayId = pc?.logins?.governmentGateway?.[0]?.userId ?? "61 27 84 40 39 12";
  const username = isGateway ? gatewayId : email;
  const usernameLabel = isGateway ? "Government Gateway user ID" : "Email";

  // Once signed in, resume the message the citizen was trying to send.
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => {
      const store = useAppStore.getState();
      const pending = store.pendingMessage;
      store.closeBottomSheet();
      if (pending) {
        useAppStore.setState({ pendingMessage: null });
        store.sendMessage(pending);
      }
    }, 1100);
    return () => clearTimeout(t);
  }, [phase]);

  const Brand = () => (
    <div className="flex items-center gap-2">
      <span className="text-base font-bold text-govuk-black">GOV.UK</span>
      <span className="text-base text-govuk-dark-grey">{brandName}</span>
    </div>
  );

  // ── Sign-in phase ──
  if (phase === "signin") {
    return (
      <div className="px-1 pb-2 space-y-5">
        <Brand />

        <p className="text-sm text-govuk-dark-grey">
          Sign in to continue to this government service.
        </p>

        {/* Password-app style prefilled credential */}
        <div className="rounded-xl border border-govuk-mid-grey/50 bg-govuk-light-grey/40 p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-govuk-blue/10 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1d70b8"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-govuk-mid-grey">
                {usernameLabel}
              </p>
              <p className="text-sm font-medium text-govuk-black truncate">
                {username}
              </p>
              <p className="text-xs text-govuk-dark-grey tracking-widest">
                ••••••••••••
              </p>
            </div>
            <span className="text-[10px] font-medium text-govuk-dark-grey bg-white border border-govuk-mid-grey/50 rounded px-1.5 py-0.5">
              Passwords
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            beginLogin(loginType);
            setPhase("code");
          }}
          className="w-full bg-govuk-blue text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-govuk-blue/90 transition-colors"
        >
          Sign in
        </button>

        <p className="text-[11px] text-center text-govuk-mid-grey">
          Simulated {brandName} for demonstration
        </p>
      </div>
    );
  }

  // ── Code phase ──
  if (phase === "code") {
    return (
      <div className="px-1 pb-2 space-y-5">
        <Brand />

        <div className="space-y-1">
          <p className="text-sm font-medium text-govuk-black">
            {isGateway ? "Enter the access code" : "Enter the security code"}
          </p>
          <p className="text-sm text-govuk-dark-grey">
            We&rsquo;ve sent a 6-digit code to your phone{" "}
            {challenge?.phoneHint ?? ""}. Check the notification at the top of
            your screen.
          </p>
        </div>

        <input
          type="text"
          inputMode="numeric"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="——————"
          className="w-full text-center text-2xl tracking-[0.5em] font-semibold py-3 border-2 border-govuk-mid-grey rounded-lg focus:border-govuk-blue focus:outline-none"
        />

        {challenge?.error && (
          <p className="text-sm text-govuk-red">
            {ERROR_TEXT[challenge.error] ?? "Something went wrong."}
          </p>
        )}

        <button
          type="button"
          disabled={code.length !== 6}
          onClick={() => {
            if (submitLoginCode(code)) setPhase("success");
            else setCode("");
          }}
          className="w-full bg-govuk-blue text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-govuk-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  // ── Success phase ──
  return (
    <div className="px-1 pb-6 pt-2">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-govuk-green flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-base font-semibold text-govuk-black text-center">
          Signed in to GOV.UK {brandName}
        </p>
      </div>
    </div>
  );
}
