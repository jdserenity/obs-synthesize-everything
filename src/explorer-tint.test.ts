import { describe, expect, it } from "vitest";
import { applyTintClass, shouldTintPath } from "./explorer-tint";
import { emptyData, markSynthesized } from "./store";

function fakeEl(): Element {
  const classes = new Set<string>();
  return {
    classList: {
      toggle(name: string, force?: boolean) {
        if (force) classes.add(name);
        else if (force === false) classes.delete(name);
        else if (classes.has(name)) classes.delete(name);
        else classes.add(name);
      },
      contains(name: string) {
        return classes.has(name);
      },
    },
  } as unknown as Element;
}

describe("shouldTintPath", () => {
  const at = new Date("2026-07-10T00:00:00.000Z");

  it("tints unsynthesized markdown", () => {
    expect(shouldTintPath(emptyData(), "AI Future/Notes.md")).toBe(true);
  });

  it("does not tint synthesized markdown", () => {
    const data = markSynthesized(emptyData(), "AI Future/Notes.md", at);
    expect(shouldTintPath(data, "AI Future/Notes.md")).toBe(false);
  });

  it("does not tint non-markdown", () => {
    expect(shouldTintPath(emptyData(), "img.png")).toBe(false);
  });
});

describe("applyTintClass", () => {
  it("toggles class on provided elements", () => {
    const a = fakeEl();
    const b = fakeEl();
    applyTintClass("se-not-synthesized", true, a, b, null);
    expect(a.classList.contains("se-not-synthesized")).toBe(true);
    expect(b.classList.contains("se-not-synthesized")).toBe(true);
    applyTintClass("se-not-synthesized", false, a, b);
    expect(a.classList.contains("se-not-synthesized")).toBe(false);
  });
});
