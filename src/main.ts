import { MarkdownView, Plugin, TAbstractFile, TFile } from "obsidian";
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

export default class SynthesizeEverythingPlugin extends Plugin {
  data: SynthesisData = emptyData();
  private statusEl: HTMLElement | null = null;
  private explorerTimer: number | null = null;

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
    this.registerEvent(this.app.workspace.on("layout-change", () => this.scheduleExplorerRefresh()));

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (!(file instanceof TFile) && !isMarkdownPath(oldPath)) return;
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
    });
  }

  onunload(): void {
    if (this.explorerTimer != null) window.clearTimeout(this.explorerTimer);
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

  /** Tint unsynthesized markdown titles in every open file explorer. */
  private refreshExplorer(): void {
    const leaves = this.app.workspace.getLeavesOfType("file-explorer");
    for (const leaf of leaves) {
      const view = leaf.view as unknown as {
        fileItems?: Record<string, { el?: HTMLElement; selfEl?: HTMLElement }>;
      };
      const items = view.fileItems;
      if (!items) continue;
      for (const [path, item] of Object.entries(items)) {
        const el = item?.el ?? item?.selfEl;
        if (!el) continue;
        const shouldTint = isMarkdownPath(path) && !this.data.entries[path]?.synthesizedAt;
        el.classList.toggle(EXPLORER_CLASS, shouldTint);
      }
    }
  }

  private clearExplorerClasses(): void {
    const leaves = this.app.workspace.getLeavesOfType("file-explorer");
    for (const leaf of leaves) {
      const view = leaf.view as unknown as {
        fileItems?: Record<string, { el?: HTMLElement; selfEl?: HTMLElement }>;
      };
      const items = view.fileItems;
      if (!items) continue;
      for (const item of Object.values(items)) {
        const el = item?.el ?? item?.selfEl;
        el?.classList.remove(EXPLORER_CLASS);
      }
    }
  }
}
