import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── vscode mock ───────────────────────────────────────────────────────────────

vi.mock('vscode', () => {
  class EventEmitter<T> {
    private listeners: Array<(e: T | undefined | void) => void> = [];
    readonly event = (listener: (e: T | undefined | void) => void) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
    };
    fire(data?: T | void): void {
      this.listeners.forEach((l) => l(data));
    }
  }

  class TreeItem {
    label: string;
    collapsibleState: number;
    description?: string;
    tooltip?: string;
    iconPath?: unknown;
    contextValue?: string;
    command?: unknown;
    constructor(label: string, collapsibleState: number) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }

  class ThemeIcon {
    constructor(public readonly id: string) {}
  }

  return {
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    EventEmitter,
    TreeItem,
    ThemeIcon,
  };
});

import { RecentFileItem, RecentFilesProvider } from './RecentFilesProvider';

// ── fake Memento ──────────────────────────────────────────────────────────────

function makeMementoStore(initial: Record<string, unknown> = {}): import('vscode').Memento {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get<T>(key: string, defaultValue?: T): T {
      return (store.has(key) ? store.get(key) : defaultValue) as T;
    },
    update(key: string, value: unknown): Thenable<void> {
      store.set(key, value);
      return Promise.resolve();
    },
    keys(): readonly string[] {
      return [...store.keys()];
    },
  };
}

// ── RecentFilesProvider ───────────────────────────────────────────────────────

describe('RecentFilesProvider', () => {
  let memento: import('vscode').Memento;
  let provider: RecentFilesProvider;

  beforeEach(() => {
    memento = makeMementoStore();
    provider = new RecentFilesProvider(memento);
  });

  it('starts with an empty history', () => {
    expect(provider.getHistory()).toEqual([]);
    expect(provider.getChildren()).toEqual([]);
  });

  it('push() adds a file to the front', async () => {
    await provider.push('/path/to/a.realm');
    expect(provider.getHistory()).toEqual(['/path/to/a.realm']);
  });

  it('push() prepends, so latest file appears first', async () => {
    await provider.push('/a.realm');
    await provider.push('/b.realm');
    expect(provider.getHistory()[0]).toBe('/b.realm');
    expect(provider.getHistory()[1]).toBe('/a.realm');
  });

  it('push() deduplicates: re-opening moves entry to top', async () => {
    await provider.push('/a.realm');
    await provider.push('/b.realm');
    await provider.push('/a.realm');
    expect(provider.getHistory()).toEqual(['/a.realm', '/b.realm']);
  });

  it('push() trims history to 10 entries', async () => {
    for (let i = 0; i < 12; i++) {
      await provider.push(`/file${i}.realm`);
    }
    expect(provider.getHistory()).toHaveLength(10);
    // Most recent should be first
    expect(provider.getHistory()[0]).toBe('/file11.realm');
  });

  it('remove() deletes a specific entry', async () => {
    await provider.push('/a.realm');
    await provider.push('/b.realm');
    await provider.remove('/a.realm');
    expect(provider.getHistory()).toEqual(['/b.realm']);
  });

  it('remove() is a no-op for unknown paths', async () => {
    await provider.push('/a.realm');
    await provider.remove('/nonexistent.realm');
    expect(provider.getHistory()).toEqual(['/a.realm']);
  });

  it('clear() empties the full history', async () => {
    await provider.push('/a.realm');
    await provider.push('/b.realm');
    await provider.clear();
    expect(provider.getHistory()).toEqual([]);
  });

  it('fires onDidChangeTreeData on push()', async () => {
    const listener = vi.fn();
    provider.onDidChangeTreeData(listener);
    await provider.push('/a.realm');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('fires onDidChangeTreeData on remove()', async () => {
    const listener = vi.fn();
    provider.onDidChangeTreeData(listener);
    await provider.remove('/a.realm');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('fires onDidChangeTreeData on clear()', async () => {
    const listener = vi.fn();
    provider.onDidChangeTreeData(listener);
    await provider.clear();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('getChildren() returns one RecentFileItem per history entry', async () => {
    await provider.push('/data/mydb.realm');
    const children = provider.getChildren();
    expect(children).toHaveLength(1);
    expect(children[0]).toBeInstanceOf(RecentFileItem);
  });

  it('persists history across provider instances (same memento)', async () => {
    await provider.push('/a.realm');
    const provider2 = new RecentFilesProvider(memento);
    expect(provider2.getHistory()).toEqual(['/a.realm']);
  });
});

// ── RecentFileItem ────────────────────────────────────────────────────────────

describe('RecentFileItem', () => {
  it('uses the file basename as the label', () => {
    const item = new RecentFileItem('/some/dir/mydb.realm');
    expect(item.label).toBe('mydb.realm');
  });

  it('uses the directory as the description', () => {
    const item = new RecentFileItem('/some/dir/mydb.realm');
    expect(item.description).toBe('/some/dir');
  });

  it('sets tooltip to the full path', () => {
    const item = new RecentFileItem('/some/dir/mydb.realm');
    expect(item.tooltip).toBe('/some/dir/mydb.realm');
  });

  it('contextValue is "recentFile"', () => {
    const item = new RecentFileItem('/a.realm');
    expect(item.contextValue).toBe('recentFile');
  });

  it('command opens the file via realm.openRecentFile', () => {
    const item = new RecentFileItem('/a.realm');
    expect(item.command?.command).toBe('realm.openRecentFile');
    expect(item.command?.arguments?.[0]).toBe('/a.realm');
  });

  it('exposes filePath as a public property', () => {
    const item = new RecentFileItem('/a.realm');
    expect(item.filePath).toBe('/a.realm');
  });
});
