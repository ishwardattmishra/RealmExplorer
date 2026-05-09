import { describe, expect, it } from 'vitest';

import { isWebviewToExtensionMessage, isExtensionToWebviewMessage } from './webview-protocol';

describe('isWebviewToExtensionMessage', () => {
  it('accepts executeQuery', () => {
    expect(
      isWebviewToExtensionMessage({
        command: 'executeQuery',
        objectType: 'User',
        filter: '',
        args: [],
        page: 1,
        pageSize: 20,
      })
    ).toBe(true);
  });

  it('accepts countQuery', () => {
    expect(
      isWebviewToExtensionMessage({
        command: 'countQuery',
        objectType: 'User',
        filter: '',
        args: [],
      })
    ).toBe(true);
  });

  it('accepts getSchema', () => {
    expect(isWebviewToExtensionMessage({ command: 'getSchema' })).toBe(true);
  });

  it('rejects invalid payloads', () => {
    expect(isWebviewToExtensionMessage(null)).toBe(false);
    expect(isWebviewToExtensionMessage({ command: 'executeQuery' })).toBe(false);
  });
});

describe('isExtensionToWebviewMessage', () => {
  it('accepts results', () => {
    expect(
      isExtensionToWebviewMessage({
        command: 'results',
        results: { data: [], totalCount: 0, page: 1, pageSize: 20, executionTimeMs: 0 },
      })
    ).toBe(true);
  });

  it('accepts schema', () => {
    expect(isExtensionToWebviewMessage({ command: 'schema', schema: [] })).toBe(true);
  });
});
