"use client";

import React from "react";

/**
 * UK vehicle registration pattern — matches plates like:
 *   AB12 CDE, AB12CDE, A123 BCD, A123BCD
 * Deliberately broad to catch common formats.
 */
const REG_PATTERN = /\b([A-Z]{1,2}\d{1,4}\s?[A-Z]{2,3})\b/gi;

/** Inline styled reg plate span */
function PlateSpan({ text }: { text: string }) {
  return <span className="font-plate uppercase tracking-wider">{text}</span>;
}

/**
 * Takes a string and returns a ReactNode with any UK registration
 * numbers wrapped in <PlateSpan> (Charles Wright font, uppercase).
 *
 * Safe to use inside <p>, <span>, <div> etc.
 */
export function formatWithPlates(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  REG_PATTERN.lastIndex = 0;

  while ((match = REG_PATTERN.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<PlateSpan key={match.index} text={match[1].toUpperCase()} />);
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // If no matches, return the original string (avoids unnecessary fragments)
  if (parts.length === 0) return text;

  return <>{parts}</>;
}
