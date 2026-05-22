import { describe, expect, it, vi } from 'vitest';

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
    tooltip = '';
    description = '';
    command?: { command: string; title: string; arguments?: unknown[] };
    contextValue = '';
    constructor(label: string, collapsibleState: number) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }

  return {
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    EventEmitter,
    TreeItem,
  };
});

import { RealmSchemaProvider } from './SchemaProvider';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeBackend(overrides: Partial<{
  isOpen: () => boolean;
  getSchema: () => object[];
  countQuery: (name: string, filter: string) => Promise<{ count: number; executionTimeMs: number }>;
}> = {}) {
  return {
    isOpen: () => true,
    getSchema: () => [],
    countQuery: async () => ({ count: 0, executionTimeMs: 0 }),
    ...overrides,
  };
}

// ── RealmSchemaProvider ───────────────────────────────────────────────────────

describe('RealmSchemaProvider', () => {
  it('returns no children when realm is not open', async () => {
    const provider = new RealmSchemaProvider(makeBackend({ isOpen: () => false }) as never);
    await expect(provider.getChildren()).resolves.toEqual([]);
  });

  it('lists object types at root when realm is open', async () => {
    const backend = makeBackend({
      getSchema: () => [{ name: 'User', properties: { name: { name: 'name', type: 'string' } } }],
      countQuery: async () => ({ count: 3, executionTimeMs: 1 }),
    });
    const provider = new RealmSchemaProvider(backend as never);
    const children = await provider.getChildren();
    expect(children).toHaveLength(1);
    expect(children[0].label).toBe('User');
    expect(children[0].contextValue).toBe('objectType');
  });

  it('shows object count in description (plural)', async () => {
    const backend = makeBackend({
      getSchema: () => [{ name: 'User', properties: {} }],
      countQuery: async () => ({ count: 5, executionTimeMs: 1 }),
    });
    const provider = new RealmSchemaProvider(backend as never);
    const [item] = await provider.getChildren();
    expect(item.description).toBe('5 objects');
  });

  it('shows singular "object" when count is 1', async () => {
    const backend = makeBackend({
      getSchema: () => [{ name: 'User', properties: {} }],
      countQuery: async () => ({ count: 1, executionTimeMs: 1 }),
    });
    const provider = new RealmSchemaProvider(backend as never);
    const [item] = await provider.getChildren();
    expect(item.description).toBe('1 object');
  });

  it('shows "embedded" for embedded classes and no runQuery command', async () => {
    const backend = makeBackend({
      getSchema: () => [{ name: 'Address', embedded: true, properties: {} }],
    });
    const provider = new RealmSchemaProvider(backend as never);
    const [item] = await provider.getChildren();
    expect(item.description).toBe('embedded');
    expect(item.command).toBeUndefined();
  });

  it('does not call countQuery for embedded classes', async () => {
    const countQuery = vi.fn().mockResolvedValue({ count: 0, executionTimeMs: 0 });
    const backend = makeBackend({
      getSchema: () => [{ name: 'Address', embedded: true, properties: {} }],
      countQuery,
    });
    const provider = new RealmSchemaProvider(backend as never);
    await provider.getChildren();
    expect(countQuery).not.toHaveBeenCalled();
  });

  it('attaches runQuery command only to non-embedded types', async () => {
    const backend = makeBackend({
      getSchema: () => [
        { name: 'User', embedded: false, properties: {} },
        { name: 'Address', embedded: true, properties: {} },
      ],
      countQuery: async () => ({ count: 2, executionTimeMs: 1 }),
    });
    const provider = new RealmSchemaProvider(backend as never);
    const children = await provider.getChildren();
    expect(children[0].command?.command).toBe('realm.runQuery');
    expect(children[1].command).toBeUndefined();
  });

  it('lists properties under an object type node', async () => {
    const backend = makeBackend({
      getSchema: () => [
        {
          name: 'User',
          properties: {
            name: { name: 'name', type: 'string', optional: true },
          },
        },
      ],
      countQuery: async () => ({ count: 0, executionTimeMs: 0 }),
    });
    const provider = new RealmSchemaProvider(backend as never);
    const root = await provider.getChildren();
    const props = await provider.getChildren(root[0]);
    expect(props).toHaveLength(1);
    expect(props[0].label).toBe('name');
    expect(props[0].description).toBe('string?');
    expect(props[0].contextValue).toBe('property');
  });
});
