import { MarkdownView, Plugin, TAbstractFile, TFile } from "obsidian";
import { applyTintClass, shouldTintPath } from "./explorer-tint";
import {
  deletePath,
  emptyData,
  isMarkdownPath,
  markSynthesized,
  normalizeData,
  renamePath,
  statusBarText,
  statusKind,
  SynthesisData,
  toggleSynthesized,
  unmarkSynthesized,
} from "./store";

const EXPLORER_CLASS = "se-not-synthesized";
const STATUS_CLASS = "synthesize-everything-status";

type FileItemLike = { el?: HTMLElement; selfEl?: HTMLElement };
type FileExplorerViewLike = { fileItems?: Record<string, FileItemLike> };

export default class SynthesizeEverythingPlugin extends Plugin {
  data: SynthesisData = emptyData();
  private statusEl: HTMLElement | null = null;
  private explorerTimer: number | null = null;
  private explorerObserver: MutationObserver | null = null;

  async onload(): Promise<void> {
    this.data = normalizeData(await this.loadData());

    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass(STATUS_CLASS);
    this.statusEl.setAttribute("aria-label", "Toggle synthesized for this note");
    this.statusEl.addEventListener("click", () => {
      void this.toggleActive();
    });

    this.addCommand({
      id: "toggle-synthesized",
      name: "Toggle synthesized for current note",
      checkCallback: (checking) => {
        const file = this.activeMarkdownFile();
        if (!file) return false;
        if (!checking) void this.togglePath(file.path);
        return true;
      },
    });

    this.addCommand({
      id: "mark-synthesized",
      name: "Mark current note as synthesized",
      checkCallback: (checking) => {
        const file = this.activeMarkdownFile();
        if (!file) return false;
        if (!checking) void this.markPath(file.path, true);
        return true;
      },
    });

    this.addCommand({
      id: "mark-not-synthesized",
      name: "Mark current note as not synthesized",
      checkCallback: (checking) => {
        const file = this.activeMarkdownFile();
        if (!file) return false;
        if (!checking) void this.markPath(file.path, false);
        return true;
      },
    });

    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshStatus()));
    this.registerEvent(this.app.workspace.on("file-open", () => this.refreshStatus()));
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.scheduleExplorerRefresh();
        this.attachExplorerObserver();
      }),
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        const newPath = file.path;
        if (!isMarkdownPath(oldPath) && !isMarkdownPath(newPath)) return;
        this.data = renamePath(this.data, oldPath, newPath);
        void this.persist();
        this.refreshStatus();
        this.scheduleExplorerRefresh();
      }),
    );

    this.registerEvent(
      this.app.vault.on("delete", (file: TAbstractFile) => {
        if (!isMarkdownPath(file.path)) return;
        this.data = deletePath(this.data, file.path);
        void this.persist();
        this.refreshStatus();
        this.scheduleExplorerRefresh();
      }),
    );

    this.registerEvent(
      this.app.vault.on("create", () => this.scheduleExplorerRefresh()),
    );

    this.app.workspace.onLayoutReady(() => {
      this.refreshStatus();
      this.scheduleExplorerRefresh();
      this.attachExplorerObserver();
    });
  }

  onunload(): void {
    if (this.explorerTimer != null) window.clearTimeout(this.explorerTimer);
    this.explorerObserver?.disconnect();
    this.explorerObserver = null;
    this.clearExplorerClasses();
  }

  private activeMarkdownFile(): TFile | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const file = view?.file ?? this.app.workspace.getActiveFile();
    if (file instanceof TFile && isMarkdownPath(file.path)) return file;
    return null;
  }

  private async persist(): Promise<void> {
    await this.saveData(this.data);
  }

  private async toggleActive(): Promise<void> {
    const file = this.activeMarkdownFile();
    if (!file) return;
    await this.togglePath(file.path);
  }

  private async togglePath(path: string): Promise<void> {
    const result = toggleSynthesized(this.data, path);
    this.data = result.data;
    await this.persist();
    this.refreshStatus();
    this.scheduleExplorerRefresh();
  }

  private async markPath(path: string, synthesized: boolean): Promise<void> {
    this.data = synthesized
      ? markSynthesized(this.data, path)
      : unmarkSynthesized(this.data, path);
    await this.persist();
    this.refreshStatus();
    this.scheduleExplorerRefresh();
  }

  private refreshStatus(): void {
    if (!this.statusEl) return;
    const file = this.activeMarkdownFile();
    const path = file?.path ?? null;
    const kind = statusKind(this.data, path);
    const text = statusBarText(this.data, path);

    this.statusEl.setText(text);
    this.statusEl.toggleClass("is-not-synthesized", kind === "not-synthesized");
    this.statusEl.toggleClass("is-synthesized", kind === "synthesized");
    this.statusEl.style.display = kind === "none" ? "none" : "";
  }

  private scheduleExplorerRefresh(): void {
    if (this.explorerTimer != null) window.clearTimeout(this.explorerTimer);
    this.explorerTimer = window.setTimeout(() => {
      this.explorerTimer = null;
      this.refreshExplorer();
    }, 50);
  }

  /**
   * Watch the file tree so expanding folders (new title nodes) re-applies tints.
   * childList only — attribute toggles from our classList must not re-fire this.
   */
  private attachExplorerObserver(): void {
    this.explorerObserver?.disconnect();
    this.explorerObserver = new MutationObserver(() => this.scheduleExplorerRefresh());
    const containers = document.querySelectorAll(
      '.workspace-leaf-content[data-type="file-explorer"] .nav-files-container',
    );
    containers.forEach((el) => {
      this.explorerObserver!.observe(el, { childList: true, subtree: true });
    });
  }

  /**
   * Tint unsynthesized markdown titles.
   * Uses fileItems when present (same internal map as file-color), plus data-path DOM
   * so we still hit rows if the map shape differs.
   */
  private refreshExplorer(): void {
    const leaves = this.app.workspace.getLeavesOfType("file-explorer");
    for (const leaf of leaves) {
      const view = leaf.view as unknown as FileExplorerViewLike;
      const items = view.fileItems;
      if (!items) continue;
      for (const [path, item] of Object.entries(items)) {
        const row = item?.el ?? item?.selfEl;
        if (!row) continue;
        const title =
          row.matches?.(".nav-file-title")
            ? row
            : row.querySelector?.(".nav-file-title");
        applyTintClass(EXPLORER_CLASS, shouldTintPath(this.data, path), row, title ?? undefined);
      }
    }

    // data-path fallback / second pass for any titles fileItems missed
    const titles = document.querySelectorAll(
      '.workspace-leaf-content[data-type="file-explorer"] .nav-file-title[data-path]',
    );
    titles.forEach((title) => {
      const path = title.getAttribute("data-path");
      if (!path) return;
      const row = title.closest(".nav-file");
      applyTintClass(
        EXPLORER_CLASS,
        shouldTintPath(this.data, path),
        row,
        title,
      );
    });
  }

  private clearExplorerClasses(): void {
    document
      .querySelectorAll(`.${EXPLORER_CLASS}`)
      .forEach((el) => el.classList.remove(EXPLORER_CLASS));
  }
}
