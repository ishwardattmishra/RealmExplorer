import type { QueryResult, RealmSchemaInfo } from './types';

/** Messages sent from the extension host to the webview. */
export type ExtensionToWebviewMessage =
  | { command: 'results'; results: QueryResult }
  | { command: 'error'; message: string }
  | { command: 'schema'; schema: RealmSchemaInfo[] }
  | { command: 'selectObjectType'; objectType: string }
  | { command: 'count'; count: number; executionTimeMs: number };

/** Messages sent from the webview to the extension host. */
export type WebviewToExtensionMessage =
  | {
      command: 'executeQuery';
      objectType: string;
      filter: string;
      args: unknown[];
      page: number;
      pageSize: number;
      limit?: number;
    }
  | {
      command: 'countQuery';
      objectType: string;
      filter: string;
      args: unknown[];
    }
  | { command: 'getSchema' };

export type WebviewCommand = WebviewToExtensionMessage['command'];

export function isWebviewToExtensionMessage(data: unknown): data is WebviewToExtensionMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const cmd = (data as { command?: unknown }).command;
  if (cmd !== 'executeQuery' && cmd !== 'countQuery' && cmd !== 'getSchema') {
    return false;
  }
  if (cmd === 'getSchema') {
    return true;
  }
  const o = data as { objectType?: unknown; filter?: unknown; args?: unknown };
  if (typeof o.objectType !== 'string' || typeof o.filter !== 'string') {
    return false;
  }
  if (o.args !== undefined && !Array.isArray(o.args)) {
    return false;
  }
  if (cmd === 'executeQuery') {
    const q = data as { page?: unknown; pageSize?: unknown; limit?: unknown };
    if (q.page !== undefined && typeof q.page !== 'number') {
      return false;
    }
    if (q.pageSize !== undefined && typeof q.pageSize !== 'number') {
      return false;
    }
    if (q.limit !== undefined && typeof q.limit !== 'number') {
      return false;
    }
  }
  return true;
}

/** Type guard for messages from the extension host → webview. */
export function isExtensionToWebviewMessage(data: unknown): data is ExtensionToWebviewMessage {
  if (!data || typeof data !== 'object' || !('command' in data)) {
    return false;
  }
  const cmd = (data as { command: unknown }).command;
  if (typeof cmd !== 'string') {
    return false;
  }
  switch (cmd) {
    case 'selectObjectType':
      return typeof (data as { objectType?: unknown }).objectType === 'string';
    case 'results':
      return (
        'results' in data &&
        typeof (data as { results?: unknown }).results === 'object' &&
        (data as { results?: unknown }).results !== null
      );
    case 'error':
      return typeof (data as { message?: unknown }).message === 'string';
    case 'schema':
      return Array.isArray((data as { schema?: unknown }).schema);
    case 'count':
      return (
        typeof (data as { count?: unknown }).count === 'number' &&
        typeof (data as { executionTimeMs?: unknown }).executionTimeMs === 'number'
      );
    default:
      return false;
  }
}
