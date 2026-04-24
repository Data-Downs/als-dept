"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Wraps the app in an iPhone-style device frame on desktop viewports.
 * On mobile (<768px) the frame disappears and the app renders full-screen.
 *
 * Uses an iframe on desktop to provide true viewport containment —
 * position:fixed elements naturally pin to the iframe boundaries.
 */

const BG_OPTIONS = [
  { label: "blue", value: "#04084a" },
  { label: "grey", value: "#f8f8f8" },
  { label: "white", value: "#ffffff" },
] as const;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

function BackgroundToggle() {
  const [index, setIndex] = useState(0);

  const cycle = useCallback(() => {
    setIndex((prev) => {
      const next = (prev + 1) % BG_OPTIONS.length;
      document.querySelector<HTMLElement>(".phone-frame-wrapper")!.style.background = BG_OPTIONS[next].value;
      return next;
    });
  }, []);

  const isDark = index === 0;

  return (
    <button
      onClick={cycle}
      className="fixed bottom-4 right-4 z-50 w-8 h-8 rounded-full border shadow-sm flex items-center justify-center transition-colors"
      style={{
        background: BG_OPTIONS[(index + 1) % BG_OPTIONS.length].value,
        borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
      }}
      title={`Switch to ${BG_OPTIONS[(index + 1) % BG_OPTIONS.length].label} background`}
    />
  );
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();

  // On mobile or during SSR, render children directly
  if (!isDesktop) {
    return <>{children}</>;
  }

  // On desktop, wrap in phone frame with children rendered inside
  return (
    <div className="phone-frame-wrapper">
      <div className="phone-frame-device">
        <div className="phone-frame-island" />
        <div className="phone-frame-screen">{children}</div>
        <div className="phone-frame-home-indicator">
          <div className="phone-frame-home-bar" />
        </div>
      </div>
      <BackgroundToggle />
    </div>
  );
}
