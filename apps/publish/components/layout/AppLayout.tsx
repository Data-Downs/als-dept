"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className="p-8 transition-[margin-left] duration-200"
        style={{ marginLeft: sidebarCollapsed ? 56 : "var(--sidebar-width)" }}
      >
        {children}
      </main>
    </>
  );
}
