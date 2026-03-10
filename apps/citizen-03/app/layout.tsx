import type { Metadata, Viewport } from "next";
import { PhoneFrame } from "@/components/PhoneFrame";
import "./globals.css";

export const metadata: Metadata = {
  title: "Citizen-03 — Agentic Government Services",
  description:
    "A truly agentic citizen experience: the LLM reasons with tools, the platform validates.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d70b8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <PhoneFrame>{children}</PhoneFrame>
      </body>
    </html>
  );
}
