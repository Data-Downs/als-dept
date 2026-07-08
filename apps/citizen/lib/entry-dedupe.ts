/**
 * The agent's `remember` tool tends to record the same real-world thing more
 * than once in slightly different words ("Self-employed", "Self-employed
 * hairdresser and beauty therapist", "Self-employed — hairdressing & beauty").
 * This collapses those within a single list so the "what your agents know"
 * frame stays clear — one entry per thing, keeping the richest wording.
 *
 * Conservative by design: it only merges when one entry's significant words are
 * wholly contained in another's (after stemming and dropping filler words), so
 * genuinely different entitlements are never fused.
 */

const STOP = new Set([
  "and", "or", "the", "a", "an", "of", "for", "to", "with", "in", "on",
  "your", "you", "they", "their", "its", "it", "is", "are", "be", "as",
  "etc", "that", "this", "at", "by", "from", "not", "yet",
]);

/** A few irregular plurals the suffix rules below can't reach. */
const IRREGULAR: Record<string, string> = {
  children: "child",
  people: "person",
  women: "woman",
  men: "man",
  bereavement: "bereav",
  bereaved: "bereav",
};

/** Crude suffix stemming so "hairdressing" and "hairdresser" match. */
function stem(t: string): string {
  if (IRREGULAR[t]) return IRREGULAR[t];
  for (const suf of ["ing", "ers", "er", "ed", "s"]) {
    if (t.length > suf.length + 2 && t.endsWith(suf)) return t.slice(0, -suf.length);
  }
  return t;
}

function tokens(label: string): Set<string> {
  return new Set(
    label
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !STOP.has(w))
      .map(stem),
  );
}

function subset(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function dedupeEntries<T extends { key: string; label: string }>(
  entries: T[],
): T[] {
  const kept: Array<{ toks: Set<string>; entry: T }> = [];
  for (const e of entries) {
    const toks = tokens(e.label);
    let merged = false;
    for (const k of kept) {
      if (subset(toks, k.toks) || subset(k.toks, toks)) {
        // Keep the richer (more specific) wording; keep the earliest key.
        if (toks.size > k.toks.size) {
          k.entry.label = e.label;
          k.toks = toks;
        }
        merged = true;
        break;
      }
    }
    if (!merged) kept.push({ toks, entry: { ...e } });
  }
  return kept.map((k) => k.entry);
}
