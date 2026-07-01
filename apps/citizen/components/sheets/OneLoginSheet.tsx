"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";

type Phase = "signin" | "code" | "success";

const ERROR_TEXT: Record<string, string> = {
  "wrong-code": "That code isn't right. Check your phone and try again.",
  "already-used": "That code has already been used. Start again.",
  "unknown-challenge": "This sign-in has expired. Start again.",
};

/**
 * Simulated GOV.UK One Login sign-in, shown when a citizen enters a service.
 * Three phases:
 * 1. signin  — credential pre-filled from the wallet (password-app style)
 * 2. code    — enter the 6-digit code delivered to the phone notification
 * 3. success — signed in; the held service then resumes
 */
export function OneLoginSheet() {
  const personaData = useAppStore((s) => s.personaData);
  const challenge = useAppStore((s) => s.oneLoginChallenge);
  const beginOneLogin = useAppStore((s) => s.beginOneLogin);
  const submitOneLoginCode = useAppStore((s) => s.submitOneLoginCode);

  const [phase, setPhase] = useState<Phase>("signin");
  const [code, setCode] = useState("");

  const pc = (
    personaData as unknown as {
      primaryContact?: { email?: string; firstName?: string };
    }
  )?.primaryContact;
  const email = pc?.email ?? `${pc?.firstName ?? "you"}@btinternet.com`;

  // Once signed in, resume the service the citizen was trying to enter.
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

  // ── Sign-in phase ──
  if (phase === "signin") {
    return (
      <div className="px-1 pb-2 space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-govuk-black">GOV.UK</span>
          <span className="text-base text-govuk-dark-grey">One Login</span>
        </div>

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
              <p className="text-sm font-medium text-govuk-black truncate">
                {email}
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
            beginOneLogin();
            setPhase("code");
          }}
          className="w-full bg-govuk-blue text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-govuk-blue/90 transition-colors"
        >
          Sign in
        </button>

        <p className="text-[11px] text-center text-govuk-mid-grey">
          Simulated One Login for demonstration
        </p>
      </div>
    );
  }

  // ── Code phase ──
  if (phase === "code") {
    return (
      <div className="px-1 pb-2 space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-govuk-black">GOV.UK</span>
          <span className="text-base text-govuk-dark-grey">One Login</span>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-govuk-black">
            Enter the security code
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
            if (submitOneLoginCode(code)) setPhase("success");
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
        <p className="text-base font-semibold text-govuk-black">
          Signed in to GOV.UK One Login
        </p>
      </div>
    </div>
  );
}
