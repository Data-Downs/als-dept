import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppLayout } from "@/components/layout/AppLayout";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Publish Once — Agentic Legibility Stack",
  description:
    "Describe government services once, publish to every channel automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-publish-body`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
