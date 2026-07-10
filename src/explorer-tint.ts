/** Pure helpers for deciding which explorer paths get the unsynthesized tint. */

import { isMarkdownPath, isSynthesized, SynthesisData } from "./store";

/** True when this vault path should show the yellow “not synthesized” style. */
export function shouldTintPath(data: SynthesisData, path: string): boolean {
  return isMarkdownPath(path) && !isSynthesized(data, path);
}

/**
 * Apply or remove the tint class on a file-explorer row.
 * Prefer the outer `.nav-file` / fileItem.el when present; also toggle the title node.
 */
export function applyTintClass(
  className: string,
  shouldTint: boolean,
  ...els: Array<Element | null | undefined>
): void {
  for (const el of els) {
    if (!el) continue;
    el.classList.toggle(className, shouldTint);
  }
}
