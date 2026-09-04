import * as path from 'path';
import * as vscode from 'vscode';

const STORAGE_KEY = 'realm.recentFiles';
const MAX_HISTORY = 10;

export class RecentFilesProvider implements vscode.TreeDataProvider<RecentFileItem | DropHintItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RecentFileItem | DropHintItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly globalState: vscode.Memento) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /** Call this after a file is successfully opened. */
  async push(filePath: string): Promise<void> {
    const history = this.getHistory();
    const deduped = history.filter((p) => p !== filePath);
    deduped.unshift(filePath);
    const trimmed = deduped.slice(0, MAX_HISTORY);
    await this.globalState.update(STORAGE_KEY, trimmed);
    this._onDidChangeTreeData.fire();
  }

  /** Remove a single entry from history. */
  async remove(filePath: string): Promise<void> {
    const history = this.getHistory().filter((p) => p !== filePath);
    await this.globalState.update(STORAGE_KEY, history);
    this._onDidChangeTreeData.fire();
  }

  /** Wipe the whole history. */
  async clear(): Promise<void> {
    await this.globalState.update(STORAGE_KEY, []);
    this._onDidChangeTreeData.fire();
  }

  getHistory(): string[] {
    return this.globalState.get<string[]>(STORAGE_KEY, []);
  }

  // ── TreeDataProvider ──────────────────────────────────────────────────────

  getTreeItem(element: RecentFileItem | DropHintItem): vscode.TreeItem {
    return element;
  }

  getChildren(): (RecentFileItem | DropHintItem)[] {
    const history = this.getHistory();
    if (history.length === 0) {
      // Return a placeholder so the tree is never empty — required for drag-and-drop
      return [new DropHintItem()];
    }
    return history.map((filePath) => new RecentFileItem(filePath));
  }
}

export class RecentFileItem extends vscode.TreeItem {
  constructor(public readonly filePath: string) {
    super(path.basename(filePath), vscode.TreeItemCollapsibleState.None);

    this.description = path.dirname(filePath);
    this.tooltip = filePath;
    this.iconPath = new vscode.ThemeIcon('database');
    this.contextValue = 'recentFile';

    this.command = {
      command: 'realm.openRecentFile',
      title: 'Open Recent Realm File',
      arguments: [filePath],
    };
  }
}

/**
 * Placeholder that keeps the tree non-empty so drag-and-drop has a
 * valid drop target even before any files have been opened.
 */
export class DropHintItem extends vscode.TreeItem {
  constructor() {
    super('Drop a .realm file here to open', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('inbox');
    this.contextValue = 'dropHint';
    this.command = {
      command: 'realm.openFile',
      title: 'Open Realm File',
    };
  }
}

