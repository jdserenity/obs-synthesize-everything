/** Pure synthesis-tracking helpers (no Obsidian imports). */

export type SynthesisEntry = { synthesizedAt: string };

export type SynthesisData = { entries: Record<string, SynthesisEntry> };

export function emptyData(): SynthesisData {
  return { entries: {} };
}

/** Normalize / accept partial plugin data from disk. */
export function normalizeData(raw: unknown): SynthesisData {
  if (!raw || typeof raw !== "object") return emptyData();
  const entries = (raw as { entries?: unknown }).entries;
  if (!entries || typeof entries !== "object") return emptyData();
  const out: Record<string, SynthesisEntry> = {};
  for (const [path, val] of Object.entries(entries as Record<string, unknown>)) {
    if (!path || typeof path !== "string") continue;
    if (!val || typeof val !== "object") continue;
    const at = (val as { synthesizedAt?: unknown }).synthesizedAt;
    if (typeof at !== "string" || !at) continue;
    out[path] = { synthesizedAt: at };
  }
  return { entries: out };
}

export function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}

export function isSynthesized(data: SynthesisData, path: string): boolean {
  return Boolean(data.entries[path]?.synthesizedAt);
}

export function getSynthesizedAt(data: SynthesisData, path: string): string | null {
  return data.entries[path]?.synthesizedAt ?? null;
}

export function markSynthesized(
  data: SynthesisData,
  path: string,
  at: Date = new Date(),
): SynthesisData {
  return {
    entries: {
      ...data.entries,
      [path]: { synthesizedAt: at.toISOString() },
    },
  };
}

export function unmarkSynthesized(data: SynthesisData, path: string): SynthesisData {
  if (!(path in data.entries)) return data;
  const entries = { ...data.entries };
  delete entries[path];
  return { entries };
}

export function toggleSynthesized(
  data: SynthesisData,
  path: string,
  at: Date = new Date(),
): { data: SynthesisData; nowSynthesized: boolean } {
  if (isSynthesized(data, path)) {
    return { data: unmarkSynthesized(data, path), nowSynthesized: false };
  }
  return { data: markSynthesized(data, path, at), nowSynthesized: true };
}

export function renamePath(
  data: SynthesisData,
  oldPath: string,
  newPath: string,
): SynthesisData {
  if (oldPath === newPath) return data;
  const entry = data.entries[oldPath];
  if (!entry) return data;
  const entries = { ...data.entries };
  delete entries[oldPath];
  entries[newPath] = entry;
  return { entries };
}

export function deletePath(data: SynthesisData, path: string): SynthesisData {
  return unmarkSynthesized(data, path);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Short local date for status bar, e.g. "10 Jul 2026". */
export function formatShortDate(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  };
  // Prefer Intl when available; fall back to fixed UTC pieces for old runtimes.
  try {
    const parts = new Intl.DateTimeFormat("en-GB", opts).formatToParts(d);
    const day = parts.find((p) => p.type === "day")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const year = parts.find((p) => p.type === "year")?.value;
    if (day && month && year) return `${day} ${month} ${year}`;
  } catch {
    /* ignore */
  }
  const day = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function statusBarText(data: SynthesisData, path: string | null): string {
  if (!path || !isMarkdownPath(path)) return "";
  const at = getSynthesizedAt(data, path);
  if (!at) return "○ Not synthesized";
  return `✓ Synthesized · ${formatShortDate(at)}`;
}

export type StatusKind = "none" | "not-synthesized" | "synthesized";

export function statusKind(data: SynthesisData, path: string | null): StatusKind {
  if (!path || !isMarkdownPath(path)) return "none";
  return isSynthesized(data, path) ? "synthesized" : "not-synthesized";
}
