"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

const AGENT_CONTENT = {
  dot: {
    title: "Dot is here to help you",
    features: [
      "Checks with you before every step",
      "Explains why information is needed",
      "You approve every action",
    ],
    description:
      "Dot is cautious and transparent. It will guide you step by step through government services, always asking your permission before acting on your behalf. Nothing happens without your say-so.",
    bg: "bg-govuk-blue",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
    divider: "bg-white/20",
    bulletBg: "bg-white/20",
    bulletText: "text-white",
    btnBg: "bg-white",
    btnText: "text-govuk-blue",
    linkText: "text-white/70 hover:text-white",
    circleBg: "bg-white/20",
    circleText: "text-white",
    letter: "D",
  },
  max: {
    title: "Max is here to help you",
    features: [
      "Acts on your behalf automatically",
      "Auto-fills forms from your records",
      "Gets things done quickly",
    ],
    description:
      "Max is proactive and fast. It will use your data to auto-fill forms, start applications, and handle tasks in the background. Always double-check what Max has done on your behalf.",
    bg: "bg-amber-400",
    textPrimary: "text-gray-900",
    textSecondary: "text-gray-700",
    divider: "bg-gray-900/15",
    bulletBg: "bg-gray-900/10",
    bulletText: "text-gray-900",
    btnBg: "bg-gray-900",
    btnText: "text-white",
    linkText: "text-gray-700 hover:text-gray-900",
    circleBg: "bg-gray-900/15",
    circleText: "text-gray-900",
    letter: "M",
  },
} as const;

export function AgentIntroScreen() {
  const agent = useAppStore((s) => s.agent);
  const dismissAgentIntro = useAppStore((s) => s.dismissAgentIntro);
  const [visible, setVisible] = useState(false);

  const content = AGENT_CONTENT[agent];

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = (accepted: boolean) => {
    setVisible(false);
    setTimeout(() => dismissAgentIntro(accepted), 250);
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${content.bg} flex flex-col items-center justify-center px-8 transition-all duration-250 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      {/* Agent circle */}
      <div
        className={`w-20 h-20 rounded-full ${content.circleBg} flex items-center justify-center mb-6`}
      >
        <span className={`text-3xl font-bold ${content.circleText}`}>
          {content.letter}
        </span>
      </div>

      {/* Title */}
      <h1
        className={`text-2xl font-bold ${content.textPrimary} text-center mb-6`}
      >
        {content.title}
      </h1>

      {/* Divider */}
      <div className={`w-16 h-0.5 ${content.divider} rounded-full mb-6`} />

      {/* Features */}
      <div className="w-full max-w-sm mb-6">
        <p
          className={`text-sm font-semibold ${content.textSecondary} mb-3 uppercase tracking-wide`}
        >
          What to expect
        </p>
        <ul className="space-y-2.5">
          {content.features.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full ${content.bulletBg} flex items-center justify-center shrink-0`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className={content.bulletText}
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <span className={`text-sm ${content.textPrimary}`}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Description */}
      <div className="w-full max-w-sm mb-10">
        <p
          className={`text-sm font-semibold ${content.textSecondary} mb-2 uppercase tracking-wide`}
        >
          How {agent === "dot" ? "Dot" : "Max"} works
        </p>
        <p className={`text-sm leading-relaxed ${content.textSecondary}`}>
          {content.description}
        </p>
      </div>

      {/* Buttons */}
      <div className="w-full max-w-sm flex flex-col items-center gap-3">
        <button
          onClick={() => handleDismiss(true)}
          className={`w-full py-3.5 rounded-full ${content.btnBg} ${content.btnText} font-bold text-sm transition-transform active:scale-[0.98]`}
        >
          Continue
        </button>
        <button
          onClick={() => handleDismiss(false)}
          className={`text-sm font-medium ${content.linkText} transition-colors py-2`}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
