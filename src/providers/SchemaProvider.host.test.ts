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

describe('RealmSchemaProvider', () => {
  it('returns no children when realm is not open', async () => {
    const backend = {
      isOpen: () => false,
      getSchema: () => [],
    };
    const provider = new RealmSchemaProvider(backend as never);
    await expect(provider.getChildren()).resolves.toEqual([]);
  });

  it('lists object types at root when realm is open', async () => {
    const backend = {
      isOpen: () => true,
      getSchema: () => [
        {
          name: 'User',
          properties: { name: { name: 'name', type: 'string' } },
        },
      ],
    };
    const provider = new RealmSchemaProvider(backend as never);
    const children = await provider.getChildren();
    expect(children).toHaveLength(1);
    expect(children[0].label).toBe('User');
    expect(children[0].contextValue).toBe('objectType');
  });

  it('lists properties under an object type node', async () => {
    const backend = {
      isOpen: () => true,
      getSchema: () => [
        {
          name: 'User',
          properties: {
            name: { name: 'name', type: 'string', optional: true },
          },
        },
      ],
    };
    const provider = new RealmSchemaProvider(backend as never);
    const root = await provider.getChildren();
    const props = await provider.getChildren(root[0]);
    expect(props).toHaveLength(1);
    expect(props[0].label).toBe('name');
    expect(props[0].contextValue).toBe('property');
  });
});
