"use client";

import { useEffect, useState } from "react";

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

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) return <>{children}</>;

  return (
    <div className="phone-frame-wrapper">
      <div className="phone-frame-device">
        <div className="phone-frame-island" />
        <div className="phone-frame-screen">
          {children}
        </div>
        <div className="phone-frame-home-indicator">
          <div className="phone-frame-home-bar" />
        </div>
      </div>
    </div>
  );
}
