"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";

type Phase = "choose" | "signin" | "create" | "code" | "idv" | "success";
type Login = "one-login" | "government-gateway";

const ERROR_TEXT: Record<string, string> = {
  "wrong-code": "That code isn't right. Check your phone and try again.",
  "already-used": "That code has already been used. Start again.",
  "unknown-challenge": "This sign-in has expired. Start again.",
};

/**
 * Simulated sign-in, driven entirely by the service's declared auth:
 * - accepts more than one login → the "One Login / Government Gateway / create
 *   new" chooser (the HMRC confusion);
 * - needs a login the citizen doesn't hold → a "create a GOV.UK One Login"
 *   branch that flows into identity verification;
 * - otherwise → sign in with the held credential.
 */
export function LoginSheet() {
  const personaData = useAppStore((s) => s.personaData);
  const pendingAuth = useAppStore((s) => s.pendingAuth);
  const challenge = useAppStore((s) => s.oneLoginChallenge);
  const oneLoginVerified = useAppStore((s) => s.oneLoginVerified);
  const beginLogin = useAppStore((s) => s.beginLogin);
  const submitLoginCode = useAppStore((s) => s.submitLoginCode);
  const completeIdentityCheck = useAppStore((s) => s.completeIdentityCheck);

  const accepts = (
    (pendingAuth?.accepts?.length
      ? pendingAuth.accepts
      : [pendingAuth?.login ?? "one-login"]
    ).filter((l) => l && l !== "none-in-person")
  ) as Login[];
  const multi = accepts.length > 1;
  const requiresIdentity = pendingAuth?.identityVerification === true;

  const pc = personaData as unknown as {
    primaryContact?: { email?: string; firstName?: string };
    logins?: {
      oneLogin?: unknown;
      governmentGateway?: Array<{ userId: string }>;
    };
  };
  const hasOneLogin = !!pc?.logins?.oneLogin || oneLoginVerified;
  const hasGateway = (pc?.logins?.governmentGateway?.length ?? 0) > 0;
  const email =
    pc?.primaryContact?.email ??
    `${pc?.primaryContact?.firstName ?? "you"}@btinternet.com`;
  const gatewayId = pc?.logins?.governmentGateway?.[0]?.userId ?? "61 27 84 40 39 12";

  const [activeLogin, setActiveLogin] = useState<Login>(() =>
    multi ? "one-login" : (accepts[0] ?? "one-login"),
  );
  const [creating, setCreating] = useState(false);
  const [phase, setPhase] = useState<Phase>(() => {
    const s = useAppStore.getState();
    if (s.oneLoginVerified && s.pendingIdentityCheck) return "idv";
    if (multi) return "choose";
    const only = accepts[0] ?? "one-login";
    if (only === "one-login") return hasOneLogin ? "signin" : "create";
    return "signin";
  });
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [chooseError, setChooseError] = useState<string | null>(null);

  const isGateway = activeLogin === "government-gateway";
  const brandName = isGateway ? "Government Gateway" : "One Login";

  // Once fully done, resume the message the citizen was trying to send.
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

  const Brand = ({ label }: { label: string }) => (
    <div className="flex items-center gap-2">
      <span className="text-base font-bold text-govuk-black">GOV.UK</span>
      <span className="text-base text-govuk-dark-grey">{label}</span>
    </div>
  );

  const advanceAfterCode = () => {
    const idNeeded =
      activeLogin === "one-login" &&
      requiresIdentity &&
      !useAppStore.getState().identityVerified;
    setPhase(idNeeded ? "idv" : "success");
  };

  // ── Chooser (the HMRC three-option situation) ──
  if (phase === "choose") {
    const Option = ({
      title,
      sub,
      onClick,
    }: {
      title: string;
      sub: string;
      onClick: () => void;
    }) => (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left rounded-xl border border-govuk-mid-grey/60 bg-white px-4 py-3 hover:border-govuk-blue transition-colors"
      >
        <p className="text-sm font-semibold text-govuk-black">{title}</p>
        <p className="text-xs text-govuk-dark-grey mt-0.5">{sub}</p>
      </button>
    );
    return (
      <div className="px-1 pb-2 space-y-4">
        <Brand label="Sign in" />
        <p className="text-sm text-govuk-dark-grey">
          Sign in to continue to this government service.
        </p>
        <div className="space-y-2.5">
          <Option
            title="GOV.UK One Login"
            sub="Sign in with your email address"
            onClick={() => {
              setActiveLogin("one-login");
              setChooseError(null);
              setPhase(hasOneLogin ? "signin" : "create");
              if (!hasOneLogin) setCreating(true);
            }}
          />
          <Option
            title="Government Gateway"
            sub="Sign in with your 12-digit user ID"
            onClick={() => {
              setActiveLogin("government-gateway");
              if (hasGateway) {
                setChooseError(null);
                setPhase("signin");
              } else {
                setChooseError(
                  "We couldn't find a Government Gateway account for you.",
                );
              }
            }}
          />
          <Option
            title="Create new sign-in details"
            sub="Set up a GOV.UK One Login"
            onClick={() => {
              setActiveLogin("one-login");
              setChooseError(null);
              setCreating(true);
              setPhase("create");
            }}
          />
        </div>
        {chooseError && <p className="text-sm text-govuk-red">{chooseError}</p>}
        <p className="text-[11px] text-center text-govuk-mid-grey">
          Simulated GOV.UK sign-in for demonstration
        </p>
      </div>
    );
  }

  // ── Create a GOV.UK One Login ──
  if (phase === "create") {
    return (
      <div className="px-1 pb-2 space-y-5">
        <Brand label="One Login" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-govuk-black">
            Create a GOV.UK One Login
          </p>
          <p className="text-sm text-govuk-dark-grey">
            You don&rsquo;t have a GOV.UK One Login yet. You&rsquo;ll need to
            create one — and prove your identity — to use this service.
          </p>
        </div>
        <div className="rounded-xl border border-govuk-mid-grey/50 bg-govuk-light-grey/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-govuk-mid-grey">
            Email
          </p>
          <p className="text-sm font-medium text-govuk-black truncate">{email}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            beginLogin("one-login");
            setPhase("code");
          }}
          className="w-full bg-govuk-blue text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-govuk-blue/90 transition-colors"
        >
          Create your GOV.UK One Login
        </button>
        <p className="text-[11px] text-center text-govuk-mid-grey">
          Simulated One Login for demonstration
        </p>
      </div>
    );
  }

  // ── Sign in ──
  if (phase === "signin") {
    const username = isGateway ? gatewayId : email;
    const usernameLabel = isGateway ? "Government Gateway user ID" : "Email";
    return (
      <div className="px-1 pb-2 space-y-5">
        <Brand label={brandName} />
        <p className="text-sm text-govuk-dark-grey">
          Sign in to continue to this government service.
        </p>
        <div className="rounded-xl border border-govuk-mid-grey/50 bg-govuk-light-grey/40 p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-govuk-blue/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d70b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-govuk-mid-grey">{usernameLabel}</p>
              <p className="text-sm font-medium text-govuk-black truncate">{username}</p>
              <p className="text-xs text-govuk-dark-grey tracking-widest">••••••••••••</p>
            </div>
            <span className="text-[10px] font-medium text-govuk-dark-grey bg-white border border-govuk-mid-grey/50 rounded px-1.5 py-0.5">Passwords</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(false);
            beginLogin(activeLogin);
            setPhase("code");
          }}
          className="w-full bg-govuk-blue text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-govuk-blue/90 transition-colors"
        >
          Sign in
        </button>
        <p className="text-[11px] text-center text-govuk-mid-grey">Simulated {brandName} for demonstration</p>
      </div>
    );
  }

  // ── Enter the code ──
  if (phase === "code") {
    return (
      <div className="px-1 pb-2 space-y-5">
        <Brand label={brandName} />
        <div className="space-y-1">
          <p className="text-sm font-medium text-govuk-black">
            {creating
              ? "Confirm your email"
              : isGateway
                ? "Enter the access code"
                : "Enter the security code"}
          </p>
          <p className="text-sm text-govuk-dark-grey">
            We&rsquo;ve sent a 6-digit code to your phone {challenge?.phoneHint ?? ""}. Check the notification at the top of your screen.
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
          <p className="text-sm text-govuk-red">{ERROR_TEXT[challenge.error] ?? "Something went wrong."}</p>
        )}
        <button
          type="button"
          disabled={code.length !== 6}
          onClick={() => {
            if (submitLoginCode(code)) advanceAfterCode();
            else setCode("");
          }}
          className="w-full bg-govuk-blue text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-govuk-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  // ── Prove your identity (3c) ──
  if (phase === "idv") {
    if (verifying) {
      return (
        <div className="px-1 pb-8 pt-4">
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-govuk-blue/10 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-govuk-blue/20 animate-pulse" />
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1d70b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <circle cx="9" cy="10" r="1" fill="#1d70b8" />
                <circle cx="15" cy="10" r="1" fill="#1d70b8" />
                <path d="M9 15c1 1 2 1.5 3 1.5s2-.5 3-1.5" />
              </svg>
            </div>
            <p className="text-sm text-govuk-dark-grey">Checking your identity…</p>
          </div>
        </div>
      );
    }
    return (
      <div className="px-1 pb-2 space-y-5">
        <Brand label="One Login" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-govuk-black">Prove your identity</p>
          <p className="text-sm text-govuk-dark-grey">
            This service needs to confirm who you are. Use the GOV.UK One Login app to scan your photo ID and take a photo of yourself.
          </p>
        </div>
        <div className="rounded-xl border border-govuk-mid-grey/50 bg-govuk-light-grey/40 p-3 space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-govuk-black">
            <span className="w-6 h-6 rounded bg-govuk-blue/10 flex items-center justify-center text-govuk-blue text-[11px] font-bold">1</span>
            Scan your passport or driving licence
          </div>
          <div className="flex items-center gap-2.5 text-sm text-govuk-black">
            <span className="w-6 h-6 rounded bg-govuk-blue/10 flex items-center justify-center text-govuk-blue text-[11px] font-bold">2</span>
            Take a photo of your face to match it
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setVerifying(true);
            setTimeout(() => {
              completeIdentityCheck();
              setPhase("success");
            }, 1500);
          }}
          className="w-full bg-govuk-blue text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-govuk-blue/90 transition-colors"
        >
          Verify with the One Login app
        </button>
        <p className="text-[11px] text-center text-govuk-mid-grey">Simulated identity check for demonstration</p>
      </div>
    );
  }

  // ── Success ──
  return (
    <div className="px-1 pb-6 pt-2">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-govuk-green flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-base font-semibold text-govuk-black text-center">
          {creating ? "GOV.UK One Login created" : `Signed in to GOV.UK ${brandName}`}
        </p>
      </div>
    </div>
  );
}
