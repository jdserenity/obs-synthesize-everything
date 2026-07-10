import { describe, expect, it } from "vitest";
import {
  deletePath,
  emptyData,
  formatShortDate,
  getSynthesizedAt,
  isMarkdownPath,
  isSynthesized,
  markSynthesized,
  normalizeData,
  renamePath,
  statusBarText,
  statusKind,
  toggleSynthesized,
  unmarkSynthesized,
} from "./store";

describe("isMarkdownPath", () => {
  it("accepts .md case-insensitively", () => {
    expect(isMarkdownPath("Notes/Foo.md")).toBe(true);
    expect(isMarkdownPath("Notes/Foo.MD")).toBe(true);
  });

  it("rejects non-markdown", () => {
    expect(isMarkdownPath("img.png")).toBe(false);
    expect(isMarkdownPath("folder")).toBe(false);
  });
});

describe("normalizeData", () => {
  it("returns empty for garbage", () => {
    expect(normalizeData(null)).toEqual(emptyData());
    expect(normalizeData({})).toEqual(emptyData());
    expect(normalizeData({ entries: "nope" })).toEqual(emptyData());
  });

  it("keeps valid entries only", () => {
    const raw = {
      entries: {
        "a.md": { synthesizedAt: "2026-01-01T00:00:00.000Z" },
        "bad.md": { synthesizedAt: 123 },
        "empty.md": {},
      },
    };
    expect(normalizeData(raw)).toEqual({
      entries: { "a.md": { synthesizedAt: "2026-01-01T00:00:00.000Z" } },
    });
  });
});

describe("mark / unmark / toggle", () => {
  const path = "Economics/Bonds.md";
  const at = new Date("2026-07-10T15:30:00.000Z");

  it("defaults to not synthesized", () => {
    const data = emptyData();
    expect(isSynthesized(data, path)).toBe(false);
    expect(getSynthesizedAt(data, path)).toBeNull();
  });

  it("marks with ISO timestamp", () => {
    const data = markSynthesized(emptyData(), path, at);
    expect(isSynthesized(data, path)).toBe(true);
    expect(getSynthesizedAt(data, path)).toBe("2026-07-10T15:30:00.000Z");
  });

  it("unmarks", () => {
    const marked = markSynthesized(emptyData(), path, at);
    const data = unmarkSynthesized(marked, path);
    expect(isSynthesized(data, path)).toBe(false);
    expect(data.entries[path]).toBeUndefined();
  });

  it("toggle marks then unmarks", () => {
    const t1 = toggleSynthesized(emptyData(), path, at);
    expect(t1.nowSynthesized).toBe(true);
    expect(isSynthesized(t1.data, path)).toBe(true);
    const t2 = toggleSynthesized(t1.data, path, at);
    expect(t2.nowSynthesized).toBe(false);
    expect(isSynthesized(t2.data, path)).toBe(false);
  });

  it("does not mutate the previous data object", () => {
    const before = emptyData();
    const after = markSynthesized(before, path, at);
    expect(before.entries[path]).toBeUndefined();
    expect(after.entries[path]).toBeDefined();
  });
});

describe("renamePath / deletePath", () => {
  const at = new Date("2026-07-10T00:00:00.000Z");

  it("moves the entry on rename", () => {
    let data = markSynthesized(emptyData(), "old.md", at);
    data = renamePath(data, "old.md", "new.md");
    expect(isSynthesized(data, "old.md")).toBe(false);
    expect(getSynthesizedAt(data, "new.md")).toBe("2026-07-10T00:00:00.000Z");
  });

  it("rename of unknown path is a no-op", () => {
    const data = emptyData();
    expect(renamePath(data, "a.md", "b.md")).toEqual(data);
  });

  it("delete drops the entry", () => {
    let data = markSynthesized(emptyData(), "gone.md", at);
    data = deletePath(data, "gone.md");
    expect(isSynthesized(data, "gone.md")).toBe(false);
  });
});

describe("formatShortDate", () => {
  it("formats ISO as day mon year in UTC when timeZone is UTC", () => {
    expect(formatShortDate("2026-07-10T15:30:00.000Z", "UTC")).toBe("10 Jul 2026");
  });
});

describe("statusBarText / statusKind", () => {
  const at = new Date("2026-07-10T15:30:00.000Z");

  it("empty for non-md or missing path", () => {
    expect(statusBarText(emptyData(), null)).toBe("");
    expect(statusBarText(emptyData(), "pic.png")).toBe("");
    expect(statusKind(emptyData(), null)).toBe("none");
  });

  it("not synthesized label", () => {
    expect(statusBarText(emptyData(), "a.md")).toBe("○ Not synthesized");
    expect(statusKind(emptyData(), "a.md")).toBe("not-synthesized");
  });

  it("synthesized label includes short date", () => {
    const data = markSynthesized(emptyData(), "a.md", at);
    const text = statusBarText(data, "a.md");
    expect(text.startsWith("✓ Synthesized · ")).toBe(true);
    expect(text).toContain("2026");
    expect(statusKind(data, "a.md")).toBe("synthesized");
  });
});
