import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockExecuteCommand, mockShowErrorMessage } = vi.hoisted(() => ({
  mockExecuteCommand: vi.fn().mockResolvedValue(undefined),
  mockShowErrorMessage: vi.fn(),
}));

vi.mock('vscode', () => {
  class Uri {
    constructor(
      public readonly scheme: string,
      public readonly fsPath: string,
      public readonly path: string = fsPath
    ) {}

    static file(fsPath: string): Uri {
      return new Uri('file', fsPath, fsPath);
    }

    static parse(uriStr: string): Uri {
      if (uriStr.startsWith('file://')) {
        const cleanPath = decodeURIComponent(uriStr.replace(/^file:\/\//, ''));
        return new Uri('file', cleanPath, cleanPath);
      }
      return new Uri('file', uriStr, uriStr);
    }
  }

  return {
    Uri,
    commands: {
      executeCommand: mockExecuteCommand,
    },
    window: {
      showErrorMessage: mockShowErrorMessage,
    },
  };
});

import { RealmDragAndDropController } from './RealmDragAndDropController';

class MockDataTransferItem {
  constructor(private readonly val: string) {}
  asString(): Promise<string> {
    return Promise.resolve(this.val);
  }
}

class MockDataTransfer {
  private items = new Map<string, MockDataTransferItem>();

  set(mimeType: string, value: string): void {
    this.items.set(mimeType, new MockDataTransferItem(value));
  }

  get(mimeType: string): MockDataTransferItem | undefined {
    return this.items.get(mimeType);
  }
}

const fakeCancellationToken = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

describe('RealmDragAndDropController', () => {
  let controller: RealmDragAndDropController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new RealmDragAndDropController();
  });

  it('defines text/uri-list in dropMimeTypes and empty dragMimeTypes', () => {
    expect(controller.dropMimeTypes).toContain('text/uri-list');
    expect(controller.dragMimeTypes).toEqual([]);
  });

  it('opens file when dropped via text/uri-list containing file:// URI', async () => {
    const dt = new MockDataTransfer();
    dt.set('text/uri-list', 'file:///path/to/database.realm');

    await controller.handleDrop(undefined, dt as any, fakeCancellationToken as any);

    expect(mockExecuteCommand).toHaveBeenCalledWith(
      'realm.openFile',
      expect.objectContaining({ fsPath: '/path/to/database.realm' })
    );
  });

  it('prioritizes .realm files when multiple URIs are dropped', async () => {
    const dt = new MockDataTransfer();
    dt.set(
      'text/uri-list',
      'file:///path/to/notes.txt\r\nfile:///path/to/target.realm\r\nfile:///path/to/other.db'
    );

    await controller.handleDrop(undefined, dt as any, fakeCancellationToken as any);

    expect(mockExecuteCommand).toHaveBeenCalledWith(
      'realm.openFile',
      expect.objectContaining({ fsPath: '/path/to/target.realm' })
    );
  });

  it('handles raw filesystem paths (non-URI) in text/uri-list', async () => {
    const dt = new MockDataTransfer();
    dt.set('text/uri-list', '/Users/test/sample.realm');

    await controller.handleDrop(undefined, dt as any, fakeCancellationToken as any);

    expect(mockExecuteCommand).toHaveBeenCalledWith(
      'realm.openFile',
      expect.objectContaining({ fsPath: '/Users/test/sample.realm' })
    );
  });

  it('does nothing if text/uri-list is not present in dataTransfer', async () => {
    const dt = new MockDataTransfer();
    // No items added

    await controller.handleDrop(undefined, dt as any, fakeCancellationToken as any);

    expect(mockExecuteCommand).not.toHaveBeenCalled();
  });

  it('does nothing if text/uri-list is empty', async () => {
    const dt = new MockDataTransfer();
    dt.set('text/uri-list', '');

    await controller.handleDrop(undefined, dt as any, fakeCancellationToken as any);

    expect(mockExecuteCommand).not.toHaveBeenCalled();
  });

  it('shows error message if command execution throws', async () => {
    mockExecuteCommand.mockRejectedValueOnce(new Error('Open error'));

    const dt = new MockDataTransfer();
    dt.set('text/uri-list', 'file:///path/to/failed.realm');

    await controller.handleDrop(undefined, dt as any, fakeCancellationToken as any);

    expect(mockShowErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Failed to open dropped file: Open error')
    );
  });
});
