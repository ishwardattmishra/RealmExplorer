import * as path from 'path';
import * as vscode from 'vscode';

const STORAGE_KEY = 'realm.recentFiles';
const MAX_HISTORY = 10;

export class RecentFilesProvider implements vscode.TreeDataProvider<RecentFileItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RecentFileItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly globalState: vscode.Memento) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /** Call this after a file is successfully opened. */
  push(filePath: string): void {
    const history = this.getHistory();
    const deduped = history.filter((p) => p !== filePath);
    deduped.unshift(filePath);
    const trimmed = deduped.slice(0, MAX_HISTORY);
    this.globalState.update(STORAGE_KEY, trimmed);
    this._onDidChangeTreeData.fire();
  }

  /** Remove a single entry from history. */
  remove(filePath: string): void {
    const history = this.getHistory().filter((p) => p !== filePath);
    this.globalState.update(STORAGE_KEY, history);
    this._onDidChangeTreeData.fire();
  }

  /** Wipe the whole history. */
  clear(): void {
    this.globalState.update(STORAGE_KEY, []);
    this._onDidChangeTreeData.fire();
  }

  getHistory(): string[] {
    return this.globalState.get<string[]>(STORAGE_KEY, []);
  }

  // ── TreeDataProvider ──────────────────────────────────────────────────────

  getTreeItem(element: RecentFileItem): vscode.TreeItem {
    return element;
  }

  getChildren(): RecentFileItem[] {
    return this.getHistory().map((filePath) => new RecentFileItem(filePath));
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
